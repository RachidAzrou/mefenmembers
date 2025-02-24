import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Share2, Share, Copy } from "lucide-react";
import { format, addWeeks, startOfWeek, addDays, isWithinInterval, subWeeks } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, push } from "firebase/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { CalendarPDF } from "../pdf/calendar-pdf";

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
  const { toast } = useToast();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  useEffect(() => {
    const planningsRef = ref(db, "plannings");
    const unsubscribe = onValue(planningsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const planningsList = Object.entries(data).map(([id, planning]: [string, any]) => ({
          id,
          volunteerId: planning.volunteerId,
          roomId: planning.roomId,
          startDate: planning.startDate,
          endDate: planning.endDate,
        }));
        setPlannings(planningsList);
      } else {
        setPlannings([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const volunteersRef = ref(db, "volunteers");
    const unsubscribe = onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const volunteersList = Object.entries(data).map(([id, volunteer]: [string, any]) => ({
          id,
          firstName: volunteer.firstName || '',
          lastName: volunteer.lastName || '',
        }));
        setVolunteers(volunteersList);
      } else {
        setVolunteers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const roomsRef = ref(db, "rooms");
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomsList = Object.entries(data).map(([id, room]: [string, any]) => ({
          id,
          name: room.name || '',
        }));
        setRooms(roomsList);
      } else {
        setRooms([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const getPlanningsForDay = (day: Date) => {
    return plannings.filter(planning => {
      const startDate = new Date(planning.startDate);
      const endDate = new Date(planning.endDate);
      return isWithinInterval(day, { start: startDate, end: endDate });
    });
  };

  const getFormattedPlanningsForPDF = () => {
    let formattedPlannings = [];

    weekDays.forEach(day => {
      const dayPlannings = getPlanningsForDay(day);

      dayPlannings.forEach(planning => {
        const volunteer = volunteers.find(v => v.id === planning.volunteerId);
        const room = rooms.find(r => r.id === planning.roomId);

        if (volunteer && room) {
          formattedPlannings.push({
            date: day,
            volunteer: {
              firstName: volunteer.firstName,
              lastName: volunteer.lastName,
            },
            room: {
              name: room.name,
            },
          });
        }
      });
    });

    console.log('Formatted plannings for PDF:', formattedPlannings);
    return formattedPlannings;
  };

  const goToPreviousWeek = () => setCurrentWeek(addWeeks(currentWeek, -1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  const copyPreviousWeek = async () => {
    try {
      const prevWeekStart = subWeeks(weekStart, 1);
      const prevWeekPlannings = plannings.filter(planning => {
        const planningDate = new Date(planning.startDate);
        return isWithinInterval(planningDate, {
          start: prevWeekStart,
          end: addDays(prevWeekStart, 6)
        });
      });

      for (const planning of prevWeekPlannings) {
        const startDate = new Date(planning.startDate);
        const endDate = new Date(planning.endDate);
        const daysDiff = 7;

        await push(ref(db, "plannings"), {
          volunteerId: planning.volunteerId,
          roomId: planning.roomId,
          startDate: addDays(startDate, daysDiff).toISOString(),
          endDate: addDays(endDate, daysDiff).toISOString(),
        });
      }

      toast({
        title: "Succes",
        description: "Planningen van vorige week succesvol gekopieerd",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon planningen niet kopiëren",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[#D9A347]">
          Week van {format(weekStart, "d MMMM yyyy", { locale: nl })}
        </h2>

        <div className="mt-6 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={copyPreviousWeek}>
              <Copy className="h-4 w-4 mr-2" />
              Vorige Week Kopiëren
            </Button>
          </div>

          <div className="flex items-center gap-2 mx-auto">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>Vandaag</Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Share className="h-4 w-4 mr-2" />
                  Delen
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <PDFDownloadLink
                    document={
                      <CalendarPDF
                        weekStart={weekStart}
                        plannings={getFormattedPlanningsForPDF()}
                      />
                    }
                    fileName={`planning-${format(weekStart, 'yyyy-MM-dd')}.pdf`}
                  >
                    {({ loading, error }) => (
                      <div className="flex items-center px-2 py-1.5">
                        <Download className="h-4 w-4 mr-2" />
                        {loading ? "PDF Genereren..." : error ? "Fout bij genereren" : "PDF Exporteren"}
                      </div>
                    )}
                  </PDFDownloadLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayPlannings = getPlanningsForDay(day);

          return (
            <Card key={day.toISOString()} className="min-h-[200px]">
              <CardContent className="p-4">
                <div className="text-lg font-semibold mb-1">
                  {format(day, "EEEE", { locale: nl })}
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  {format(day, "d MMMM", { locale: nl })}
                </div>
                <div className="space-y-2">
                  {dayPlannings.map(planning => {
                    const volunteer = volunteers.find(v => v.id === planning.volunteerId);
                    const room = rooms.find(r => r.id === planning.roomId);

                    return (
                      <div key={planning.id} className="p-2 bg-gray-50 rounded-lg border">
                        <div className="font-medium">{room?.name || 'Onbekende ruimte'}</div>
                        <div className="text-sm text-gray-600">
                          {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'Niet toegewezen'}
                        </div>
                      </div>
                    );
                  })}
                  {dayPlannings.length === 0 && (
                    <div className="text-sm text-gray-500 italic">
                      Geen toewijzingen
                    </div>
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