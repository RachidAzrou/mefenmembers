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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { ref, push, remove, update, onValue } from "firebase/database";
import {
  CalendarIcon,
  Calendar as CalendarDaysIcon,
  ChevronDown,
  Building,
  Search,
  Users2,
  UserCheck,
  House,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";
import { Form as FormComponent, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { useRole } from "@/hooks/use-role";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label"; // Added import

const planningSchema = z.object({
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht").optional(),
  roomId: z.string().min(1, "Ruimte is verplicht").optional(),
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().min(1, "Einddatum is verplicht"),
  isBulkPlanning: z.boolean().optional(),
  selectedVolunteers: z.array(z.string()).optional(),
  selectedRooms: z.array(z.string()).optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "Einddatum moet na startdatum liggen",
  path: ["endDate"],
}).refine((data) => {
  if (data.isBulkPlanning) {
    return (data.selectedVolunteers?.length || 0) > 0 && (data.selectedRooms?.length || 0) > 0;
  }
  return data.volunteerId && data.roomId;
}, {
  message: "Selecteer ten minste één vrijwilliger en één ruimte",
});

type Planning = z.infer<typeof planningSchema> & { id: string };

export default function Planning() {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [volunteers, setVolunteers] = useState<{ id: string; firstName: string; lastName: string; }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string; }[]>([]);
  const [editingPlanning, setEditingPlanning] = useState<Planning | null>(null);
  const [deletePlanningId, setDeletePlanningId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchActive, setSearchActive] = useState("");
  const [searchUpcoming, setSearchUpcoming] = useState("");
  const { isAdmin } = useRole();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof planningSchema>>({
    resolver: zodResolver(planningSchema),
    defaultValues: {
      isBulkPlanning: false,
      selectedVolunteers: [],
      selectedRooms: [],
    }
  });

  useState(() => {
    const volunteersRef = ref(db, "volunteers");
    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]) => ({
        id,
        ...(volunteer as Omit<{ firstName: string; lastName: string; }, "id">),
      })) : [];
      setVolunteers(volunteersList);
    });

    const roomsRef = ref(db, "rooms");
    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data).map(([id, room]) => ({
        id,
        ...(room as Omit<{ name: string; }, "id">),
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
      if (data.isBulkPlanning) {
        const volunteers = data.selectedVolunteers || [];
        const rooms = data.selectedRooms || [];

        for (const volunteerId of volunteers) {
          for (const roomId of rooms) {
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
          description: `${volunteers.length * rooms.length} planningen succesvol toegevoegd`,
        });
      } else {
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

  const handleEdit = (planning: Planning) => {
    setEditingPlanning(planning);
    form.reset({
      volunteerId: planning.volunteerId,
      roomId: planning.roomId,
      startDate: planning.startDate,
      endDate: planning.endDate,
      isBulkPlanning: false,
      selectedVolunteers: [],
      selectedRooms: [],
    });
    setDialogOpen(true);
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

  const totalScheduledVolunteers = plannings.length;
  const uniqueVolunteersScheduled = new Set(plannings.map(p => p.volunteerId)).size;
  const uniqueRoomsScheduled = new Set(plannings.map(p => p.roomId)).size;

  const { activePlannings, upcomingPlannings, pastPlannings } = plannings.reduce<{
    activePlannings: Planning[];
    upcomingPlannings: Planning[];
    pastPlannings: Planning[];
  }>((acc, planning) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(planning.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(planning.endDate);
    endDate.setHours(0, 0, 0, 0);

    if (format(today, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd')) {
      acc.activePlannings.push(planning);
    } else if (startDate > today) {
      acc.upcomingPlannings.push(planning);
    } else {
      acc.pastPlannings.push(planning);
    }
    return acc;
  }, { activePlannings: [], upcomingPlannings: [], pastPlannings: [] });

  const filterPlannings = (planningsList: Planning[], searchTerm: string): Planning[] => {
    if (!searchTerm.trim()) return planningsList;

    const term = searchTerm.toLowerCase();
    return planningsList.filter(planning => {
      const volunteer = volunteers.find(v => v.id === planning.volunteerId);
      const room = rooms.find(r => r.id === planning.roomId);

      const volunteerName = volunteer
        ? `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase()
        : '';
      const roomName = room?.name.toLowerCase() || '';

      return volunteerName.includes(term) || roomName.includes(term);
    });
  };

  const filteredActivePlannings = filterPlannings(activePlannings, searchActive);
  const filteredUpcomingPlannings = filterPlannings(upcomingPlannings, searchUpcoming);

  const PlanningTable = ({ plannings, emptyMessage }: { plannings: Planning[]; emptyMessage: string }) => (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vrijwilliger</TableHead>
            <TableHead>Ruimte</TableHead>
            <TableHead>Periode</TableHead>
            <TableHead className="w-[100px]">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plannings.map((planning) => {
            const volunteer = volunteers.find((v) => v.id === planning.volunteerId);
            const room = rooms.find((r) => r.id === planning.roomId);
            return (
              <TableRow key={planning.id}>
                <TableCell className="font-medium">
                  {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "-"}
                </TableCell>
                <TableCell>{room ? room.name : "-"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(planning.startDate), "d MMM yyyy", { locale: nl })} - {format(new Date(planning.endDate), "d MMM yyyy", { locale: nl })}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(planning);
                      }}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePlanningId(planning.id);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {plannings.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-32 text-center text-muted-foreground"
              >
                <CalendarDaysIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const PlanningForm = ({ form, onSubmit, editingPlanning, volunteers, rooms }: {
    form: ReturnType<typeof useForm<z.infer<typeof planningSchema>>>;
    onSubmit: (data: z.infer<typeof planningSchema>) => Promise<void>;
    editingPlanning: Planning | null;
    volunteers: { id: string; firstName: string; lastName: string; }[];
    rooms: { id: string; name: string; }[];
  }) => (
    <FormComponent {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center space-x-2 pb-4 border-b">
          <Switch
            checked={form.watch("isBulkPlanning")}
            onCheckedChange={(checked) => {
              form.setValue("isBulkPlanning", checked);
              if (!checked) {
                form.setValue("selectedVolunteers", []);
                form.setValue("selectedRooms", []);
              }
            }}
          />
          <Label>Bulk Inplannen</Label>
        </div>

        {!form.watch("isBulkPlanning") ? (
          <>
            <FormField
              control={form.control}
              name="volunteerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vrijwilliger</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          </>
        ) : (
          <>
            <FormField
              control={form.control}
              name="selectedVolunteers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vrijwilligers</FormLabel>
                  <MultiSelect
                    options={volunteers.map(v => ({
                      value: v.id,
                      label: `${v.firstName} ${v.lastName}`
                    }))}
                    selected={field.value || []}
                    onChange={field.onChange}
                    placeholder="Selecteer vrijwilligers"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="selectedRooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruimtes</FormLabel>
                  <MultiSelect
                    options={rooms.map(r => ({
                      value: r.id,
                      label: r.name
                    }))}
                    selected={field.value || []}
                    onChange={field.onChange}
                    placeholder="Selecteer ruimtes"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Startdatum</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(new Date(field.value), "EEEE d MMMM yyyy", { locale: nl })
                      ) : (
                        <span>Kies een datum</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    locale={nl}
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
            <FormItem className="flex flex-col">
              <FormLabel>Einddatum</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(new Date(field.value), "EEEE d MMMM yyyy", { locale: nl })
                      ) : (
                        <span>Kies een datum</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                    disabled={(date) => {
                      const startDate = form.getValues("startDate");
                      return date < (startDate ? new Date(startDate) : new Date());
                    }}
                    initialFocus
                    locale={nl}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-[#6BB85C] hover:bg-[#6BB85C]/90">
          {form.watch("isBulkPlanning")
            ? "Bulk Inplannen"
            : (editingPlanning ? "Planning Bijwerken" : "Inplannen")
          }
        </Button>
      </form>
    </FormComponent>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Planning</h1>
        </div>

      </div>

      <CollapsibleSection
        title="Planning Overzicht"
        icon={<CalendarDaysIcon className="h-5 w-5 text-primary" />}
        defaultOpen={true}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <CalendarDaysIcon className="h-8 w-8 text-primary/80" />
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Totaal Planningen</h3>
                    <p className="text-2xl font-bold text-primary">{plannings.length}</p>
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
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Actieve Planningen"
        icon={<Users2 className="h-5 w-5 text-primary" />}
        defaultOpen={true}
        action={
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Toevoegen
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Zoek op vrijwilliger of ruimte..."
              value={searchActive}
              onChange={(e) => setSearchActive(e.target.value)}
              className="pl-9"
            />
          </div>
          <PlanningTable
            plannings={filteredActivePlannings}
            emptyMessage="Geen actieve planningen gevonden"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Toekomstige Planningen"
        icon={<Users2 className="h-5 w-5 text-primary" />}
        defaultOpen={true}
        action={
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Toevoegen
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Zoek op vrijwilliger of ruimte..."
              value={searchUpcoming}
              onChange={(e) => setSearchUpcoming(e.target.value)}
              className="pl-9"
            />
          </div>
          <PlanningTable
            plannings={filteredUpcomingPlannings}
            emptyMessage="Geen toekomstige planningen gevonden"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Afgelopen Planningen"
        icon={<Users2 className="h-5 w-5 text-primary" />}
        defaultOpen={false}
        action={
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Toevoegen
          </Button>
        }
      >
        <PlanningTable
          plannings={pastPlannings}
          emptyMessage="Geen afgelopen planningen gevonden"
        />
      </CollapsibleSection>

      <div className="flex justify-end mt-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#6BB85C] hover:bg-[#6BB85C]/90">
              <Plus className="h-4 w-4 mr-2" />
              Inplannen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPlanning ? "Planning Bewerken" : "Vrijwilliger Inplannen"}
              </DialogTitle>
            </DialogHeader>
            <PlanningForm form={form} onSubmit={onSubmit} editingPlanning={editingPlanning} volunteers={volunteers} rooms={rooms} />
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog
        open={!!deletePlanningId}
        onOpenChange={(open) => !open && setDeletePlanningId(null)}
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