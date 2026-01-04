/**
 * usePushNotifications - Capacitor Push Notifications hook
 * 
 * Handles push notification registration and permission requests for native apps.
 * Falls back gracefully in web browsers.
 */

import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { toast } from 'sonner';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isRegistered: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
  requestPermission: () => Promise<boolean>;
  token: string | null;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [token, setToken] = useState<string | null>(null);
  
  const isSupported = Capacitor.isNativePlatform();

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.log('Push notifications not supported on web');
      return false;
    }

    try {
      // Check current permission status
      const permResult = await PushNotifications.checkPermissions();
      
      if (permResult.receive === 'prompt') {
        // Request permission
        const requestResult = await PushNotifications.requestPermissions();
        setPermissionStatus(requestResult.receive as 'granted' | 'denied');
        
        if (requestResult.receive === 'granted') {
          await PushNotifications.register();
          return true;
        }
        return false;
      } else if (permResult.receive === 'granted') {
        setPermissionStatus('granted');
        await PushNotifications.register();
        return true;
      } else {
        setPermissionStatus('denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting push notification permission:', error);
      return false;
    }
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return;

    // Check initial permission status
    PushNotifications.checkPermissions().then((result) => {
      setPermissionStatus(result.receive as 'prompt' | 'granted' | 'denied');
    });

    // Set up listeners
    const registrationListener = PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push notification registration successful:', token.value);
      setToken(token.value);
      setIsRegistered(true);
    });

    const registrationErrorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Push notification registration error:', error);
      setIsRegistered(false);
    });

    const notificationReceivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        // Show in-app notification when app is in foreground
        toast.info(notification.title || 'New notification', {
          description: notification.body,
        });
      }
    );

    const notificationActionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        // Handle notification tap - could navigate to relevant screen
        const data = action.notification.data;
        if (data?.orderId) {
          // Navigation could be handled here
          console.log('Navigate to order:', data.orderId);
        }
      }
    );

    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
      notificationReceivedListener.then(l => l.remove());
      notificationActionListener.then(l => l.remove());
    };
  }, [isSupported]);

  return {
    isSupported,
    isRegistered,
    permissionStatus,
    requestPermission,
    token,
  };
}

/**
 * Send a local push notification (for when app is in foreground)
 * This wraps the order status messages for consistent notification experience
 */
export function getOrderStatusNotification(status: string): { title: string; body: string } | null {
  const notifications: Record<string, { title: string; body: string }> = {
    paid: {
      title: 'Payment Confirmed',
      body: 'Your order has been paid successfully!',
    },
    assigned: {
      title: 'Washer Assigned',
      body: 'A washer has been assigned to your order!',
    },
    in_progress: {
      title: 'Laundry In Progress',
      body: 'Your laundry is being processed!',
    },
    completed: {
      title: 'Order Complete',
      body: 'Your laundry order is complete and ready!',
    },
    cancelled: {
      title: 'Order Cancelled',
      body: 'Your order has been cancelled.',
    },
  };

  return notifications[status] || null;
}
