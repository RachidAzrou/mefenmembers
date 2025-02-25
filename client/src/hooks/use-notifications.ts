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

    // Registreer service worker als deze nog niet actief is
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(registration => {
          console.log('Service Worker geregistreerd:', registration);
        })
        .catch(err => {
          console.error('Service Worker registratie mislukt:', err);
        });
    }
  }, []);

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        const messaging = getMessaging();
        const swRegistration = await navigator.serviceWorker.getRegistration();

        // Vraag een nieuwe token aan voor deze browser/device
        const token = await getToken(messaging, {
          vapidKey: process.env.FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: swRegistration
        });

        console.log('FCM Token:', token);

        // Luister naar berichten wanneer de app in de voorgrond is
        onMessage(messaging, (payload) => {
          console.log('Voorgrond bericht ontvangen:', payload);

          // Toon een toast notificatie
          toast({
            title: payload.notification?.title || "Nieuwe Aanmelding",
            description: payload.notification?.body,
            duration: 5000,
          });

          // Speel een geluid af voor extra aandacht
          const audio = new Audio('/static/notification.mp3');
          audio.play().catch(console.error);
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

          // Toon toast notificatie als de app open is
          toast({
            title: "Nieuwe Vrijwilliger Aanmelding",
            description: `${latestVolunteer.firstName} ${latestVolunteer.lastName} heeft zich aangemeld als vrijwilliger.`,
            duration: 5000,
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