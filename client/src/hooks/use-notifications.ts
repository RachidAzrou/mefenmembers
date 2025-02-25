import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
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
        const token = await getToken(messaging, {
          vapidKey: 'YOUR_VAPID_KEY' // Vervang dit met je VAPID key
        });
        console.log('FCM Token:', token);

        // Luister naar berichten wanneer de app in de voorgrond is
        onMessage(messaging, (payload) => {
          toast({
            title: payload.notification?.title || "Nieuwe Aanmelding",
            description: payload.notification?.body,
            duration: 5000,
          });
        });
      }
    } catch (error) {
      console.error('Fout bij het aanvragen van notificatie permissie:', error);
    }
  };

  // Luister naar nieuwe vrijwilliger registraties
  useEffect(() => {
    const pendingRef = ref(db, 'pending_volunteers');
    const unsubscribe = onValue(pendingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const volunteers = Object.values(data);
        const latestVolunteer = volunteers[volunteers.length - 1] as any;

        // Maak een unieke ID voor deze notificatie
        const notificationId = `${latestVolunteer.firstName}_${latestVolunteer.lastName}_${latestVolunteer.submittedAt}`;

        // Check of we deze notificatie al hebben laten zien
        if (!shownNotifications.has(notificationId)) {
          shownNotifications.add(notificationId);
          setUnreadCount(prev => prev + 1);

          // Toon in-app notificatie
          toast({
            title: "Nieuwe Vrijwilliger Aanmelding",
            description: `${latestVolunteer.firstName} ${latestVolunteer.lastName} heeft zich aangemeld als vrijwilliger.`,
            duration: 5000,
          });

          // Toon push notificatie als permissie is gegeven
          if (permission === 'granted') {
            const notification = new Notification("Nieuwe Vrijwilliger Aanmelding", {
              body: `${latestVolunteer.firstName} ${latestVolunteer.lastName} heeft zich aangemeld als vrijwilliger.`,
              icon: '/static/Naamloos.png',
              badge: '/static/icon-512x512.png',
              tag: 'volunteer-registration',
              data: { volunteerId: latestVolunteer.id }
            });

            notification.onclick = () => {
              window.focus();
              window.location.href = '/volunteers';
            };
          }
        }
      }
    });

    return () => unsubscribe();
  }, [toast, permission]);

  const clearUnreadCount = () => {
    setUnreadCount(0);
  };

  return { permission, requestPermission, unreadCount, clearUnreadCount };
}