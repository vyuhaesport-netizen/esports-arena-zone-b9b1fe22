import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import {
  ArrowLeft,
  Loader2,
  Video,
  FileText,
  ExternalLink,
  Megaphone
} from 'lucide-react';
import { format } from 'date-fns';
import AppLayout from '@/components/layout/AppLayout';

interface AdminBroadcast {
  id: string;
  title: string;
  message: string;
  created_at: string;
  media_url?: string;
  media_type?: string;
  banner_url?: string;
  video_link?: string;
  attachment_url?: string;
  attachment_name?: string;
  is_published?: boolean;
}

const BroadcastChannel = () => {
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([]);
  const [loading, setLoading] = useState(true);

  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBroadcasts();
    }
  }, [user]);

  // Play notification sound for new broadcasts
  const playBroadcastSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 700;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.log('Could not play broadcast sound:', error);
    }
  };

  // Realtime subscription for new broadcasts
  useEffect(() => {
    const channel = supabase
      .channel('broadcast-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_broadcasts',
        },
        (payload) => {
          const newBroadcast = payload.new as AdminBroadcast;
          if (newBroadcast.is_published !== false) {
            setBroadcasts(prev => [newBroadcast, ...prev]);
            // Show toast and play sound for new broadcast
            playBroadcastSound();
            toast({
              title: `📢 ${newBroadcast.title}`,
              description: newBroadcast.message.length > 60 ? newBroadcast.message.slice(0, 60) + '...' : newBroadcast.message,
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const fetchBroadcasts = async () => {
    try {
      const { data } = await supabase
        .from('admin_broadcasts')
        .select('id, title, message, created_at, media_url, media_type, banner_url, video_link, attachment_url, attachment_name')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(100);

      setBroadcasts(data || []);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-gradient-to-r from-primary/20 to-primary/5 border-b border-primary/20">
          <div className="flex items-center gap-3 px-4 h-16">
            <Avatar className="h-12 w-12 ring-2 ring-primary/50">
              <AvatarImage src={vyuhaLogo} />
              <AvatarFallback className="bg-primary text-primary-foreground">V</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-lg">Broadcast Channel</p>
                <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary">Official</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Vyuha Esport • Official Announcements</p>
            </div>
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
        </header>

        {/* Broadcasts List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4 pb-24">
            {broadcasts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <img src={vyuhaLogo} alt="" className="h-16 w-16 rounded-full opacity-70" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No Broadcasts Yet</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Official announcements, updates, and important messages from Vyuha Esport will appear here.
                </p>
              </div>
            ) : (
              broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0 mt-1">
                    <AvatarImage src={vyuhaLogo} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">V</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    {/* Banner Image */}
                    {broadcast.banner_url && (
                      <img 
                        src={broadcast.banner_url} 
                        alt="" 
                        className="w-full h-44 object-cover rounded-xl mb-2" 
                      />
                    )}
                    
                    <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl rounded-tl-md p-4 border border-primary/20">
                      <p className="font-bold text-primary">{broadcast.title}</p>
                      <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed">{broadcast.message}</p>
                      
                      {/* Video Link */}
                      {broadcast.video_link && (
                        <a 
                          href={broadcast.video_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 mt-3 p-3 bg-red-500/20 rounded-xl text-sm text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          <Video className="h-5 w-5" />
                          <span className="flex-1 font-medium">Watch Video</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      
                      {/* Audio Message */}
                      {broadcast.media_url && broadcast.media_type === 'audio' && (
                        <div className="mt-3 bg-background/50 rounded-xl p-2">
                          <audio controls className="w-full h-10">
                            <source src={broadcast.media_url} type="audio/webm" />
                          </audio>
                        </div>
                      )}
                      
                      {/* Image */}
                      {broadcast.media_url && broadcast.media_type === 'image' && (
                        <img 
                          src={broadcast.media_url} 
                          alt="" 
                          className="mt-3 rounded-xl max-h-60 object-contain" 
                        />
                      )}
                      
                      {/* PDF Attachment */}
                      {broadcast.attachment_url && (
                        <a 
                          href={broadcast.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 mt-3 p-3 bg-orange-500/20 rounded-xl text-sm text-orange-400 hover:bg-orange-500/30 transition-colors"
                        >
                          <FileText className="h-5 w-5" />
                          <span className="flex-1 font-medium truncate">{broadcast.attachment_name || 'Download PDF'}</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground ml-2 mt-1.5">
                      {format(new Date(broadcast.created_at), 'MMM dd, yyyy • hh:mm a')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer Info */}
        <div className="fixed bottom-16 left-0 right-0 p-3 bg-gradient-to-t from-background via-background to-transparent">
          <div className="text-center text-xs text-muted-foreground py-2 px-4 bg-card/80 backdrop-blur-sm rounded-full mx-auto w-fit border border-border">
            📢 This is an official broadcast channel
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default BroadcastChannel;