import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Search, X, UserCircle2, CalendarIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { UseFormReturn } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
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

interface Planning {
  id: string;
  roomId: string;
  volunteerId: string;
  startDate: string;
  endDate: string;
  isResponsible: boolean;
}

const planningSchema = z.object({
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht").optional(),
  roomId: z.string().min(1, "Ruimte is verplicht").optional(),
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().min(1, "Einddatum is verplicht"),
  isBulkPlanning: z.boolean().default(false),
  selectedVolunteers: z.array(z.string()).default([]),
  selectedRooms: z.array(z.string()).default([]),
  isResponsible: z.boolean().default(false),
  responsibleVolunteerId: z.string().optional()
});

interface PlanningFormProps {
  volunteers: { id: string; firstName: string; lastName: string; }[];
  rooms: { id: string; name: string; }[];
  onSubmit: (data: z.infer<typeof planningSchema>) => Promise<void>;
  onClose: () => void;
  form: UseFormReturn<z.infer<typeof planningSchema>>;
  editingPlanning: Planning | null;
  plannings: Planning[];
}

const PlanningForm = ({
  volunteers,
  rooms,
  onSubmit,
  onClose,
  form,
  editingPlanning,
  plannings
}: PlanningFormProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showResponsibleAlert, setShowResponsibleAlert] = useState(false);
  const [currentResponsible, setCurrentResponsible] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBulkPlanning = form.watch("isBulkPlanning");
  const selectedRoomId = form.watch("roomId");
  const selectedVolunteerId = form.watch("volunteerId");
  const startDate = form.watch("startDate");
  const isResponsible = form.watch("isResponsible");

  useEffect(() => {
    setShowResponsibleAlert(false);
    setCurrentResponsible(null);
  }, [selectedRoomId, selectedVolunteerId]);

  useEffect(() => {
    if (selectedRoomId && startDate && isResponsible) {
      const existingResponsible = plannings.find(
        p => p.roomId === selectedRoomId &&
            p.isResponsible &&
            (!editingPlanning || p.id !== editingPlanning.id) &&
            parseISO(p.startDate) <= parseISO(startDate) &&
            parseISO(p.endDate) >= parseISO(startDate)
      );

      if (existingResponsible) {
        const responsible = volunteers.find(v => v.id === existingResponsible.volunteerId);
        if (responsible) {
          setCurrentResponsible(responsible);
          setShowResponsibleAlert(true);
        }
      }
    }
  }, [isResponsible]);

  const handleFormSubmit = async (data: z.infer<typeof planningSchema>) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } catch (error: unknown) {
      console.error("Form submission error:", error);
      toast({
        variant: "destructive",
        title: "Fout",
        description: error instanceof Error ? error.message : "Er is een fout opgetreden bij het opslaan van de planning"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {!editingPlanning && (
          <div className="flex items-center space-x-2 pb-4">
            <Switch
              checked={isBulkPlanning}
              onCheckedChange={(checked) => {
                form.setValue("isBulkPlanning", checked);
                if (!checked) {
                  form.setValue("selectedVolunteers", []);
                  form.setValue("selectedRooms", []);
                  form.setValue("responsibleVolunteerId", undefined);
                }
                form.setValue("volunteerId", undefined);
                form.setValue("roomId", undefined);
                form.setValue("isResponsible", false);
              }}
              className="data-[state=checked]:bg-[#963E56]"
            />
            <Label className="text-sm">Bulk Inplannen</Label>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Ruimte Selectie */}
          <FormField
            control={form.control}
            name={isBulkPlanning ? "selectedRooms" : "roomId"}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Ruimte</FormLabel>
                <Select
                  value={isBulkPlanning ? field.value?.[0] || "" : field.value}
                  onValueChange={(value) => {
                    if (isBulkPlanning) {
                      const current = field.value || [];
                      const updated = current.includes(value)
                        ? current.filter(id => id !== value)
                        : [...current, value];
                      field.onChange(updated);
                    } else {
                      field.onChange(value);
                      form.setValue("isResponsible", false);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecteer ruimte" />
                  </SelectTrigger>
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

          {/* Vrijwilliger Selectie */}
          {(selectedRoomId || (isBulkPlanning && form.watch("selectedRooms")?.length > 0)) && (
            <FormField
              control={form.control}
              name={isBulkPlanning ? "selectedVolunteers" : "volunteerId"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Vrijwilliger{isBulkPlanning ? 's' : ''}</FormLabel>
                  <Select
                    value={isBulkPlanning ? field.value?.[0] || "" : field.value}
                    onValueChange={(value) => {
                      if (isBulkPlanning) {
                        const current = field.value || [];
                        const updated = current.includes(value)
                          ? current.filter(id => id !== value)
                          : [...current, value];
                        field.onChange(updated);
                        // Reset verantwoordelijke als die niet meer in de selectie zit
                        const responsibleId = form.getValues("responsibleVolunteerId");
                        if (responsibleId && !updated.includes(responsibleId)) {
                          form.setValue("responsibleVolunteerId", undefined);
                        }
                      } else {
                        field.onChange(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Selecteer vrijwilliger${isBulkPlanning ? 's' : ''}`}>
                        {isBulkPlanning && field.value?.length > 0
                          ? `${field.value.length} vrijwilliger(s) geselecteerd`
                          : `Selecteer vrijwilliger${isBulkPlanning ? 's' : ''}`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent forceMount side="bottom" align="start" className="w-[var(--radix-select-trigger-width)]">
                      <div className="sticky top-0 px-2 py-2 bg-white border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Zoek vrijwilliger..."
                            value={searchTerm}
                            onChange={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSearchTerm(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="w-full pl-9 h-9 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <div className="pt-1 max-h-[300px] overflow-y-auto">
                        {volunteers
                          .filter((volunteer) => {
                            const fullName = `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase();
                            return fullName.includes(searchTerm.toLowerCase());
                          })
                          .map((volunteer) => (
                            <SelectItem
                              key={volunteer.id}
                              value={volunteer.id}
                              className="flex items-center justify-between py-2.5 px-3 cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="flex items-center gap-2">
                                <Check
                                  className={cn(
                                    "h-4 w-4 flex-shrink-0",
                                    (isBulkPlanning
                                      ? field.value?.includes(volunteer.id)
                                      : field.value === volunteer.id)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <span className="flex-grow">
                                  {volunteer.firstName} {volunteer.lastName}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </div>
                    </SelectContent>
                  </Select>
                  {isBulkPlanning && field.value?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {field.value.map(id => {
                        const volunteer = volunteers.find(v => v.id === id);
                        return volunteer && (
                          <div
                            key={id}
                            className="bg-[#963E56]/10 text-[#963E56] text-sm rounded-full px-3 py-1 flex items-center gap-2"
                          >
                            <span>{volunteer.firstName} {volunteer.lastName}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => {
                                const newValue = field.value?.filter(v => v !== id);
                                field.onChange(newValue);
                                // Reset verantwoordelijke als die verwijderd wordt
                                if (form.getValues("responsibleVolunteerId") === id) {
                                  form.setValue("responsibleVolunteerId", undefined);
                                }
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Verantwoordelijke Selectie voor Bulk Planning */}
          {isBulkPlanning && form.watch("selectedVolunteers")?.length > 0 && (
            <FormField
              control={form.control}
              name="responsibleVolunteerId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircle2 className="h-4 w-4" />
                    <FormLabel className="text-sm">Verantwoordelijke</FormLabel>
                  </div>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecteer verantwoordelijke" />
                    </SelectTrigger>
                    <SelectContent forceMount side="bottom" align="start" className="w-[var(--radix-select-trigger-width)]">
                      {volunteers
                        .filter(volunteer => form.watch("selectedVolunteers")?.includes(volunteer.id))
                        .map((volunteer) => (
                          <SelectItem
                            key={volunteer.id}
                            value={volunteer.id}
                            className="flex items-center justify-between py-2.5 px-3 cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                className={cn(
                                  "h-4 w-4 flex-shrink-0",
                                  field.value === volunteer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="flex-grow">
                                {volunteer.firstName} {volunteer.lastName}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Verantwoordelijke Switch voor Normale Planning */}
          {selectedRoomId && selectedVolunteerId && !isBulkPlanning && (
            <FormField
              control={form.control}
              name="isResponsible"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-[#963E56]"
                  />
                  <Label className="text-sm flex items-center gap-1">
                    <UserCircle2 className="h-4 w-4" />
                    Verantwoordelijke
                  </Label>
                </div>
              )}
            />
          )}

          {/* Datums */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            format(new Date(field.value), "d MMM yyyy", { locale: nl })
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
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(format(date, 'yyyy-MM-dd'));
                          }
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
                            format(new Date(field.value), "d MMM yyyy", { locale: nl })
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
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(format(date, 'yyyy-MM-dd'));
                          }
                        }}
                        disabled={(date) => {
                          const startDate = form.getValues("startDate");
                          if (!startDate) return true;
                          return date < new Date(startDate);
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
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-sm"
          >
            Annuleren
          </Button>
          <Button
            type="submit"
            className="bg-[#963E56] hover:bg-[#963E56]/90 text-white text-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Bezig met opslaan...</span>
              </>
            ) : (
              editingPlanning ? "Planning Bijwerken" : "Planning Opslaan"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PlanningForm;