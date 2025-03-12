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
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { UseFormReturn } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

interface Planning {
  id?: string;
  roomId: string;
  volunteerId: string;
  startDate: string;
  endDate: string;
  isResponsible: boolean;
}

const planningSchema = z.object({
  volunteerId: z.string().optional(),
  roomId: z.string().optional(),
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().min(1, "Einddatum is verplicht"),
  isBulkPlanning: z.boolean().default(false),
  selectedVolunteers: z.array(z.string()).default([]),
  selectedRooms: z.string().optional(),
  isResponsible: z.boolean().default(false),
  responsibleVolunteerId: z.string().optional()
});

type PlanningFormProps = {
  volunteers: { id: string; firstName: string; lastName: string; }[];
  rooms: { id: string; name: string; }[];
  onSubmit: (data: { plannings: Planning[] }) => Promise<void>;
  onClose: () => void;
  form: UseFormReturn<z.infer<typeof planningSchema>>;
  editingPlanning: Planning | null;
  plannings: Planning[];
};

const PlanningForm = ({
  volunteers,
  rooms,
  onSubmit,
  onClose,
  form,
  editingPlanning,
  plannings = []
}: PlanningFormProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showResponsibleAlert, setShowResponsibleAlert] = useState(false);
  const [currentResponsible, setCurrentResponsible] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      const existingResponsible = plannings?.find(
        p => p.roomId === selectedRoomId &&
            p.isResponsible &&
            (!editingPlanning || p.id !== editingPlanning.id) &&
            p.startDate === startDate
      );

      if (existingResponsible) {
        const responsible = volunteers.find(v => v.id === existingResponsible.volunteerId);
        if (responsible) {
          setCurrentResponsible(responsible);
          setShowResponsibleAlert(true);
        }
      }
    }
  }, [isResponsible, selectedRoomId, startDate, plannings, editingPlanning?.id, volunteers]);

  const handleFormSubmit = async (data: z.infer<typeof planningSchema>) => {
    try {
      setIsSubmitting(true);
      setFormError(null);

      if (!data.startDate || !data.endDate) {
        setFormError("Start- en einddatum zijn verplicht");
        return;
      }

      if (data.isBulkPlanning) {
        if (!data.selectedVolunteers?.length) {
          setFormError("Selecteer ten minste één vrijwilliger");
          return;
        }
        if (!data.selectedRooms) {
          setFormError("Selecteer een ruimte");
          return;
        }

        const plannings: Planning[] = [];
        for (const volunteerId of data.selectedVolunteers) {
          plannings.push({
            roomId: data.selectedRooms,
            volunteerId,
            startDate: data.startDate,
            endDate: data.endDate,
            isResponsible: data.responsibleVolunteerId === volunteerId
          });
        }

        await onSubmit({ plannings });
      } else {
        if (!data.volunteerId) {
          setFormError("Selecteer een vrijwilliger");
          return;
        }
        if (!data.roomId) {
          setFormError("Selecteer een ruimte");
          return;
        }

        const planning: Planning = {
          roomId: data.roomId,
          volunteerId: data.volunteerId,
          startDate: data.startDate,
          endDate: data.endDate,
          isResponsible: data.isResponsible
        };

        await onSubmit({ plannings: [planning] });
      }

      form.reset();
      setSearchTerm("");
      onClose();
    } catch (error) {
      console.error("Form submission error:", error);
      setFormError(error instanceof Error ? error.message : "Er is een fout opgetreden bij het opslaan van de planning");
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
                  form.setValue("selectedRooms", undefined);
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
          <FormField
            control={form.control}
            name={isBulkPlanning ? "selectedRooms" : "roomId"}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Ruimte</FormLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (isBulkPlanning) {
                      form.setValue("responsibleVolunteerId", undefined);
                    } else {
                      form.setValue("isResponsible", false);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecteer ruimte" />
                  </SelectTrigger>
                  <SelectContent side="bottom" position="popper" className="w-[var(--radix-select-trigger-width)]">
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id} className="flex items-center justify-between py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Check className={cn("h-4 w-4 flex-shrink-0", field.value === room.id ? "opacity-100" : "opacity-0")} />
                          <span>{room.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {(isBulkPlanning ? form.watch("selectedRooms") : selectedRoomId) && (
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
                    <SelectContent side="bottom" position="popper" className="w-[var(--radix-select-trigger-width)]">
                      <div className="sticky top-0 px-2 py-2 bg-white border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Zoek vrijwilliger..."
                            value={searchTerm}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSearchTerm(e.target.value);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-9 h-9 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-[300px]">
                        {volunteers
                          .filter(volunteer => {
                            const fullName = `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase();
                            return fullName.includes(searchTerm.toLowerCase());
                          })
                          .map((volunteer) => (
                            <SelectItem key={volunteer.id} value={volunteer.id} className="flex items-center justify-between py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <Check className={cn("h-4 w-4 flex-shrink-0", (isBulkPlanning ? field.value?.includes(volunteer.id) : field.value === volunteer.id) ? "opacity-100" : "opacity-0")} />
                                <span>
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
                          <div key={id} className="bg-[#963E56]/10 text-[#963E56] text-sm rounded-full px-3 py-1 flex items-center gap-2">
                            <span>{volunteer.firstName} {volunteer.lastName}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => {
                              const newValue = field.value?.filter(v => v !== id);
                              field.onChange(newValue);
                              if (form.getValues("responsibleVolunteerId") === id) {
                                form.setValue("responsibleVolunteerId", undefined);
                              }
                            }}>
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecteer verantwoordelijke" />
                    </SelectTrigger>
                    <SelectContent side="bottom" position="popper" className="w-[var(--radix-select-trigger-width)]">
                      {volunteers
                        .filter(volunteer => form.watch("selectedVolunteers")?.includes(volunteer.id))
                        .map((volunteer) => (
                          <SelectItem key={volunteer.id} value={volunteer.id} className="flex items-center justify-between py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <Check className={cn("h-4 w-4 flex-shrink-0", field.value === volunteer.id ? "opacity-100" : "opacity-0")} />
                              <span>
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

          {selectedRoomId && selectedVolunteerId && !isBulkPlanning && (
            <FormField
              control={form.control}
              name="isResponsible"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-[#963E56]" />
                  <Label className="text-sm flex items-center gap-1">
                    <UserCircle2 className="h-4 w-4" />
                    Verantwoordelijke
                  </Label>
                </div>
              )}
            />
          )}

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
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(new Date(field.value), "d MMM yyyy", { locale: nl }) : <span>Kies een datum</span>}
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
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(new Date(field.value), "d MMM yyyy", { locale: nl }) : <span>Kies een datum</span>}
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

        {formError && <div className="text-red-500 text-sm">{formError}</div>}

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="ghost" onClick={onClose} className="text-sm">
            Annuleren
          </Button>
          <Button type="submit" className="bg-[#963E56] hover:bg-[#963E56]/90 text-white text-sm" disabled={isSubmitting}>
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