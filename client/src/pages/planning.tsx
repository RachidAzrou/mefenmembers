import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { ref, push, remove, update, onValue } from "firebase/database";
import { 
  Calendar as CalendarIcon,
  Edit2,
  Trash2,
  Users,
  Users2,
  CalendarDays,
  Building,
  ChevronDown
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

const planningSchema = z.object({
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht"),
  roomId: z.string().min(1, "Ruimte is verplicht"),
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

const bulkPlanningSchema = z.object({
  volunteerIds: z.array(z.string()).min(1, "Selecteer ten minste één vrijwilliger"),
  roomIds: z.array(z.string()).min(1, "Selecteer ten minste één ruimte"),
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

export default function Planning() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [editingPlanning, setEditingPlanning] = useState<Planning | null>(null);
  const [deletePlanningId, setDeletePlanningId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const { toast } = useToast();
  const [selectedPlannings, setSelectedPlannings] = useState<string[]>([]);

  const form = useForm<z.infer<typeof planningSchema>>({
    resolver: zodResolver(planningSchema),
  });

  const bulkForm = useForm<z.infer<typeof bulkPlanningSchema>>({
    resolver: zodResolver(bulkPlanningSchema),
    defaultValues: {
      volunteerIds: [],
      roomIds: [],
    },
  });

  useState(() => {
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

    const planningsRef = ref(db, "plannings");
    onValue(planningsRef, (snapshot) => {
      const data = snapshot.val();
      const planningsList = data ? Object.entries(data).map(([id, planning]) => ({
        id,
        ...(planning as Omit<Planning, "id">),
      })) : [];
      setPlannings(planningsList);
    });
  });

  const onSubmit = async (data: z.infer<typeof planningSchema>) => {
    try {
      if (editingPlanning) {
        await update(ref(db, `plannings/${editingPlanning.id}`), data);
        toast({
          title: "Succes",
          description: "Planning succesvol bijgewerkt",
        });
      } else {
        await push(ref(db, "plannings"), data);
        toast({
          title: "Succes",
          description: "Planning succesvol toegevoegd",
        });
      }
      form.reset();
      setEditingPlanning(null);
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon planning niet opslaan",
      });
    }
  };

  const handleBulkPlan = async (data: z.infer<typeof bulkPlanningSchema>) => {
    try {
      const promises = data.volunteerIds.flatMap(volunteerId =>
        data.roomIds.map(roomId =>
          push(ref(db, "plannings"), {
            volunteerId,
            roomId,
            startDate: data.startDate,
            endDate: data.endDate,
          })
        )
      );

      await Promise.all(promises);

      toast({
        title: "Succes",
        description: "Bulk planning succesvol toegevoegd",
      });
      bulkForm.reset();
      setBulkDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon bulk planning niet opslaan",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(db, `plannings/${id}`));
      toast({
        title: "Succes",
        description: "Planning succesvol verwijderd",
      });
      setDeletePlanningId(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon planning niet verwijderen",
      });
    }
  };

  const handleEdit = (planning: Planning) => {
    setEditingPlanning(planning);
    form.reset({
      volunteerId: planning.volunteerId,
      roomId: planning.roomId,
      startDate: planning.startDate,
      endDate: planning.endDate,
    });
    setDialogOpen(true);
  };

  const calendarClassNames = {
    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
    month: "space-y-4",
    caption: "flex justify-center pt-1 relative items-center",
    caption_label: "text-sm font-medium",
    nav: "space-x-1 flex items-center",
    nav_button: "h-7 w-7 bg-transparent p-0 hover:opacity-100",
    nav_button_previous: "absolute left-1",
    nav_button_next: "absolute right-1",
    table: "w-full border-collapse space-y-1",
    head_row: "flex",
    head_cell: "text-muted-foreground rounded-md w-10 font-normal text-[0.8rem] h-10 flex items-center justify-center",
    row: "flex w-full mt-2",
    cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
    day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100",
    day_selected: "bg-[#6BB85C] text-white hover:bg-[#6BB85C]/90 focus:bg-[#6BB85C] rounded-md",
    day_today: "bg-accent text-accent-foreground",
    day_outside: "text-muted-foreground opacity-50",
    day_disabled: "text-muted-foreground opacity-50",
    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
    day_hidden: "invisible",
  };

  const totalScheduledVolunteers = plannings.length;
  const uniqueVolunteersScheduled = new Set(plannings.map(p => p.volunteerId)).size;
  const uniqueRoomsScheduled = new Set(plannings.map(p => p.roomId)).size;

  const toggleSelectAll = () => {
    if (selectedPlannings.length === plannings.length) {
      setSelectedPlannings([]);
    } else {
      setSelectedPlannings(plannings.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedPlannings(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleBulkDelete = async (planningIds: string[]) => {
    try {
      await Promise.all(planningIds.map(id => remove(ref(db, `plannings/${id}`))));
      toast({
        title: "Succes",
        description: `${planningIds.length} planning(en) succesvol verwijderd`,
      });
      setSelectedPlannings([]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon planningen niet verwijderen",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Planning</h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6BB85C] hover:bg-[#6BB85C]/90 text-white">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Inplannen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPlanning ? "Planning Bewerken" : "Vrijwilliger Inplannen"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="volunteerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vrijwilliger</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer vrijwilliger" />
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
                    control={form.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruimte</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer ruimte" />
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
                    control={form.control}
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
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4 bg-white rounded-lg shadow-lg border" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString())}
                              initialFocus
                              locale={nl}
                              weekStartsOn={1}
                              classNames={calendarClassNames}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
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
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4 bg-white rounded-lg shadow-lg border" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString())}
                              initialFocus
                              locale={nl}
                              weekStartsOn={1}
                              classNames={calendarClassNames}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-[#6BB85C] hover:bg-[#6BB85C]/90 text-white">
                    {editingPlanning ? "Planning Bijwerken" : "Planning Toevoegen"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#D9A347] hover:bg-[#D9A347]/90 text-white border-none">
                <Users className="h-4 w-4 mr-2" />
                Bulk Inplannen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Planning</DialogTitle>
              </DialogHeader>
              <Form {...bulkForm}>
                <form onSubmit={bulkForm.handleSubmit(handleBulkPlan)} className="space-y-4">
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
                              ? currentValues.filter((v) => v !== value)
                              : [...currentValues, value];
                            field.onChange(newValues);
                          }}
                          value={field.value?.[field.value.length - 1] || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer vrijwilligers" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {volunteers.map((volunteer) => (
                              <SelectItem
                                key={volunteer.id}
                                value={volunteer.id}
                                className={cn(
                                  "cursor-pointer",
                                  field.value?.includes(volunteer.id) && "bg-primary/10"
                                )}
                              >
                                {volunteer.firstName} {volunteer.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {field.value?.map((volunteerId) => {
                            const volunteer = volunteers.find((v) => v.id === volunteerId);
                            return (
                              <div
                                key={volunteerId}
                                className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm flex items-center gap-2"
                              >
                                <span>
                                  {volunteer?.firstName} {volunteer?.lastName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    field.onChange(field.value.filter((id) => id !== volunteerId))
                                  }
                                  className="text-primary hover:text-primary/80"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
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
                              ? currentValues.filter((v) => v !== value)
                              : [...currentValues, value];
                            field.onChange(newValues);
                          }}
                          value={field.value?.[field.value.length - 1] || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer ruimtes" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rooms.map((room) => (
                              <SelectItem
                                key={room.id}
                                value={room.id}
                                className={cn(
                                  "cursor-pointer",
                                  field.value?.includes(room.id) && "bg-primary/10"
                                )}
                              >
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {field.value?.map((roomId) => {
                            const room = rooms.find((r) => r.id === roomId);
                            return (
                              <div
                                key={roomId}
                                className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm flex items-center gap-2"
                              >
                                <span>{room?.name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    field.onChange(field.value.filter((id) => id !== roomId))
                                  }
                                  className="text-primary hover:text-primary/80"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
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
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4 bg-white rounded-lg shadow-lg border" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString())}
                              initialFocus
                              locale={nl}
                              weekStartsOn={1}
                              classNames={calendarClassNames}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4 bg-white rounded-lg shadow-lg border" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString())}
                              initialFocus
                              locale={nl}
                              weekStartsOn={1}
                              classNames={calendarClassNames}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-[#D9A347] hover:bg-[#D9A347]/90 text-white">
                    Bulk Planning Toevoegen
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <CollapsibleSection
        title="Planning Overzicht"
        icon={<CalendarDays className="h-5 w-5 text-primary" />}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CalendarDays className="h-8 w-8 text-primary/80" />
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Totaal Planningen</h3>
                  <p className="text-2xl font-bold text-primary">{totalScheduledVolunteers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Users2 className="h-8 w-8 text-primary/80" />
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Unieke Vrijwilligers</h3>
                  <p className="text-2xl font-bold text-primary">{uniqueVolunteersScheduled}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-primary/80" />
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Bezette Ruimtes</h3>
                  <p className="text-2xl font-bold text-primary">{uniqueRoomsScheduled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Planning Tabel"
        icon={<Calendar className="h-5 w-5 text-primary" />}
        defaultOpen={true}
      >
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSelectAll}
                    className="hover:bg-transparent"
                  >
                    {selectedPlannings.length === plannings.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Vrijwilliger</TableHead>
                <TableHead>Ruimte</TableHead>
                <TableHead>Startdatum</TableHead>
                <TableHead>Einddatum</TableHead>
                <TableHead className="w-[100px]">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plannings.map((planning) => {
                const volunteer = volunteers.find((v) => v.id === planning.volunteerId);
                const room = rooms.find((r) => r.id === planning.roomId);
                return (
                  <TableRow key={planning.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSelect(planning.id)}
                        className="hover:bg-transparent"
                      >
                        {selectedPlannings.includes(planning.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "-"}
                    </TableCell>
                    <TableCell>{room ? room.name : "-"}</TableCell>
                    <TableCell>
                      {format(new Date(planning.startDate), "d MMMM yyyy", { locale: nl })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(planning.endDate), "d MMMM yyyy", { locale: nl })}
                    </TableCell>
                    <TableCell className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(planning)}
                        className="text-[#6BB85C] hover:text-[#6BB85C] hover:bg-[#6BB85C]/10"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletePlanningId(planning.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {plannings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    Geen planningen gevonden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CollapsibleSection>

      {/* Bulk Selection Action Bar */}
      {selectedPlannings.length > 0 && (
        <div className="fixed bottom-4 right-4 flex gap-2 bg-white p-4 rounded-lg shadow-lg border z-50">
          <span className="text-sm text-gray-500 self-center mr-2">
            {selectedPlannings.length} geselecteerd
          </span>
          <Button
            variant="default"
            onClick={() => handleEdit(plannings.find(p => p.id === selectedPlannings[0]))}
            disabled={selectedPlannings.length !== 1}
            className="bg-[#6BB85C] hover:bg-[#6BB85C]/90 text-white"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Bewerken
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleBulkDelete(selectedPlannings)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Verwijderen
          </Button>
        </div>
      )}

      <AlertDialog
        open={!!deletePlanningId}
        onOpenChange={() => setDeletePlanningId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. Dit zal de planning permanent verwijderen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePlanningId && handleDelete(deletePlanningId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}