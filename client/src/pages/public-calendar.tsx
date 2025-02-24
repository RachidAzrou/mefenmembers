import { useState, useEffect } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

type Planning = {
  id: string;
  volunteerId: string;
  roomId: string;
  startDate: string;
  endDate: string;
};

type Room = {
  id: string;
  name: string;
};

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function PublicCalendar() {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  useEffect(() => {
    const planningsRef = ref(db, "plannings");
    onValue(planningsRef, (snapshot) => {
      const data = snapshot.val();
      const planningsList = data ? Object.entries(data).map(([id, planning]) => ({
        id,
        ...(planning as Omit<Planning, "id">),
      })) : [];
      setPlannings(planningsList);
    });

    const roomsRef = ref(db, "rooms");
    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data).map(([id, room]) => ({
        id,
        ...(room as Omit<Room, "id">),
      })) : [];
      setRooms(roomsList);
    });

    const volunteersRef = ref(db, "volunteers");
    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]) => ({
        id,
        ...(volunteer as Omit<Volunteer, "id">),
      })) : [];
      setVolunteers(volunteersList);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <img src="/static/moskee.png" alt="MEFEN" className="h-16 mx-auto" />
          <h1 className="text-3xl font-bold text-center mt-6 text-primary">
            Planning Week van {format(weekStart, "d MMMM yyyy", { locale: nl })}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Desktop View */}
        <div className="hidden md:grid grid-cols-7 gap-4">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="bg-white rounded-lg shadow p-4">
              <div className="text-lg font-semibold text-primary">
                {format(day, "EEEE", { locale: nl })}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                {format(day, "d MMMM", { locale: nl })}
              </div>
              <div className="space-y-3">
                {plannings.map(planning => {
                  const startDate = new Date(planning.startDate);
                  const endDate = new Date(planning.endDate);
                  if (day >= startDate && day <= endDate) {
                    const volunteer = volunteers.find(v => v.id === planning.volunteerId);
                    const room = rooms.find(r => r.id === planning.roomId);
                    return (
                      <div
                        key={planning.id}
                        className="p-3 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors shadow-sm"
                      >
                        <div className="font-medium text-primary break-words">
                          {room?.name || 'Onbekende ruimte'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 break-words leading-normal">
                          {volunteer
                            ? `${volunteer.firstName} ${volunteer.lastName}`
                            : 'Niet toegewezen'
                          }
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-6">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="bg-white rounded-lg shadow p-4">
              <div className="font-medium text-lg text-primary">
                {format(day, "EEEE", { locale: nl })}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                {format(day, "d MMMM", { locale: nl })}
              </div>
              <div className="space-y-3">
                {plannings.map(planning => {
                  const startDate = new Date(planning.startDate);
                  const endDate = new Date(planning.endDate);
                  if (day >= startDate && day <= endDate) {
                    const volunteer = volunteers.find(v => v.id === planning.volunteerId);
                    const room = rooms.find(r => r.id === planning.roomId);
                    return (
                      <div
                        key={planning.id}
                        className="p-4 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
                      >
                        <div className="font-medium text-primary text-lg break-words">
                          {room?.name || 'Onbekende ruimte'}
                        </div>
                        <div className="text-gray-600 mt-1 break-words leading-normal">
                          {volunteer
                            ? `${volunteer.firstName} ${volunteer.lastName}`
                            : 'Niet toegewezen'
                          }
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}