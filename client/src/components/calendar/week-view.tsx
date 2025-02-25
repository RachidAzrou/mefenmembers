import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Share2, Clock, MapPin, Users } from "lucide-react";
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

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

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

  const getPlanningsForDay = (day: Date) => {
    return plannings.filter(planning => {
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

  return (
    <div className="space-y-6">
      {/* Header sectie */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-4">
          <h2 className="text-lg sm:text-xl font-semibold text-[#D9A347]">
            Week van {format(weekStart, "d MMMM yyyy", { locale: nl })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousWeek}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-9 px-4"
          >
            Vandaag
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextWeek}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Share2 className="h-4 w-4 mr-2" />
                Delen
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

      {/* Week overzicht */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayPlannings = getPlanningsForDay(day);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          return (
            <Card
              key={day.toISOString()}
              className={cn(
                "min-w-[280px] md:min-w-0 transition-all",
                isToday && "ring-2 ring-[#D9A347] ring-offset-2"
              )}
            >
              <CardContent className="p-4">
                <div className={cn(
                  "text-base font-semibold mb-1",
                  isToday ? "text-[#D9A347]" : "text-primary"
                )}>
                  {format(day, "EEEE", { locale: nl })}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  {format(day, "d MMMM", { locale: nl })}
                </div>
                <div className="space-y-3">
                  {dayPlannings.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-2">
                      Geen toewijzingen
                    </p>
                  ) : (
                    dayPlannings.map(planning => {
                      const volunteer = volunteers.find(v => v.id === planning.volunteerId);
                      const room = rooms.find(r => r.id === planning.roomId);
                      return (
                        <div
                          key={planning.id}
                          className="p-3 rounded-lg bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-primary/70 mt-0.5" />
                            <div>
                              <div className="font-medium text-primary text-sm">
                                {room?.name || 'Onbekende ruimte'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                <Users className="h-3.5 w-3.5" />
                                {volunteer
                                  ? `${volunteer.firstName} ${volunteer.lastName}`
                                  : 'Niet toegewezen'
                                }
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                {format(new Date(planning.startDate), "HH:mm")} - {format(new Date(planning.endDate), "HH:mm")}
                              </div>
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
    </div>
  );
}