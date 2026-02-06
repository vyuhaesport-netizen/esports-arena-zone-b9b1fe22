 import React, { useEffect, useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import AdminLayout from '@/components/admin/AdminLayout';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Loader2, Database, Zap, Bot, Bell, Server } from 'lucide-react';
 import { toast } from 'sonner';
 
 interface IntegrationStatus {
   name: string;
   status: 'checking' | 'success' | 'error' | 'warning';
   message: string;
   details?: string;
 }

let lastAutoCheckAt = 0;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const wrapped = Promise.resolve(promise);

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([wrapped, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const isTransientError = (err: any) => {
  const msg = String(err?.message ?? '').toLowerCase();
  const status = err?.context?.status ?? err?.status ?? err?.statusCode;

  if (typeof status === 'number' && [408, 425, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  if (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('fetch')
  ) {
    return true;
  }

  return false;
};

const withRetry = async <T,>(
  fn: () => Promise<T>,
  opts?: { retries?: number; baseDelayMs?: number; label?: string }
): Promise<T> => {
  const retries = opts?.retries ?? 1;
  const baseDelayMs = opts?.baseDelayMs ?? 600;

  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      const transient = isTransientError(err);
      if (!transient || attempt >= retries) break;

      await sleep(baseDelayMs * Math.pow(2, attempt));
    }
  }

  throw lastErr;
};

const AdminBackendStatus = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const [isAdmin, setIsAdmin] = useState(false);
   const [loading, setLoading] = useState(true);
   const [checking, setChecking] = useState(false);
   const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
     { name: 'Database Connection', status: 'checking', message: 'Checking...' },
     { name: 'ZapUPI Payment Gateway', status: 'checking', message: 'Checking...' },
     { name: 'DeepSeek AI', status: 'checking', message: 'Checking...' },
     { name: 'Push Notifications (OneSignal)', status: 'checking', message: 'Checking...' },
     { name: 'Edge Functions', status: 'checking', message: 'Checking...' },
   ]);
 
   useEffect(() => {
     checkAdmin();
   }, [user]);
 
    useEffect(() => {
      if (!isAdmin) return;

      // Avoid duplicate auto-runs (e.g. dev strict-mode remounts / fast re-navigations)
      const now = Date.now();
      if (now - lastAutoCheckAt < 2000) return;
      lastAutoCheckAt = now;

      runAllChecks();
    }, [isAdmin]);
 
   const checkAdmin = async () => {
     if (!user) {
       navigate('/');
       return;
     }
 
     const { data } = await supabase
       .from('user_roles')
       .select('role')
       .eq('user_id', user.id)
       .eq('role', 'admin')
       .maybeSingle();
 
     if (!data) {
       navigate('/home');
       return;
     }
 
     setIsAdmin(true);
     setLoading(false);
   };
 
   const updateIntegration = (name: string, update: Partial<IntegrationStatus>) => {
     setIntegrations(prev => prev.map(i => i.name === name ? { ...i, ...update } : i));
   };
 
  const checkDatabase = async () => {
    try {
      const { error } = await withRetry(
        () => withTimeout(supabase.from('profiles').select('id').limit(1), 12000),
        { label: 'Database', retries: 2 }
      );

      if (error) throw error;

      updateIntegration('Database Connection', {
        status: 'success',
        message: 'Connected successfully',
        details: 'Database is responding normally'
      });
    } catch (error: any) {
      updateIntegration('Database Connection', {
        status: 'error',
        message: 'Connection failed',
        details: error.message
      });
    }
  };
 
  const checkZapUPI = async () => {
    try {
      const { data: config, error: configError } = await withRetry(
        () =>
          withTimeout(
            supabase
              .from('payment_gateway_config')
              .select('api_key_id, api_key_secret, is_enabled')
              .eq('gateway_name', 'zapupi')
              .maybeSingle(),
            12000
          ),
        { label: 'ZapUPI config', retries: 2 }
      );

      if (configError) throw configError;

      if (!config) {
        updateIntegration('ZapUPI Payment Gateway', {
          status: 'warning',
          message: 'Not configured',
          details: 'ZapUPI not found in payment_gateway_config'
        });
        return;
      }

      if (!config.api_key_id || !config.api_key_secret) {
        updateIntegration('ZapUPI Payment Gateway', {
          status: 'warning',
          message: 'Credentials missing',
          details: 'API Token or Secret Key not set'
        });
        return;
      }

      if (!config.is_enabled) {
        updateIntegration('ZapUPI Payment Gateway', {
          status: 'warning',
          message: 'Disabled',
          details: 'Gateway configured but disabled'
        });
        return;
      }

      const { data, error } = await withRetry(
        () =>
          withTimeout(
            supabase.functions.invoke('zapupi-diagnostics', {
              method: 'POST',
              body: {}
            }),
            15000
          ),
        { label: 'ZapUPI diagnostics', retries: 2 }
      );

      if (error) throw error;

      // ZapUPI API responded - check if it's authentication issue or just test order validation
      if (data?.zapupi_http_ok) {
        // API responded, check the actual error
        const zapupiMsg = data?.zapupi_message || '';
        const isAuthError =
          zapupiMsg.toLowerCase().includes('invalid token') ||
          zapupiMsg.toLowerCase().includes('invalid key') ||
          zapupiMsg.toLowerCase().includes('unauthorized') ||
          zapupiMsg.toLowerCase().includes('authentication');

        if (isAuthError) {
          updateIntegration('ZapUPI Payment Gateway', {
            status: 'error',
            message: 'Authentication Failed',
            details: `Error: ${zapupiMsg}\nOutbound IP: ${data.outbound_ip || 'Unknown'}\n⚠️ Check API Token/Secret or IP Whitelist in ZapUPI Dashboard`
          });
        } else if (data?.zapupi_status === 'success') {
          updateIntegration('ZapUPI Payment Gateway', {
            status: 'success',
            message: 'Working',
            details: `Outbound IP: ${data.outbound_ip || 'Unknown'}`
          });
        } else {
          // Other errors like "Invalid OrderId" are actually OK - means API is responding
          updateIntegration('ZapUPI Payment Gateway', {
            status: 'success',
            message: 'API Connected',
            details: `API responding correctly.\nTest response: "${zapupiMsg}"\nOutbound IP: ${data.outbound_ip || 'Unknown'}\n✅ Credentials verified, API accessible`
          });
        }
      } else {
        updateIntegration('ZapUPI Payment Gateway', {
          status: 'error',
          message: 'API Connection Failed',
          details: `HTTP Error from ZapUPI\nResponse: ${JSON.stringify(data?.zapupi_response || {})}\nOutbound IP: ${data?.outbound_ip || 'Unknown'}\n⚠️ ZapUPI servers may be down or IP not whitelisted`
        });
      }
    } catch (error: any) {
      updateIntegration('ZapUPI Payment Gateway', {
        status: 'error',
        message: 'Check failed',
        details: `Error: ${error.message}\n⚠️ Temporary network/cold-start issue ho sakta hai — thodi der baad Run All Checks try karo.`
      });
    }
  };
 
  const checkDeepSeek = async () => {
    try {
      const { data, error } = await withRetry(
        () =>
          withTimeout(
            supabase.functions.invoke('ai-chat', {
              method: 'POST',
              body: { message: 'ping', userId: user?.id, healthCheck: true }
            }),
            15000
          ),
        { label: 'AI chat', retries: 2 }
      );

      if (error) {
        if (error.message?.includes('API_KEY') || error.message?.includes('not configured')) {
          updateIntegration('DeepSeek AI', {
            status: 'warning',
            message: 'API Key not configured',
            details: 'Set DEEPSEEK_API_KEY in Supabase Secrets'
          });
        } else {
          throw error;
        }
        return;
      }

      updateIntegration('DeepSeek AI', {
        status: 'success',
        message: 'Connected',
        details: 'AI chat is responding'
      });
    } catch (error: any) {
      updateIntegration('DeepSeek AI', {
        status: 'error',
        message: 'Check failed',
        details: error.message
      });
    }
  };
 
  const checkPushNotifications = async () => {
    try {
      const { error: fnError } = await withRetry(
        () =>
          withTimeout(
            supabase.functions.invoke('send-push-notification', {
              method: 'POST',
              body: { healthCheck: true }
            }),
            15000
          ),
        { label: 'Push notifications', retries: 2 }
      );

      if (fnError) {
        if (fnError.message?.includes('not configured') || fnError.message?.includes('ONESIGNAL')) {
          updateIntegration('Push Notifications (OneSignal)', {
            status: 'warning',
            message: 'Not configured',
            details: 'Set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY'
          });
        } else {
          throw fnError;
        }
        return;
      }

      updateIntegration('Push Notifications (OneSignal)', {
        status: 'success',
        message: 'Configured',
        details: 'Push service is ready'
      });
    } catch (error: any) {
      updateIntegration('Push Notifications (OneSignal)', {
        status: 'error',
        message: 'Check failed',
        details: error.message
      });
    }
  };
 
  const checkEdgeFunctions = async () => {
    try {
      const { error } = await withRetry(
        () => withTimeout(supabase.functions.invoke('zapupi-diagnostics', { method: 'GET' }), 15000),
        { label: 'Edge functions', retries: 2 }
      );

      if (error) throw error;

      updateIntegration('Edge Functions', {
        status: 'success',
        message: 'Deployed',
        details: 'Edge functions responding'
      });
    } catch (error: any) {
      if (error.message?.includes('404')) {
        updateIntegration('Edge Functions', {
          status: 'error',
          message: 'Not deployed',
          details: 'Run: npx supabase functions deploy'
        });
      } else {
        updateIntegration('Edge Functions', {
          status: 'error',
          message: 'Error',
          details: error.message
        });
      }
    }
  };
 
  const runAllChecks = async () => {
    setChecking(true);
    setIntegrations(prev =>
      prev.map(i => ({
        ...i,
        status: 'checking' as const,
        message: 'Checking...',
        details: undefined,
      }))
    );

    await Promise.all([
      checkDatabase(),
      checkZapUPI(),
      checkDeepSeek(),
      checkPushNotifications(),
      checkEdgeFunctions()
    ]);

    setChecking(false);
    toast.success('All checks completed');
  };
 
   const getStatusIcon = (status: IntegrationStatus['status']) => {
     switch (status) {
       case 'checking': return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
       case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
       case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
       case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
     }
   };
 
   const getStatusBadge = (status: IntegrationStatus['status']) => {
     const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
       checking: 'secondary', success: 'default', error: 'destructive', warning: 'outline'
     };
     const labels: Record<string, string> = {
       checking: 'Checking', success: 'OK', error: 'Error', warning: 'Warning'
     };
     return <Badge variant={variants[status]}>{labels[status]}</Badge>;
   };
 
   const getIcon = (name: string) => {
     if (name.includes('Database')) return <Database className="h-5 w-5" />;
     if (name.includes('ZapUPI')) return <Zap className="h-5 w-5" />;
     if (name.includes('AI')) return <Bot className="h-5 w-5" />;
     if (name.includes('Push')) return <Bell className="h-5 w-5" />;
     return <Server className="h-5 w-5" />;
   };
 
   if (loading) {
     return (
       <AdminLayout title="Backend Status">
         <div className="flex items-center justify-center min-h-[400px]">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       </AdminLayout>
     );
   }
 
   const successCount = integrations.filter(i => i.status === 'success').length;
   const errorCount = integrations.filter(i => i.status === 'error').length;
   const warningCount = integrations.filter(i => i.status === 'warning').length;
 
   return (
     <AdminLayout title="Backend Status">
       <div className="space-y-6">
         <div className="grid grid-cols-3 gap-4">
           <Card>
             <CardContent className="p-4 flex items-center gap-3">
               <CheckCircle2 className="h-8 w-8 text-green-500" />
               <div>
                 <div className="text-2xl font-bold">{successCount}</div>
                 <div className="text-sm text-muted-foreground">Working</div>
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="p-4 flex items-center gap-3">
               <AlertCircle className="h-8 w-8 text-yellow-500" />
               <div>
                 <div className="text-2xl font-bold">{warningCount}</div>
                 <div className="text-sm text-muted-foreground">Warnings</div>
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="p-4 flex items-center gap-3">
               <XCircle className="h-8 w-8 text-red-500" />
               <div>
                 <div className="text-2xl font-bold">{errorCount}</div>
                 <div className="text-sm text-muted-foreground">Errors</div>
               </div>
             </CardContent>
           </Card>
         </div>
 
         <div className="flex justify-end">
           <Button onClick={runAllChecks} disabled={checking}>
             <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
             {checking ? 'Checking...' : 'Run All Checks'}
           </Button>
         </div>
 
         <div className="space-y-4">
           {integrations.map((integration) => (
             <Card key={integration.name}>
               <CardContent className="p-4">
                 <div className="flex items-start gap-4">
                   <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
                     {getIcon(integration.name)}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1">
                       <h3 className="font-semibold">{integration.name}</h3>
                       {getStatusBadge(integration.status)}
                     </div>
                     <p className="text-sm text-muted-foreground">{integration.message}</p>
                     {integration.details && (
                      <pre className="text-xs text-muted-foreground mt-2 font-mono bg-muted p-2 rounded break-all whitespace-pre-wrap">
                        {integration.details}
                      </pre>
                     )}
                   </div>
                   <div className="flex-shrink-0">{getStatusIcon(integration.status)}</div>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
 
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">Need Help?</CardTitle>
             <CardDescription>Common fixes for integration issues</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4 text-sm">
             <div>
               <h4 className="font-medium">Database Connection Failed</h4>
               <p className="text-muted-foreground">Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel</p>
             </div>
             <div>
               <h4 className="font-medium">ZapUPI Not Working</h4>
               <p className="text-muted-foreground">Verify credentials in Admin → API Payment. Whitelist server IP in ZapUPI.</p>
             </div>
             <div>
               <h4 className="font-medium">DeepSeek AI Not Configured</h4>
               <p className="text-muted-foreground">Set DEEPSEEK_API_KEY in Supabase → Edge Functions → Secrets</p>
             </div>
             <div>
               <h4 className="font-medium">Edge Functions Not Deployed</h4>
               <p className="text-muted-foreground">Run: <code className="bg-muted px-1 rounded">npx supabase functions deploy</code></p>
             </div>
           </CardContent>
         </Card>
       </div>
     </AdminLayout>
   );
 };
 
 export default AdminBackendStatus;