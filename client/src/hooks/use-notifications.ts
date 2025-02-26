import { useEffect, useState } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

// Keep track of shown notifications to prevent duplicates
const shownNotifications = new Set<string>();

export function useNotifications() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!('Notification' in window)) {
      console.log('Deze browser ondersteunt geen notificaties');
      return;
    }

    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        const messaging = getMessaging();

        // Listen for foreground messages
        onMessage(messaging, (payload) => {
          console.log('Voorgrond bericht ontvangen:', payload);

          // Show a toast notification with new styling
          toast({
            title: payload.notification?.title || "Nieuwe Aanmelding",
            description: payload.notification?.body,
            variant: "default",
            duration: 3000,
          });
        });
      }
    } catch (error) {
      console.error('Fout bij het aanvragen van notificatie permissie:', error);
    }
  };

  // Listen for new volunteer registrations
  useEffect(() => {
    const pendingRef = ref(db, 'pending_volunteers');
    const unsubscribe = onValue(pendingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const volunteers = Object.values(data);
        const latestVolunteer = volunteers[volunteers.length - 1] as any;

        // Create a unique ID for this notification
        const notificationId = `${latestVolunteer.firstName}_${latestVolunteer.lastName}_${latestVolunteer.submittedAt}`;

        // Check if we've already shown this notification
        if (!shownNotifications.has(notificationId)) {
          shownNotifications.add(notificationId);
          setUnreadCount(prev => prev + 1);

          // Show toast notification with softer styling
          toast({
            title: "Nieuwe Vrijwilliger Aanmelding",
            description: `${latestVolunteer.firstName} ${latestVolunteer.lastName} heeft zich aangemeld als vrijwilliger.`,
            variant: "default",
            duration: 3000,
          });
        }
      }
    });

    return () => unsubscribe();
  }, [toast]);

  const clearUnreadCount = () => {
    setUnreadCount(0);
  };

  return { permission, requestPermission, unreadCount, clearUnreadCount };
}