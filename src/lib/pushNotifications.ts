import { supabase } from '@/integrations/supabase/client';

interface SendPushNotificationParams {
  userIds?: string[];
  segment?: string;
  title: string;
  message: string;
  url?: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to users via OneSignal
 * 
 * @param params - Notification parameters
 * @param params.userIds - Array of user IDs to send notification to (Supabase user IDs)
 * @param params.segment - OneSignal segment to target (e.g., 'Subscribed Users')
 * @param params.title - Notification title
 * @param params.message - Notification body message
 * @param params.url - Optional URL to open when notification is clicked
 * @param params.data - Optional custom data to include with notification
 * 
 * @example
 * // Send to specific users
 * await sendPushNotification({
 *   userIds: ['user-id-1', 'user-id-2'],
 *   title: 'Tournament Starting!',
 *   message: 'Your tournament is about to begin.',
 *   url: '/home'
 * });
 * 
 * @example
 * // Send to all subscribed users
 * await sendPushNotification({
 *   segment: 'Subscribed Users',
 *   title: 'New Tournament Available!',
 *   message: 'Check out the latest tournaments.',
 * });
 */
export async function sendPushNotification(params: SendPushNotificationParams): Promise<{ success: boolean; error?: string }> {
  const { userIds, segment, title, message, url, data } = params;

  if (!title || !message) {
    return { success: false, error: 'Title and message are required' };
  }

  try {
    const { data: response, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: userIds,
        segment,
        title,
        message,
        url,
        data,
      },
    });

    if (error) {
      console.error('Push notification error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send push notification:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
