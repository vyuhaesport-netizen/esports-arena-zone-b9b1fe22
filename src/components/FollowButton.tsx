import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Check, Loader2 } from 'lucide-react';

interface FollowButtonProps {
  organizerId: string;
  isFollowing: boolean;
  onFollowChange: (isFollowing: boolean) => void;
  organizerName?: string;
}

const FollowButton = ({ organizerId, isFollowing, onFollowChange, organizerName }: FollowButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Don't show follow button for the organizer themselves
  if (user?.id === organizerId) {
    return null;
  }

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({ title: 'Login Required', description: 'Please login to follow organizers.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_user_id', user.id)
          .eq('following_user_id', organizerId);
        
        onFollowChange(false);
        toast({ title: 'Unfollowed', description: 'You will no longer receive updates.' });
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_user_id: user.id,
            following_user_id: organizerId,
          });
        
        onFollowChange(true);
        toast({ 
          title: 'Following!', 
          description: `You'll be notified when ${organizerName || 'this organizer'} creates new tournaments.` 
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
        isFollowing
          ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
          : 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20'
      }`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isFollowing ? (
        <>
          <Check className="h-3 w-3" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="h-3 w-3" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
};

export default FollowButton;
