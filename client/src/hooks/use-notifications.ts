import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if the browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
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
        const token = await getToken(messaging);
        console.log('FCM Token:', token);

        // Listen for messages when the app is in the foreground
        onMessage(messaging, (payload) => {
          toast({
            title: payload.notification?.title,
            description: payload.notification?.body,
            duration: 5000,
          });
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
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
        
        // Check if the registration is recent (within the last minute)
        const registrationTime = new Date(latestVolunteer.submittedAt).getTime();
        const now = Date.now();
        const isRecent = now - registrationTime < 60000; // 1 minute

        if (isRecent) {
          // Show in-app notification
          toast({
            title: "Nieuwe Vrijwilliger Aanmelding",
            description: `${latestVolunteer.firstName} ${latestVolunteer.lastName} heeft zich aangemeld.`,
            duration: 5000,
          });

          // Show push notification if permission is granted
          if (permission === 'granted') {
            new Notification("Nieuwe Vrijwilliger Aanmelding", {
              body: `${latestVolunteer.firstName} ${latestVolunteer.lastName} heeft zich aangemeld.`,
              icon: '/static/Naamloos.png'
            });
          }
        }
      }
    });

    return () => unsubscribe();
  }, [toast, permission]);

  return { permission, requestPermission };
}
