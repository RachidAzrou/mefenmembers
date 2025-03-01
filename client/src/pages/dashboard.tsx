import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { LayoutGrid, Users, Package2, CheckCircle2, DoorOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WeekView } from "@/components/calendar/week-view";
import { format, parseISO, isWithinInterval, startOfToday, endOfToday } from "date-fns";

type Material = {
  id: string;
  typeId: string;
  number: number;
  volunteerId: string;
  isCheckedOut: boolean;
};

type MaterialType = {
  id: string;
  name: string;
};

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

type Room = {
  id: string;
  name: string;
};

type Planning = {
  id: string;
  volunteerId: string;
  roomId: string;
  startDate: string;
  endDate: string;
};

export default function Dashboard() {
  const [checkedOutMaterials, setCheckedOutMaterials] = useState<Material[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<'materials' | 'volunteers' | 'active' | 'rooms' | null>(null);

  useEffect(() => {
    const materialsRef = ref(db, "materials");
    const volunteersRef = ref(db, "volunteers");
    const materialTypesRef = ref(db, "materialTypes");
    const roomsRef = ref(db, "rooms");
    const planningsRef = ref(db, "plannings");

    onValue(materialsRef, (snapshot) => {
      const data = snapshot.val();
      const materialsList = data ? Object.entries(data)
        .map(([id, material]: [string, any]) => ({
          id,
          ...material
        }))
        .filter((material: Material) => material.isCheckedOut) : [];
      setCheckedOutMaterials(materialsList);
    });

    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data)
        .map(([id, volunteer]: [string, any]) => ({
          id,
          ...volunteer
        })) : [];
      setVolunteers(volunteersList);
    });

    onValue(materialTypesRef, (snapshot) => {
      const data = snapshot.val();
      const typesList = data ? Object.entries(data)
        .map(([id, type]: [string, any]) => ({
          id,
          ...type
        })) : [];
      setMaterialTypes(typesList);
    });

    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data)
        .map(([id, room]: [string, any]) => ({
          id,
          ...room
        })) : [];
      setRooms(roomsList);
    });

    onValue(planningsRef, (snapshot) => {
      const data = snapshot.val();
      const planningsList = data ? Object.entries(data)
        .map(([id, planning]: [string, any]) => ({
          id,
          ...planning
        })) : [];
      setPlannings(planningsList);
    });
  }, []);

  // Get unique volunteers active today (have a planning for today)
  const activeVolunteers = volunteers.filter(volunteer => {
    const today = new Date();
    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    return plannings.some(planning => {
      const planningStart = parseISO(planning.startDate);
      const planningEnd = parseISO(planning.endDate);

      return planning.volunteerId === volunteer.id && 
             isWithinInterval(today, { 
               start: planningStart,
               end: planningEnd 
             });
    });
  });

  // Get all plannings for today
  const todayPlannings = plannings.filter(planning => {
    const today = new Date();
    const planningStart = parseISO(planning.startDate);
    const planningEnd = parseISO(planning.endDate);

    return isWithinInterval(today, { 
      start: planningStart,
      end: planningEnd 
    });
  });

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#963E56]">Dashboard</h1>
      </div>

      <div className="space-y-6">
        <WeekView />
      </div>
    </div>
  );
}