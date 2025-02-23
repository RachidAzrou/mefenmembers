import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Share2, Share, Copy, Users } from "lucide-react";
import { format, addWeeks, startOfWeek, addDays, isWithinInterval } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, push } from "firebase/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

type Material = {
  id: string;
  typeId: string;
  volunteerId?: string;
  isCheckedOut: boolean;
};

const bulkPlanningSchema = z.object({
  volunteerIds: z.array(z.string()).min(1, "Selecteer minimaal één vrijwilliger"),
  roomIds: z.array(z.string()).min(1, "Selecteer minimaal één ruimte"),
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().min(1, "Einddatum is verplicht"),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "Einddatum moet na startdatum liggen",
  path: ["endDate"],
});

export function WeekView() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const { toast } = useToast();

  const bulkForm = useForm<z.infer<typeof bulkPlanningSchema>>({
    resolver: zodResolver(bulkPlanningSchema),
    defaultValues: {
      volunteerIds: [],
      roomIds: [],
    },
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(weekStart, i)
  );

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

    const volunteersRef = ref(db, "volunteers");
    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]) => ({
        id,
        ...(volunteer as Omit<Volunteer, "id">),
      })) : [];
      setVolunteers(volunteersList);
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

    const materialsRef = ref(db, "materials");
    onValue(materialsRef, (snapshot) => {
      const data = snapshot.val();
      const materialsList = data ? Object.entries(data).map(([id, material]) => ({
        id,
        ...(material as Omit<Material, "id">),
      })) : [];
      setMaterials(materialsList);
    });
  }, []);

  const goToPreviousWeek = () => setCurrentWeek(addWeeks(currentWeek, -1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  const copyPreviousWeek = () => {
    // TODO: Implement copy previous week
  };

  const downloadPDF = () => {
    const filename = `planning-${format(weekStart, 'yyyy-MM-dd')}.pdf`;
    const pdfContent = (
      <CalendarPDF
        weekStart={weekStart}
        plannings={plannings.map(p => ({
          room: rooms.find(r => r.id === p.roomId) || { name: 'Unknown' },
          volunteer: volunteers.find(v => v.id === p.volunteerId) || { firstName: 'Unknown', lastName: '' }
        }))}
      />
    );

    return (
      <PDFDownloadLink document={pdfContent} fileName={filename}>
        {({ loading }) => (loading ? "Genereren..." : "PDF Exporteren")}
      </PDFDownloadLink>
    );
  };

  const publishSchedule = () => {
    // TODO: Implement publish to HTML
  };

  const onBulkSubmit = async (data: z.infer<typeof bulkPlanningSchema>) => {
    try {
      // Create a planning for each volunteer and room combination
      for (const volunteerId of data.volunteerIds) {
        for (const roomId of data.roomIds) {
          await push(ref(db, "plannings"), {
            volunteerId,
            roomId,
            startDate: data.startDate,
            endDate: data.endDate,
          });
        }
      }
      toast({
        title: "Succes",
        description: "Planningen succesvol toegevoegd",
      });
      bulkForm.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon planningen niet toevoegen",
      });
    }
  };

  const getPlanningsForDay = (date: Date) => {
    return plannings.filter(planning => {
      const startDate = new Date(planning.startDate);
      const endDate = new Date(planning.endDate);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });
  };

  // Calculate statistics
  const checkedOutMaterials = materials.filter(m => m.isCheckedOut).length;
  const totalVolunteers = volunteers.length;
  const totalRooms = rooms.length;
  const activeVolunteers = plannings.filter(p => {
    const endDate = new Date(p.endDate);
    return endDate >= new Date();
  }).length;

  return (
    <div className="space-y-6">
      {/* Top control bar - mobile responsive */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="w-full md:w-auto flex flex-wrap gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={copyPreviousWeek}>
            <Copy className="h-4 w-4 mr-2" />
            Vorige Week Kopiëren
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>Vandaag</Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-full md:w-auto flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Share className="h-4 w-4 mr-2" />
                Deel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                {downloadPDF()}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={publishSchedule}>
                <Share2 className="h-4 w-4 mr-2" />
                Publiceren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Users className="h-4 w-4 mr-2" />
                Bulk Inplannen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Inplannen</DialogTitle>
              </DialogHeader>
              <Form {...bulkForm}>
                <form onSubmit={bulkForm.handleSubmit(onBulkSubmit)} className="space-y-4">
                  <FormField
                    control={bulkForm.control}
                    name="volunteerIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vrijwilligers</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            const currentValues = field.value || [];
                            const newValues = currentValues.includes(value)
                              ? currentValues.filter(v => v !== value)
                              : [...currentValues, value];
                            field.onChange(newValues);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer vrijwilligers" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {volunteers.map((volunteer) => (
                              <SelectItem key={volunteer.id} value={volunteer.id}>
                                {volunteer.firstName} {volunteer.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bulkForm.control}
                    name="roomIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruimtes</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            const currentValues = field.value || [];
                            const newValues = currentValues.includes(value)
                              ? currentValues.filter(v => v !== value)
                              : [...currentValues, value];
                            field.onChange(newValues);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer ruimtes" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bulkForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Startdatum</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bulkForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Einddatum</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    Planningen Toevoegen
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar heading */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Week van {format(weekStart, "d MMMM yyyy", { locale: nl })}
        </h2>
      </div>

      {/* Calendar grid - mobile scrollable */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 overflow-x-auto pb-4">
          {weekDays.map((day) => {
            const dayPlannings = getPlanningsForDay(day);
            return (
              <Card
                key={day.toISOString()}
                className="min-w-[280px] md:min-w-0 h-full flex flex-col"
              >
                <CardContent className="flex-1 p-4">
                  <div className="text-lg font-semibold mb-1">
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
                            className="p-3 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors shadow-sm"
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
      </div>

      {/* Statistics cards - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Uitgeleende Materialen</h3>
            <p className="text-2xl font-bold">{checkedOutMaterials}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Totaal Vrijwilligers</h3>
            <p className="text-2xl font-bold">{totalVolunteers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Totaal Ruimtes</h3>
            <p className="text-2xl font-bold">{totalRooms}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Actieve Vrijwilligers</h3>
            <p className="text-2xl font-bold">{activeVolunteers}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}