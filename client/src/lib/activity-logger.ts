import { ref, push, onValue } from "firebase/database";
import { db, auth } from "@/lib/firebase";

export type UserAction = {
  userId: string;
  userEmail: string;
  action: string;
  details?: string;
  timestamp: string;
  targetType?: string; // 'volunteer', 'material', 'schedule', etc.
  targetId?: string;   // ID of the affected item
  targetName?: string; // Name/description of the affected item
};

export async function logUserAction(
  action: string,
  details?: string,
  targetInfo?: {
    type?: string;
    id?: string;
    name?: string;
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
      }),
    };

    console.log("Attempting to log action:", logEntry);
    const logsRef = ref(db, "user_logs");
    await push(logsRef, logEntry);
    console.log("Action logged successfully");

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