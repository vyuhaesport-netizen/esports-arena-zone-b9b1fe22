// OneSignal Web Push Notifications Configuration

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalType) => void>;
    OneSignal?: OneSignalType;
  }
}

interface OneSignalType {
  init: (config: OneSignalConfig) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  User: {
    PushSubscription: {
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
      id: string | null;
    };
    addTag: (key: string, value: string) => Promise<void>;
    addTags: (tags: Record<string, string>) => Promise<void>;
  };
  Notifications: {
    permission: boolean;
    permissionNative: 'default' | 'granted' | 'denied';
    requestPermission: () => Promise<void>;
    addEventListener: (event: string, callback: (data: NotificationEventData) => void) => void;
    removeEventListener: (event: string, callback: (data: NotificationEventData) => void) => void;
  };
}

interface OneSignalConfig {
  appId: string;
  allowLocalhostAsSecureOrigin?: boolean;
  serviceWorkerPath?: string;
  notifyButton?: {
    enable: boolean;
  };
  welcomeNotification?: {
    disable: boolean;
  };
  promptOptions?: {
    slidedown?: {
      prompts?: Array<{
        type: string;
        autoPrompt: boolean;
        text?: {
          actionMessage?: string;
          acceptButton?: string;
          cancelButton?: string;
        };
        delay?: {
          pageViews?: number;
          timeDelay?: number;
        };
      }>;
    };
  };
}

interface NotificationEventData {
  notification?: {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
  };
}

// OneSignal App ID - This is a PUBLIC/PUBLISHABLE key, safe to include in frontend
const ONESIGNAL_APP_ID = '05070060-1672-4460-b1a2-51610beda417';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export const initOneSignal = async (): Promise<void> => {
  if (isInitialized) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  if (typeof window === 'undefined') {
    return;
  }

  initPromise = new Promise<void>((resolve) => {
    try {
      // Initialize deferred array
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      
      // Add script if not already present
      if (!document.querySelector('script[src*="onesignal"]')) {
        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true;
        document.head.appendChild(script);
      }

      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            notifyButton: {
              enable: false,
            },
            welcomeNotification: {
              disable: false,
            },
            promptOptions: {
              slidedown: {
                prompts: [
                  {
                    type: "push",
                    autoPrompt: false,
                    text: {
                      actionMessage: "Get instant tournament alerts, match updates & prize notifications!",
                      acceptButton: "Allow",
                      cancelButton: "Later"
                    },
                    delay: {
                      pageViews: 1,
                      timeDelay: 3
                    }
                  }
                ]
              }
            }
          });

          isInitialized = true;
          console.log('OneSignal initialized successfully');
          resolve();
        } catch (error) {
          console.error('OneSignal init error:', error);
          resolve();
        }
      });
    } catch (error) {
      console.error('Failed to initialize OneSignal:', error);
      resolve();
    }
  });

  return initPromise;
};

export const loginOneSignal = async (userId: string, email?: string): Promise<void> => {
  if (!isInitialized) {
    await initOneSignal();
  }

  // Wait for OneSignal to be available
  await new Promise<void>((resolve) => {
    const check = () => {
      if (window.OneSignal) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });

  try {
    if (window.OneSignal) {
      await window.OneSignal.login(userId);
      
      if (email) {
        await window.OneSignal.User.addTag('email', email);
      }
      
      console.log('OneSignal user logged in:', userId);
    }
  } catch (error) {
    console.error('Failed to login to OneSignal:', error);
  }
};

export const logoutOneSignal = async (): Promise<void> => {
  try {
    if (window.OneSignal) {
      await window.OneSignal.logout();
      console.log('OneSignal user logged out');
    }
  } catch (error) {
    console.error('Failed to logout from OneSignal:', error);
  }
};

export const requestPushPermission = async (): Promise<boolean> => {
  if (!isInitialized) {
    await initOneSignal();
  }

  // Wait for OneSignal
  await new Promise<void>((resolve) => {
    const check = () => {
      if (window.OneSignal) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });

  if (!window.OneSignal) {
    console.warn('OneSignal not available');
    return false;
  }

  try {
    await window.OneSignal.Notifications.requestPermission();
    const granted = window.OneSignal.Notifications.permission;
    
    if (granted) {
      await window.OneSignal.User.PushSubscription.optIn();
      console.log('Push notifications enabled');
    }
    
    return granted;
  } catch (error) {
    console.error('Failed to request push permission:', error);
    return false;
  }
};

export const isPushEnabled = (): boolean => {
  if (typeof window !== 'undefined' && window.OneSignal) {
    return window.OneSignal.Notifications.permission;
  }
  return false;
};

export const getPushPermissionStatus = (): 'default' | 'granted' | 'denied' => {
  if (typeof window === 'undefined') return 'default';
  
  // First check native browser API
  if ('Notification' in window) {
    return Notification.permission as 'default' | 'granted' | 'denied';
  }
  
  // Fallback to OneSignal
  const win = window as Window & { OneSignal?: OneSignalType };
  if (win.OneSignal) {
    return win.OneSignal.Notifications.permissionNative;
  }
  return 'default';
};

export const addPushNotificationListener = (
  event: 'click' | 'foregroundWillDisplay',
  callback: (data: NotificationEventData) => void
): void => {
  if (typeof window !== 'undefined' && window.OneSignal) {
    window.OneSignal.Notifications.addEventListener(event, callback);
  }
};

export const removePushNotificationListener = (
  event: 'click' | 'foregroundWillDisplay',
  callback: (data: NotificationEventData) => void
): void => {
  if (typeof window !== 'undefined' && window.OneSignal) {
    window.OneSignal.Notifications.removeEventListener(event, callback);
  }
};
