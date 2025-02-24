import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Share2, Share, Copy, Users, Filter, Package2, UserCheck, DoorOpen, Users2 } from "lucide-react";
import { format, addWeeks, startOfWeek, addDays, isWithinInterval, subWeeks } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, push, get } from "firebase/database";
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
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { CalendarPDF } from "../pdf/calendar-pdf";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [filterVolunteer, setFilterVolunteer] = useState<string | "_all">("_all");
  const [filterRoom, setFilterRoom] = useState<string | "_all">("_all");
  const [view, setView] = useState<"grid" | "list">("grid");
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

  const copyPreviousWeek = async () => {
    try {
      const prevWeekStart = subWeeks(weekStart, 1);
      const planningsRef = ref(db, "plannings");
      const snapshot = await get(planningsRef);
      const existingPlannings = snapshot.val() || {};

      const prevWeekPlannings = Object.values(existingPlannings)
        .filter((planning: any) => {
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

        await push(planningsRef, {
          ...planning,
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
    const publicUrl = `${window.location.origin}/calendar/public`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      toast({
        title: "Link gekopieerd",
        description: "De publieke kalender link is gekopieerd naar het klembord",
      });
    }).catch(() => {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon de link niet kopiëren naar het klembord",
      });
    });
  };

  const onSubmit = async (data: z.infer<typeof bulkPlanningSchema>) => {
    try {
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

  const filteredPlannings = plannings.filter(planning => {
    if (filterVolunteer !== "_all" && planning.volunteerId !== filterVolunteer) return false;
    if (filterRoom !== "_all" && planning.roomId !== filterRoom) return false;
    return true;
  });

  const getPlanningsForDay = (date: Date) => {
    return filteredPlannings.filter(planning => {
      const startDate = new Date(planning.startDate);
      const endDate = new Date(planning.endDate);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });
  };

  const checkedOutMaterials = materials.filter(m => m.isCheckedOut).length;
  const totalVolunteers = volunteers.length;
  const totalRooms = rooms.length;
  const activeVolunteers = plannings.filter(p => {
    const endDate = new Date(p.endDate);
    return endDate >= new Date();
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <img src="/static/moskee.png" alt="MEFEN" className="h-8 w-auto" />
          <h1 className="text-3xl font-bold text-primary">Planning</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyPreviousWeek}>
            <Copy className="h-4 w-4 mr-2" />
            Vorige Week Kopiëren
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>Vandaag</Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Share className="h-4 w-4 mr-2" />
                Delen
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild className="flex items-center">
                <PDFDownloadLink
                  document={
                    <CalendarPDF
                      weekStart={weekStart}
                      plannings={filteredPlannings.map(p => ({
                        room: rooms.find(r => r.id === p.roomId) || { name: 'Unknown' },
                        volunteer: volunteers.find(v => v.id === p.volunteerId) || { firstName: 'Unknown', lastName: '' }
                      }))}
                    />
                  }
                  fileName={`planning-${format(weekStart, 'yyyy-MM-dd')}.pdf`}
                  className="flex items-center w-full px-2 py-1.5"
                >
                  {({ loading }) => (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {loading ? "Genereren..." : "PDF Exporteren"}
                    </>
                  )}
                </PDFDownloadLink>
              </DropdownMenuItem>
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Publiceren
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Planning Publiceren</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <img src="/static/moskee.png" alt="MEFEN" className="h-12 w-auto" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Publieke URL voor de planning:</p>
                        <div className="flex items-center gap-2">
                          <code className="bg-primary/5 p-2 rounded text-sm flex-1">
                            {`${window.location.origin}/calendar/public`}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={publishSchedule}
                            className="shrink-0"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Kopiëren
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Deze link kan gedeeld worden met anderen om de planning te bekijken.
                      De planning is altijd up-to-date met de laatste wijzigingen.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuCheckboxItem
            checked={view === "grid"}
            onCheckedChange={() => setView("grid")}
          >
            Rasterweergave
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={view === "list"}
            onCheckedChange={() => setView("list")}
          >
            Lijstweergave
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5">
            <Select
              value={filterVolunteer}
              onValueChange={setFilterVolunteer}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter op vrijwilliger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Alle vrijwilligers</SelectItem>
                {volunteers.map(volunteer => (
                  <SelectItem key={volunteer.id} value={volunteer.id}>
                    {volunteer.firstName} {volunteer.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="px-2 py-1.5">
            <Select
              value={filterRoom}
              onValueChange={setFilterRoom}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter op ruimte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Alle ruimtes</SelectItem>
                {rooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog>
        <DialogTrigger asChild>
          <Button className="bg-[#D9A347] hover:bg-[#D9A347]/90 text-white">
            <Users className="h-4 w-4 mr-2" />
            Bulk Inplannen
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Inplannen</DialogTitle>
          </DialogHeader>
          <Form {...bulkForm}>
            <form onSubmit={bulkForm.handleSubmit(onSubmit)} className="space-y-4">
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
                            {field.value?.includes(volunteer.id) && " ✓"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.value?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {field.value.map(id => {
                          const volunteer = volunteers.find(v => v.id === id);
                          return (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                field.onChange(field.value?.filter(v => v !== id));
                              }}
                            >
                              {volunteer?.firstName} {volunteer?.lastName} ×
                            </Badge>
                          );
                        })}
                      </div>
                    )}
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
                            {field.value?.includes(room.id) && " ✓"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.value?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {field.value.map(id => {
                          const room = rooms.find(r => r.id === id);
                          return (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                field.onChange(field.value?.filter(v => v !== id));
                              }}
                            >
                              {room?.name} ×
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bulkForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Startdatum</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "d MMMM yyyy", { locale: nl })
                              ) : (
                                <span>Kies een datum</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date?.toISOString())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "d MMMM yyyy", { locale: nl })
                              ) : (
                                <span>Kies een datum</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date?.toISOString())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full">
                Planningen Toevoegen
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {view === "grid" ? (
        <div className="relative mt-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDays.map((day) => {
              const dayPlannings = getPlanningsForDay(day);
              return (
                <Card
                  key={day.toISOString()}
                  className="min-w-[280px] md:min-w-0 h-full flex flex-col bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="flex-1 p-4">
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
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dayPlannings = getPlanningsForDay(day);
            return (
              <div key={day.toISOString()} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {format(day, "EEEE", { locale: nl })}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {format(day, "d MMMM", { locale: nl })}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {dayPlannings.length} toewijzing{dayPlannings.length !== 1 ? 'en' : ''}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {dayPlannings.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Geen toewijzingen</p>
                  ) : (
                    dayPlannings.map(planning => {
                      const volunteer = volunteers.find(v => v.id === planning.volunteerId);
                      const room = rooms.find(r => r.id === planning.roomId);

                      return (
                        <div
                          key={planning.id}
                          className="flex justify-between items-start p-3 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
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
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
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

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
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

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
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

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
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