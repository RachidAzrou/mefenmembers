import { useState, useEffect } from "react";
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
  Building,
  Search,
  Users2,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";
import { Form as FormComponent, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, isValid, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { useRole } from "@/hooks/use-role";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";

const planningSchema = z.object({
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht").optional(),
  roomId: z.string().min(1, "Ruimte is verplicht").optional(),
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().min(1, "Einddatum is verplicht"),
  isBulkPlanning: z.boolean().optional(),
  selectedVolunteers: z.array(z.string()).optional(),
  selectedRooms: z.array(z.string()).optional(),
}).refine((data) => {
  const start = parseISO(data.startDate);
  const end = parseISO(data.endDate);
  return isValid(start) && isValid(end) && end >= start;
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

const PlanningTable = ({
  plannings,
  emptyMessage,
  volunteers,
  rooms,
  onEdit,
  onDelete,
  searchValue,
  onSearchChange,
}: {
  plannings: Planning[];
  emptyMessage: string;
  volunteers: { id: string; firstName: string; lastName: string; }[];
  rooms: { id: string; name: string; }[];
  onEdit: (planning: Planning) => void;
  onDelete: (id: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Zoek op vrijwilliger of ruimte..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vrijwilliger</TableHead>
              <TableHead>Ruimte</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead className="w-[120px]">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plannings.map((planning) => {
              const volunteer = volunteers.find((v) => v.id === planning.volunteerId);
              const room = rooms.find((r) => r.id === planning.roomId);
              return (
                <TableRow
                  key={planning.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onEdit(planning)}
                >
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
                          onEdit(planning);
                        }}
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(planning.id);
                        }}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
    </div>
  );
};

const PlanningForm = ({ form, onSubmit, editingPlanning, volunteers, rooms }: {
  form: ReturnType<typeof useForm<z.infer<typeof planningSchema>>>;
  onSubmit: (data: z.infer<typeof planningSchema>) => Promise<void>;
  editingPlanning: Planning | null;
  volunteers: { id: string; firstName: string; lastName: string; }[];
  rooms: { id: string; name: string; }[];
}) => {
  const isBulkPlanning = form.watch("isBulkPlanning");
  const selectedVolunteers = form.watch("selectedVolunteers") || [];
  const selectedRooms = form.watch("selectedRooms") || [];
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  const totalPlannings = selectedVolunteers.length * selectedRooms.length;

  return (
    <FormComponent {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center space-x-2 pb-4 border-b">
          <Switch
            checked={isBulkPlanning}
            onCheckedChange={(checked) => {
              form.setValue("isBulkPlanning", checked);
              if (!checked) {
                form.setValue("selectedVolunteers", []);
                form.setValue("selectedRooms", []);
              }
              form.setValue("volunteerId", undefined);
              form.setValue("roomId", undefined);
            }}
          />
          <Label>Bulk Inplannen</Label>
        </div>

        {!isBulkPlanning ? (
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
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedVolunteers.length > 0 && (
                      `${selectedVolunteers.length} ${selectedVolunteers.length === 1 ? 'vrijwilliger' : 'vrijwilligers'} geselecteerd`
                    )}
                  </div>
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
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedRooms.length > 0 && (
                      `${selectedRooms.length} ${selectedRooms.length === 1 ? 'ruimte' : 'ruimtes'} geselecteerd`
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {totalPlannings > 0 && (
              <div className="text-sm text-muted-foreground bg-primary/5 p-2 rounded">
                {`Er ${totalPlannings === 1 ? 'wordt' : 'worden'} ${totalPlannings} planning${totalPlannings === 1 ? '' : 'en'} aangemaakt`}
              </div>
            )}
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
                        format(parseISO(field.value), "EEEE d MMMM yyyy", { locale: nl })
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
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const formattedDate = format(date, 'yyyy-MM-dd');
                        field.onChange(formattedDate);

                        // Als de einddatum voor de nieuwe startdatum ligt, reset deze
                        const endDate = form.getValues("endDate");
                        if (endDate && parseISO(endDate) < parseISO(formattedDate)) {
                          form.setValue("endDate", formattedDate);
                        }
                      }
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      date.setHours(0, 0, 0, 0);
                      return date < today;
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
                        format(parseISO(field.value), "EEEE d MMMM yyyy", { locale: nl })
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
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        field.onChange(format(date, 'yyyy-MM-dd'));
                      }
                    }}
                    disabled={(date) => {
                      if (!startDate) return true;
                      const minDate = parseISO(startDate);
                      minDate.setHours(0, 0, 0, 0);
                      date.setHours(0, 0, 0, 0);
                      return date < minDate;
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

        <Button
          type="submit"
          className="w-full bg-[#6BB85C] hover:bg-[#6BB85C]/90"
          disabled={isBulkPlanning && totalPlannings === 0}
        >
          {isBulkPlanning
            ? `${totalPlannings === 0 ? 'Selecteer vrijwilligers en ruimtes' : `${totalPlannings} Planning${totalPlannings === 1 ? '' : 'en'} Toevoegen`}`
            : (editingPlanning ? "Planning Bijwerken" : "Inplannen")
          }
        </Button>
      </form>
    </FormComponent>
  );
};

export default function Planning() {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [volunteers, setVolunteers] = useState<{ id: string; firstName: string; lastName: string; }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string; }[]>([]);
  const [editingPlanning, setEditingPlanning] = useState<Planning | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletePlanningId, setDeletePlanningId] = useState<string | null>(null);
  const [searchActive, setSearchActive] = useState("");
  const [searchUpcoming, setSearchUpcoming] = useState("");
  const [searchPast, setSearchPast] = useState("");
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

  useEffect(() => {
    const volunteersRef = ref(db, "volunteers");
    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]: [string, any]) => ({
        id,
        ...volunteer
      })) : [];
      setVolunteers(volunteersList);
    });

    const roomsRef = ref(db, "rooms");
    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data).map(([id, room]: [string, any]) => ({
        id,
        ...room
      })) : [];
      setRooms(roomsList);
    });

    const planningsRef = ref(db, "plannings");
    onValue(planningsRef, (snapshot) => {
      const data = snapshot.val();
      const planningsList = data ? Object.entries(data).map(([id, planning]: [string, any]) => ({
        id,
        ...planning
      })) : [];
      setPlannings(planningsList);
    });
  }, []);

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
  const filteredPastPlannings = filterPlannings(pastPlannings, searchPast);

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

      <div className="flex justify-end mt-6 mb-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#6BB85C] hover:bg-[#6BB85C]/90">
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Planning
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPlanning ? "Planning Bewerken" : "Nieuwe Planning"}
              </DialogTitle>
            </DialogHeader>
            <PlanningForm form={form} onSubmit={onSubmit} editingPlanning={editingPlanning} volunteers={volunteers} rooms={rooms} />
          </DialogContent>
        </Dialog>
      </div>

      <CollapsibleSection
        title="Actieve Planningen"
        icon={<Users2 className="h-5 w-5 text-primary" />}
        defaultOpen={true}
      >
        <PlanningTable
          plannings={filteredActivePlannings}
          emptyMessage="Geen actieve planningen gevonden"
          volunteers={volunteers}
          rooms={rooms}
          onEdit={handleEdit}
          onDelete={setDeletePlanningId}
          searchValue={searchActive}
          onSearchChange={setSearchActive}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Toekomstige Planningen"
        icon={<Users2 className="h-5 w-5 text-primary" />}
        defaultOpen={true}
      >
        <PlanningTable
          plannings={filteredUpcomingPlannings}
          emptyMessage="Geen toekomstige planningen gevonden"
          volunteers={volunteers}
          rooms={rooms}
          onEdit={handleEdit}
          onDelete={setDeletePlanningId}
          searchValue={searchUpcoming}
          onSearchChange={setSearchUpcoming}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Afgelopen Planningen"
        icon={<Users2 className="h-5 w-5 text-primary" />}
        defaultOpen={false}
      >
        <PlanningTable
          plannings={filteredPastPlannings}
          emptyMessage="Geen afgelopen planningen gevonden"
          volunteers={volunteers}
          rooms={rooms}
          onEdit={handleEdit}
          onDelete={setDeletePlanningId}
          searchValue={searchPast}
          onSearchChange={setSearchPast}
        />
      </CollapsibleSection>

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