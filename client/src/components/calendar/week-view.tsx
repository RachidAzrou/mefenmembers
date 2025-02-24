import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Share2, Share, Copy, Users, Filter, Package2, Users2, UserCheck, DoorOpen } from "lucide-react";
import { format, addWeeks, startOfWeek, addDays, isWithinInterval } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { CalendarPDF } from "../pdf/calendar-pdf";
import { PDFDownloadLink } from "@react-pdf/renderer";

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
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

export function WeekView() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filterVolunteer, setFilterVolunteer] = useState<string | "_all">("_all");
  const [filterRoom, setFilterRoom] = useState<string | "_all">("_all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(weekStart, i)
  );

  useEffect(() => {
    const fetchData = async () => {
      const planningsRef = ref(db, "plannings");
      const volunteersRef = ref(db, "volunteers");
      const roomsRef = ref(db, "rooms");

      onValue(planningsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const planningsList = Object.entries(data).map(([id, planning]: [string, any]) => ({
            id,
            ...planning
          }));
          setPlannings(planningsList);
        } else {
          setPlannings([]);
        }
      });

      onValue(volunteersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const volunteersList = Object.entries(data).map(([id, volunteer]: [string, any]) => ({
            id,
            ...volunteer
          }));
          setVolunteers(volunteersList);
        } else {
          setVolunteers([]);
        }
      });

      onValue(roomsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const roomsList = Object.entries(data).map(([id, room]: [string, any]) => ({
            id,
            ...room
          }));
          setRooms(roomsList);
        } else {
          setRooms([]);
        }
      });
    };

    fetchData();
  }, []);

  const goToPreviousWeek = () => setCurrentWeek(addWeeks(currentWeek, -1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  const publishSchedule = () => {
    const publicUrl = `${window.location.origin}/calendar/public`;
    window.open(publicUrl, '_blank');
  };

  const filteredPlannings = plannings.filter(planning => {
    if (filterVolunteer !== "_all" && planning.volunteerId !== filterVolunteer) return false;
    if (filterRoom !== "_all" && planning.roomId !== filterRoom) return false;
    return true;
  });

  const getPlanningsForDay = (day: Date) => {
    return filteredPlannings.filter(planning => {
      const startDate = new Date(planning.startDate);
      const endDate = new Date(planning.endDate);
      return isWithinInterval(day, { start: startDate, end: endDate });
    });
  };

  const getPlanningsForPDF = () => {
    let planningsForPDF = [];

    for (const day of weekDays) {
      const dayPlannings = getPlanningsForDay(day);
      for (const planning of dayPlannings) {
        const volunteer = volunteers.find(v => v.id === planning.volunteerId);
        const room = rooms.find(r => r.id === planning.roomId);

        planningsForPDF.push({
          volunteer: {
            firstName: volunteer?.firstName || 'Onbekend',
            lastName: volunteer?.lastName || 'Vrijwilliger'
          },
          room: {
            name: room?.name || 'Onbekende ruimte'
          },
          date: day
        });
      }
    }

    return planningsForPDF;
  };

  const checkedOutMaterials = 0;
  const totalVolunteers = volunteers.length;
  const totalRooms = rooms.length;
  const activeVolunteers = plannings.filter(p => new Date(p.endDate) >= new Date()).length;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[#D9A347]">
          Week van {format(weekStart, "d MMMM yyyy", { locale: nl })}
        </h2>

        <div className="mt-6 flex flex-wrap justify-between items-center gap-4">
          {/* Left side - Filters */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goToPreviousWeek}>
              <Copy className="h-4 w-4 mr-2" />
              Vorige Week Kopiëren
            </Button>
          </div>

          {/* Center - Navigation */}
          <div className="flex items-center gap-2 mx-auto">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>Vandaag</Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Right side - Export */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Share className="h-4 w-4 mr-2" />
                  Delen
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <PDFDownloadLink
                    document={
                      <CalendarPDF
                        weekStart={weekStart}
                        plannings={getPlanningsForPDF()}
                      />
                    }
                    fileName={`planning-${format(weekStart, 'yyyy-MM-dd')}.pdf`}
                  >
                    {({ loading }) => (
                      <div className="flex items-center w-full px-2 py-1.5">
                        <Download className="h-4 w-4 mr-2" />
                        {loading ? "Genereren..." : "PDF Exporteren"}
                      </div>
                    )}
                  </PDFDownloadLink>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={publishSchedule}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Publiceren
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayPlannings = getPlanningsForDay(day);
          return (
            <Card key={day.toISOString()} className="min-w-[280px] md:min-w-0">
              <CardContent className="p-4">
                <div className="text-lg font-semibold mb-1 text-primary">
                  {format(day, "EEEE", { locale: nl })}
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  {format(day, "d MMMM", { locale: nl })}
                </div>
                <div className="space-y-3">
                  {dayPlannings.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Geen toewijzingen</p>
                  ) : (
                    dayPlannings.map(planning => {
                      const volunteer = volunteers.find(v => v.id === planning.volunteerId);
                      const room = rooms.find(r => r.id === planning.roomId);
                      return (
                        <div
                          key={planning.id}
                          className="p-3 rounded-lg bg-primary/5 border border-primary/10"
                        >
                          <div className="font-medium text-primary">
                            {room?.name || 'Onbekende ruimte'}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {volunteer
                              ? `${volunteer.firstName} ${volunteer.lastName}`
                              : 'Niet toegewezen'
                            }
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package2 className="h-8 w-8 text-primary/80" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Uitgeleende Materialen</h3>
                <p className="text-2xl font-bold text-primary">{checkedOutMaterials}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users2 className="h-8 w-8 text-primary/80" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Totaal Vrijwilligers</h3>
                <p className="text-2xl font-bold text-primary">{totalVolunteers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DoorOpen className="h-8 w-8 text-primary/80" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Totaal Ruimtes</h3>
                <p className="text-2xl font-bold text-primary">{totalRooms}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-primary/80" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Actieve Vrijwilligers</h3>
                <p className="text-2xl font-bold text-primary">{activeVolunteers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}