import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    // TODO: Implement PDF download
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
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold">
          Week van {format(weekStart, "d MMMM yyyy", { locale: nl })}
        </h2>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0 mb-6">
        <div className="flex space-x-4">
          <Button variant="outline" onClick={copyPreviousWeek}>
            <Copy className="h-4 w-4 mr-2" />
            Vorige Week Kopiëren
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
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
        <div className="flex justify-center space-x-2">
          <Button variant="outline" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>Vandaag</Button>
          <Button variant="outline" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Share className="h-4 w-4 mr-2" />
              Deel
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={downloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF Exporteren
            </DropdownMenuItem>
            <DropdownMenuItem onClick={publishSchedule}>
              <Share2 className="h-4 w-4 mr-2" />
              Publiceren
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayPlannings = getPlanningsForDay(day);
          return (
            <Card key={day.toISOString()} className="p-4">
              <div className="font-medium">
                {format(day, "EEEE", { locale: nl })}
              </div>
              <div className="text-sm text-gray-500 mb-3">
                {format(day, "d MMM", { locale: nl })}
              </div>
              <div className="space-y-2">
                {dayPlannings.map(planning => {
                  const volunteer = volunteers.find(v => v.id === planning.volunteerId);
                  const room = rooms.find(r => r.id === planning.roomId);
                  return (
                    <div
                      key={planning.id}
                      className="text-xs p-2 rounded bg-primary/5 border border-primary/10"
                    >
                      <div className="font-medium text-primary">
                        {room?.name}
                      </div>
                      <div className="text-gray-600">
                        {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uitgeleende Materialen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkedOutMaterials}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totaal Vrijwilligers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVolunteers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totaal Ruimtes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRooms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actieve Vrijwilligers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVolunteers}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}