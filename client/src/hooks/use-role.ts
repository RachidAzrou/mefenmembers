import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { UserRole, getUserRole } from '@/lib/roles';

export function useRole() {
  const [user] = useAuthState(auth);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const userRole = await getUserRole(user);
        setRole(userRole);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  // Iedereen heeft dezelfde rechten
  return { role, isAdmin: role === 'gebruiker', isMedewerker: role === 'gebruiker', loading };
}
