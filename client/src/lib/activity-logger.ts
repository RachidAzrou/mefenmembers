import { ref, push, onValue } from "firebase/database";
import { db, auth } from "@/lib/firebase";

export type UserAction = {
  userId: string;
  userEmail: string;
  action: string;
  details?: string;
  timestamp: string;
  targetType?: string; // 'volunteer', 'material', 'schedule', 'room', 'user', 'auth'
  targetId?: string;   // ID of the affected item
  targetName?: string; // Name/description of the affected item
  volunteerName?: string; // For material checkouts/returns
  materialNumber?: string; // For material checkouts/returns
};

export const UserActionTypes = {
  // Auth related actions
  LOGIN: "Ingelogd",
  LOGOUT: "Uitgelogd",
  PASSWORD_RESET: "Wachtwoord reset aangevraagd",

  // Material related actions
  MATERIAL_CHECKOUT: "Materiaal uitgeleend",
  MATERIAL_RETURN: "Materiaal geretourneerd",
  MATERIAL_TYPE_CREATE: "Materiaaltype aangemaakt",
  MATERIAL_TYPE_UPDATE: "Materiaaltype bijgewerkt",
  MATERIAL_TYPE_DELETE: "Materiaaltype verwijderd",

  // Volunteer related actions
  VOLUNTEER_CREATE: "Vrijwilliger toegevoegd",
  VOLUNTEER_UPDATE: "Vrijwilliger bijgewerkt",
  VOLUNTEER_DELETE: "Vrijwilliger verwijderd",

  // Planning related actions
  PLANNING_CREATE: "Planning toegevoegd",
  PLANNING_UPDATE: "Planning bijgewerkt",
  PLANNING_DELETE: "Planning verwijderd",

  // Room related actions
  ROOM_CREATE: "Ruimte toegevoegd",
  ROOM_UPDATE: "Ruimte bijgewerkt",
  ROOM_DELETE: "Ruimte verwijderd",

  // User management actions
  USER_CREATE: "Gebruiker aangemaakt",
  USER_ROLE_UPDATE: "Gebruikersrol gewijzigd",
  USER_DELETE: "Gebruiker verwijderd"
} as const;

export async function logUserAction(
  action: string,
  details?: string,
  targetInfo?: {
    type?: string;
    id?: string;
    name?: string;
    volunteerName?: string;
    materialNumber?: string;
  }
) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No user logged in");
      return;
    }

    const logEntry: UserAction = {
      userId: user.uid,
      userEmail: user.email || 'unknown',
      action,
      details,
      timestamp: new Date().toISOString(),
      ...(targetInfo && {
        targetType: targetInfo.type,
        targetId: targetInfo.id,
        targetName: targetInfo.name,
        volunteerName: targetInfo.volunteerName,
        materialNumber: targetInfo.materialNumber,
      }),
    };

    const logsRef = ref(db, "user_logs");
    await push(logsRef, logEntry);
    console.log("Action logged successfully:", logEntry);

    return true;
  } catch (error) {
    console.error("Failed to log user action:", error);
    return false;
  }
}

// Helper function to test if logging is working
export function testLogging() {
  const logsRef = ref(db, "user_logs");
  onValue(logsRef, (snapshot) => {
    console.log("Current logs:", snapshot.val());
  });
}