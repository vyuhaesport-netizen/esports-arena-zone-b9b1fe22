import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOrganizer: boolean;
  isCreator: boolean;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ data: { user: User | null } | null; error: Error | null }>;
  signOut: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);

  const checkRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (!error && data) {
        setIsAdmin(data.some(r => r.role === 'admin'));
        setIsOrganizer(data.some(r => r.role === 'organizer'));
        setIsCreator(data.some(r => r.role === 'creator'));
      } else {
        setIsAdmin(false);
        setIsOrganizer(false);
        setIsCreator(false);
      }
    } catch {
      setIsAdmin(false);
      setIsOrganizer(false);
      setIsCreator(false);
    }
  };

  const checkSuperAdmin = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', userId)
        .maybeSingle();
      
      const adminEmails = ['vyuhaesport@gmail.com', 'vyuhaesporthelp@gmail.com'];
      
      if (!error && data?.email && adminEmails.includes(data.email)) {
        setIsSuperAdmin(true);
        setIsAdmin(true);
        // Super admin has all permissions
        setPermissions([
          'dashboard:view',
          'users:view', 'users:manage',
          'tournaments:view', 'tournaments:create', 'tournaments:edit', 'tournaments:delete',
          'deposits:view', 'deposits:manage',
          'withdrawals:view', 'withdrawals:manage',
          'transactions:view',
          'team:view', 'team:manage',
          'settings:view', 'settings:manage',
          'support:view', 'support:manage',
          'notifications:view', 'notifications:manage',
          'organizers:view', 'organizers:manage',
          'creators:view', 'creators:manage'
        ]);
      } else {
        setIsSuperAdmin(false);
        // Fetch team member permissions
        await fetchPermissions(userId);
      }
    } catch {
      setIsSuperAdmin(false);
    }
  };

  const fetchPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('permission')
        .eq('user_id', userId);
      
      if (!error && data) {
        setPermissions(data.map(p => p.permission));
      } else {
        setPermissions([]);
      }
    } catch {
      setPermissions([]);
    }
  };

  const refreshPermissions = async () => {
    if (user) {
      await checkRoles(user.id);
      await checkSuperAdmin(user.id);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkRoles(session.user.id);
            checkSuperAdmin(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsOrganizer(false);
          setIsCreator(false);
          setPermissions([]);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkRoles(session.user.id);
        checkSuperAdmin(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    // Clear local state first regardless of server response
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsOrganizer(false);
    setIsCreator(false);
    setPermissions([]);
    
    // Then attempt server signout (ignore errors if session already invalidated)
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.log('Signout completed (session may have been already invalidated)');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, loading, isAdmin, isSuperAdmin, isOrganizer, isCreator, permissions, 
      hasPermission, signIn, signUp, signOut, refreshPermissions 
    }}>
      {children}
    </AuthContext.Provider>
  );
};