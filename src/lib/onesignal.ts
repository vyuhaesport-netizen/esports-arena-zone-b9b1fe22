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

// Allowed domains for OneSignal
const ALLOWED_DOMAINS = ['vyuhaesport.in', 'esports-arena-zone.lovable.app'];

let isInitialized = false;
let initFailed = false;
let initPromise: Promise<boolean> | null = null;

// Check if current domain is allowed
const isAllowedDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return ALLOWED_DOMAINS.some(domain => hostname.includes(domain)) || hostname === 'localhost';
};

export const initOneSignal = async (): Promise<boolean> => {
  if (isInitialized) {
    return true;
  }

  if (initFailed) {
    return false;
  }

  if (initPromise) {
    return initPromise;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  // Check domain before attempting to initialize
  if (!isAllowedDomain()) {
    console.log('OneSignal: Domain not allowed, skipping initialization');
    initFailed = true;
    return false;
  }

  initPromise = new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('OneSignal initialization timed out');
      initFailed = true;
      resolve(false);
    }, 10000); // 10 second timeout

    try {
      // Initialize deferred array
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      
      // Add script if not already present
      if (!document.querySelector('script[src*="onesignal"]')) {
        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true;
        script.onerror = () => {
          clearTimeout(timeout);
          initFailed = true;
          resolve(false);
        };
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

          clearTimeout(timeout);
          isInitialized = true;
          console.log('OneSignal initialized successfully');
          resolve(true);
        } catch (error) {
          clearTimeout(timeout);
          console.error('OneSignal init error:', error);
          initFailed = true;
          resolve(false);
        }
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error('Failed to initialize OneSignal:', error);
      initFailed = true;
      resolve(false);
    }
  });

  return initPromise;
};

export const isOneSignalAvailable = (): boolean => {
  return isInitialized && !initFailed;
};

export const canUsePushNotifications = (): boolean => {
  return isAllowedDomain() && 'Notification' in window;
};

export const loginOneSignal = async (userId: string, email?: string): Promise<void> => {
  if (!isInitialized) {
    const success = await initOneSignal();
    if (!success) return;
  }

  if (!isInitialized) return;

  // Wait for OneSignal with timeout
  const waitForOneSignal = (): Promise<boolean> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      const check = () => {
        if (window.OneSignal) {
          resolve(true);
        } else if (attempts >= maxAttempts) {
          resolve(false);
        } else {
          attempts++;
          setTimeout(check, 100);
        }
      };
      check();
    });
  };

  const available = await waitForOneSignal();
  if (!available) {
    console.warn('OneSignal not available after waiting');
    return;
  }

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
  // First try native browser permission if OneSignal isn't available
  if (!isInitialized || initFailed) {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch {
        return false;
      }
    }
    return Notification.permission === 'granted';
  }

  // Wait for OneSignal with timeout
  const waitForOneSignal = (): Promise<boolean> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds max
      
      const check = () => {
        if (window.OneSignal) {
          resolve(true);
        } else if (attempts >= maxAttempts) {
          resolve(false);
        } else {
          attempts++;
          setTimeout(check, 100);
        }
      };
      check();
    });
  };

  const available = await waitForOneSignal();
  
  if (!available || !window.OneSignal) {
    console.warn('OneSignal not available, using native permission');
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch {
        return false;
      }
    }
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
