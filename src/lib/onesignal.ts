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
}

interface NotificationEventData {
  notification?: {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
  };
}

// Get OneSignal App ID - this is a public/publishable key
// It's safe to include in client-side code
// The user should replace this with their actual App ID
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '';

let isInitialized = false;

export const initOneSignal = async (): Promise<void> => {
  if (isInitialized || typeof window === 'undefined') {
    return;
  }

  if (!ONESIGNAL_APP_ID) {
    console.warn('OneSignal App ID not configured. Push notifications disabled.');
    return;
  }

  try {
    // Load OneSignal SDK
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    // Add script if not already present
    if (!document.querySelector('script[src*="onesignal"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      document.head.appendChild(script);
    }

    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        notifyButton: {
          enable: false, // We'll use custom UI
        },
        welcomeNotification: {
          disable: true, // We'll handle welcome ourselves
        },
      });

      isInitialized = true;
      console.log('OneSignal initialized successfully');
    });
  } catch (error) {
    console.error('Failed to initialize OneSignal:', error);
  }
};

export const loginOneSignal = async (userId: string, email?: string): Promise<void> => {
  if (!isInitialized || !window.OneSignal) {
    await initOneSignal();
    // Wait for initialization
    await new Promise((resolve) => {
      window.OneSignalDeferred?.push(() => resolve(true));
    });
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
  if (!window.OneSignal) {
    console.warn('OneSignal not initialized');
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
  return window.OneSignal?.Notifications.permission ?? false;
};

export const getPushPermissionStatus = (): 'default' | 'granted' | 'denied' => {
  return window.OneSignal?.Notifications.permissionNative ?? 'default';
};

export const addPushNotificationListener = (
  event: 'click' | 'foregroundWillDisplay',
  callback: (data: NotificationEventData) => void
): void => {
  if (window.OneSignal) {
    window.OneSignal.Notifications.addEventListener(event, callback);
  }
};

export const removePushNotificationListener = (
  event: 'click' | 'foregroundWillDisplay',
  callback: (data: NotificationEventData) => void
): void => {
  if (window.OneSignal) {
    window.OneSignal.Notifications.removeEventListener(event, callback);
  }
};
