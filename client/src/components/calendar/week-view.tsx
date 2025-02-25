import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Share2, Share, Copy, Package2, Users2, UserCheck, House, Clock } from "lucide-react";
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
import { CalendarPDF } from "../pdf/calendar-pdf";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { cn } from "@/lib/utils";

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

type WeekViewProps = {
  checkedOutMaterials: number;
}

export function WeekView({ checkedOutMaterials }: WeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filterVolunteer, setFilterVolunteer] = useState<string | "_all">("_all");
  const [filterRoom, setFilterRoom] = useState<string | "_all">("_all");

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

  const totalVolunteers = volunteers.length;
  const totalRooms = rooms.length;
  const activeVolunteers = plannings.filter(p => new Date(p.endDate) >= new Date()).length;

  return (
    <div className="space-y-6 px-4 md:px-0">
      <div className="text-center">
        <h2 className="text-xl md:text-2xl font-semibold text-[#D9A347]">
          Week van {format(weekStart, "d MMMM yyyy", { locale: nl })}
        </h2>

        <div className="mt-4 md:mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={goToPreviousWeek}
              className="h-9 md:h-10 px-3 md:px-4"
            >
              <Copy className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Vorige Week</span>
              <span className="md:hidden">Vorige</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek} className="h-9 w-9 md:h-10 md:w-10">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday} className="h-9 md:h-10">Vandaag</Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek} className="h-9 w-9 md:h-10 md:w-10">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 md:h-10">
                  <Share className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Delen</span>
                  <span className="md:hidden">...</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <PDFDownloadLink
                  document={
                    <CalendarPDF
                      weekStart={weekStart}
                      plannings={getPlanningsForPDF()}
                      logoUrl={`${window.location.origin}/static/Naamloos.png`}
                    />
                  }
                  fileName={`weekplanning-${format(weekStart, 'yyyy-MM-dd')}.pdf`}
                >
                  {({ loading }) => (
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Download className="h-4 w-4 mr-2" />
                      {loading ? "PDF wordt gemaakt..." : "Download PDF"}
                    </DropdownMenuItem>
                  )}
                </PDFDownloadLink>
                <DropdownMenuItem onClick={publishSchedule}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Publiceren
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayPlannings = getPlanningsForDay(day);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          return (
            <Card 
              key={day.toISOString()} 
              className={cn(
                "min-w-[280px] md:min-w-0",
                isToday && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <CardContent className="p-4">
                <div className="text-base md:text-lg font-semibold mb-1 text-primary">
                  {format(day, "EEEE", { locale: nl })}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  {format(day, "d MMMM", { locale: nl })}
                </div>
                <div className="space-y-3">
                  {dayPlannings.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Geen toewijzingen</p>
                  ) : (
                    dayPlannings.map(planning => {
                      const volunteer = volunteers.find(v => v.id === planning.volunteerId);
                      const room = rooms.find(r => r.id === planning.roomId);
                      return (
                        <div
                          key={planning.id}
                          className="p-3 rounded-lg bg-primary/5 border border-primary/10 transition-colors hover:bg-primary/10"
                        >
                          <div className="font-medium text-primary text-sm md:text-base">
                            {room?.name || 'Onbekende ruimte'}
                          </div>
                          <div className="text-xs md:text-sm text-muted-foreground mt-1 flex flex-col gap-0.5">
                            <div className="flex items-center">
                              <Users2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />
                              {volunteer
                                ? `${volunteer.firstName} ${volunteer.lastName}`
                                : 'Niet toegewezen'
                              }
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />
                              {format(new Date(planning.startDate), "HH:mm", { locale: nl })} - 
                              {format(new Date(planning.endDate), "HH:mm", { locale: nl })}
                            </div>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Package2 className="h-6 w-6 md:h-8 md:w-8 text-primary/80" />
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Uitgeleende Materialen</p>
                <p className="text-xl md:text-2xl font-bold text-primary">{checkedOutMaterials}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Users2 className="h-6 w-6 md:h-8 md:w-8 text-primary/80" />
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Totaal Vrijwilligers</p>
                <p className="text-xl md:text-2xl font-bold text-primary">{totalVolunteers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <House className="h-6 w-6 md:h-8 md:w-8 text-primary/80" />
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Totaal Ruimtes</p>
                <p className="text-xl md:text-2xl font-bold text-primary">{totalRooms}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <UserCheck className="h-6 w-6 md:h-8 md:w-8 text-primary/80" />
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Actieve Vrijwilligers</p>
                <p className="text-xl md:text-2xl font-bold text-primary">{activeVolunteers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}