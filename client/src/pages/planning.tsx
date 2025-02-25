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
  Settings2,
  CheckSquare,
  Square,
  ChevronsUpDown,
  Check,
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { logUserAction, UserActionTypes } from "@/lib/activity-logger";

interface MaterialType {
  id: string;
  name: string;
}

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
  showActions = false,
}: {
  plannings: Planning[];
  emptyMessage: string;
  volunteers: { id: string; firstName: string; lastName: string; }[];
  rooms: { id: string; name: string; }[];
  onEdit: (planning: Planning) => void;
  onDelete: (id: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  showActions?: boolean;
}) => {
  const [selectedPlannings, setSelectedPlannings] = useState<string[]>([]);

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
              {showActions && (
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
              )}
              <TableHead>Vrijwilliger</TableHead>
              <TableHead>Ruimte</TableHead>
              <TableHead>Periode</TableHead>
              {showActions && <TableHead className="w-[120px]">Acties</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {plannings.map((planning) => {
              const volunteer = volunteers.find((v) => v.id === planning.volunteerId);
              const room = rooms.find((r) => r.id === planning.roomId);
              return (
                <TableRow
                  key={planning.id}
                  className={cn(
                    showActions && "hover:bg-muted/50"
                  )}
                >
                  {showActions && (
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
                  )}
                  <TableCell className="font-medium">
                    {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "-"}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {room ? room.name : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="whitespace-nowrap">
                        {format(new Date(planning.startDate), "EEEE d MMM yyyy", { locale: nl })}
                      </div>
                      <div className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(planning.endDate), "EEEE d MMM yyyy", { locale: nl })}
                      </div>
                    </div>
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(planning)}
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(planning.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {plannings.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={showActions ? 5 : 3}
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
      {showActions && selectedPlannings.length > 0 && (
        <div className="fixed bottom-4 right-4 flex items-center gap-3 bg-white p-4 rounded-lg shadow-lg border animate-in slide-in-from-bottom-2">
          <span className="text-sm text-muted-foreground">
            {selectedPlannings.length} geselecteerd
          </span>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="destructive"
            onClick={() => {
              selectedPlannings.forEach(id => onDelete(id));
              setSelectedPlannings([]);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Verwijderen
          </Button>
        </div>
      )}
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
  const [volunteerSearch, setVolunteerSearch] = useState("");

  const filteredVolunteers = volunteers.filter(volunteer =>
    `${volunteer.firstName} ${volunteer.lastName}`
      .toLowerCase()
      .includes(volunteerSearch.toLowerCase())
  );

  const isBulkPlanning = form.watch("isBulkPlanning");
  const selectedVolunteers = form.watch("selectedVolunteers") || [];
  const selectedRooms = form.watch("selectedRooms") || [];

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
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            <span>
                              {volunteers.find(v => v.id === field.value)?.firstName} {volunteers.find(v => v.id === field.value)?.lastName}
                            </span>
                          ) : (
                            <span>Selecteer vrijwilliger</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start" style={{ maxHeight: '60vh' }}>
                      <Command className="max-h-full">
                        <CommandInput
                          placeholder="Zoek vrijwilliger..."
                          value={volunteerSearch}
                          onValueChange={setVolunteerSearch}
                          className="h-9 border-none focus:ring-0"
                        />
                        <CommandEmpty>Geen vrijwilligers gevonden.</CommandEmpty>
                        <CommandGroup className="max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                          {filteredVolunteers.map((volunteer) => (
                            <CommandItem
                              key={volunteer.id}
                              value={`${volunteer.firstName} ${volunteer.lastName}`}
                              onSelect={() => {
                                field.onChange(volunteer.id);
                              }}
                              className="flex items-center justify-between py-2 px-2 cursor-pointer hover:bg-accent"
                            >
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === volunteer.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {volunteer.firstName} {volunteer.lastName}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                    <SelectContent className="max-h-[40vh] overflow-y-auto">
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value?.length && "text-muted-foreground"
                        )}
                      >
                        <span className="truncate">
                          {(field.value || []).length === 0
                            ? "Selecteer vrijwilligers..."
                            : `${(field.value || []).length} vrijwilliger(s) geselecteerd`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start" style={{ maxHeight: '60vh' }}>
                      <Command className="max-h-full">
                        <CommandInput
                          placeholder="Zoek vrijwilligers..."
                          value={volunteerSearch}
                          onValueChange={setVolunteerSearch}
                          className="h-9 border-none focus:ring-0"
                        />
                        <CommandEmpty>Geen vrijwilligers gevonden.</CommandEmpty>
                        <CommandGroup className="max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                          {filteredVolunteers.map(volunteer => (
                            <CommandItem
                              key={volunteer.id}
                              onSelect={() => {
                                const currentSelected = field.value || [];
                                const newSelected = currentSelected.includes(volunteer.id)
                                  ? currentSelected.filter(id => id !== volunteer.id)
                                  : [...currentSelected, volunteer.id];
                                field.onChange(newSelected);
                              }}
                              className="flex items-center justify-between py-2 px-2 cursor-pointer hover:bg-accent"
                            >
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    (field.value || []).includes(volunteer.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {volunteer.firstName} {volunteer.lastName}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                  <Select
                    multiple
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer ruimtes">
                          {field.value?.length
                            ? `${field.value.length} ruimte(s) geselecteerd`
                            : "Selecteer ruimtes"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[40vh] overflow-y-auto">
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedRooms.length > 0 && (
                      `${selectedRooms.length} ${selectedRooms.length === 1 ? 'ruimte' : 'ruimtes'} geselecteerd`
                    )}
                  </div>
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
                      if (!form.getValues("startDate")) return true;
                      const minDate = parseISO(form.getValues("startDate"));
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
          disabled={isBulkPlanning && selectedRooms.length === 0 && selectedVolunteers.length === 0}
        >
          {isBulkPlanning
            ? `${selectedRooms.length === 0 && selectedVolunteers.length === 0 ? 'Selecteer vrijwilligers en ruimtes' : `${selectedVolunteers.length * selectedRooms.length} Planning${selectedVolunteers.length * selectedRooms.length === 1 ? '' : 'en'} Toevoegen`}`
            : (editingPlanning ? "Planning Bijwerken" : "Inplannen")
          }
        </Button>
      </form>
    </FormComponent>
  );
};

const PlanningSection = ({ title, icon, defaultOpen, children }: {
  title: string;
  icon: React.ReactNode;
  defaultOpen: boolean;
  children: React.ReactNode;
}) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      defaultOpen={defaultOpen}
      action={
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(!isEditing);
          }}
          className={cn(
            "h-8 w-8",
            isEditing && "text-primary bg-primary/10"
          )}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      }
    >
      <div className="relative">
        <div className={cn(
          "space-y-4",
          isEditing && "invisible"
        )}>
          {children}
        </div>
        {isEditing && (
          <div className="absolute inset-0">
            {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child as React.ReactElement, {
                  showActions: true
                });
              }
              return child;
            })}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};

const Planning = () => {
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

  const showToast = (title: string, description: string, variant: "default" | "success" | "destructive" | "info" = "default") => {
    toast({
      title,
      description,
      duration: 3000,
      variant,
    });
  };

  const onSubmit = async (data: z.infer<typeof planningSchema>) => {
    try {
      if (data.isBulkPlanning) {
        const volunteers = data.selectedVolunteers || [];
        const rooms = data.selectedRooms || [];

        for (const volunteerId of volunteers) {
          for (const roomId of rooms) {
            const volunteer = volunteers.find(v => v.id === volunteerId);
            const room = rooms.find(r => r.id === roomId);

            await push(ref(db, "plannings"), {
              volunteerId,
              roomId,
              startDate: data.startDate,
              endDate: data.endDate,
            });

            await logUserAction(
              UserActionTypes.PLANNING_CREATE,
              `Bulk planning toegevoegd voor ${volunteer?.firstName} ${volunteer?.lastName} in ${room?.name}`,
              {
                type: "planning",
                id: volunteerId + "_" + roomId,
                name: `${volunteer?.firstName} ${volunteer?.lastName} - ${room?.name}`
              }
            );
          }
        }

        showToast(
          "Planningen Toegevoegd",
          `${volunteers.length * rooms.length} planningen zijn succesvol toegevoegd`,
          "success"
        );
      } else {
        const volunteer = volunteers.find(v => v.id === data.volunteerId);
        const room = rooms.find(r => r.id === data.roomId);

        if (editingPlanning) {
          await update(ref(db, `plannings/${editingPlanning.id}`), data);
          await logUserAction(
            UserActionTypes.PLANNING_UPDATE,
            `Planning bijgewerkt voor ${volunteer?.firstName} ${volunteer?.lastName} in ${room?.name}`,
            {
              type: "planning",
              id: editingPlanning.id,
              name: `${volunteer?.firstName} ${volunteer?.lastName} - ${room?.name}`
            }
          );
          showToast(
            "Planning Bijgewerkt",
            "De planning is succesvol bijgewerkt",
            "success"
          );
        } else {
          const newPlanningRef = await push(ref(db, "plannings"), data);
          await logUserAction(
            UserActionTypes.PLANNING_CREATE,
            `Nieuwe planning toegevoegd voor ${volunteer?.firstName} ${volunteer?.lastName} in ${room?.name}`,
            {
              type: "planning",
              id: newPlanningRef.key!,
              name: `${volunteer?.firstName} ${volunteer?.lastName} - ${room?.name}`
            }
          );
          showToast(
            "Planning Toegevoegd",
            "De nieuwe planning is succesvol toegevoegd",
            "success"
          );
        }
      }

      form.reset();
      setEditingPlanning(null);
      setDialogOpen(false);
    } catch (error) {
      showToast(
        "Fout",
        "Kon planning niet opslaan",
        "destructive"
      );
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
      const planning = plannings.find(p => p.id === id);
      if (!planning) return;

      const volunteer = volunteers.find(v => v.id === planning.volunteerId);
      const room = rooms.find(r => r.id === planning.roomId);

      await remove(ref(db, `plannings/${id}`));
      await logUserAction(
        UserActionTypes.PLANNING_DELETE,
        `Planning verwijderd voor ${volunteer?.firstName} ${volunteer?.lastName} in ${room?.name}`,
        {
          type: "planning",
          id: id,
          name: `${volunteer?.firstName} ${volunteer?.lastName} - ${room?.name}`
        }
      );
      showToast(
        "Planning Verwijderd",
        "De planning is succesvol verwijderd",
        "info"
      );
      setDeletePlanningId(null);
    } catch (error) {      showToast(
        "Fout",
        "Er is een fout opgetreden bij het verwijderen van de planning",
        "destructive"
      );
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
    return acc;  }, { activePlannings: [], upcomingPlannings: [], pastPlannings: [] });

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

      <PlanningSection
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
          onDelete={handleDelete}
          searchValue={searchActive}
          onSearchChange={setSearchActive}
        />
      </PlanningSection>

      <PlanningSection
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
          onDelete={handleDelete}
          searchValue={searchUpcoming}
          onSearchChange={setSearchUpcoming}
        />
      </PlanningSection>

      <PlanningSection
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
          onDelete={handleDelete}
          searchValue={searchPast}
          onSearchChange={setSearchPast}
        />
      </PlanningSection>

      <AlertDialog
        open={!!deletePlanningId}
        onOpenChange={() => setDeletePlanningId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePlanningId && handleDelete(deletePlanningId)}
              className="bg-red-600 hover:bgred-700"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Planning;