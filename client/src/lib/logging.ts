import { db } from "./firebase";
import { ref, push } from "firebase/database";
import { useAuth } from "@/hooks/use-auth";

type LogAction = 
  | "planning_created"
  | "planning_updated"
  | "planning_deleted"
  | "material_checked_out"
  | "material_checked_in"
  | "room_updated"
  | "volunteer_approved"
  | "channel_updated";

type LogData = {
  action: LogAction;
  userId: string;
  timestamp: string;
  details: Record<string, any>;
};

export async function logUserAction(action: LogAction, details: Record<string, any>) {
  try {
    const { user } = useAuth();
    if (!user) return;

    const logData: LogData = {
      action,
      userId: user.uid,
      timestamp: new Date().toISOString(),
      details,
    };

    await push(ref(db, "logs"), logData);
  } catch (error) {
    console.error("Failed to log action:", error);
  }
}