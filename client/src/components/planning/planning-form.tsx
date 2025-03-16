import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Check, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { UseFormReturn } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

const planningSchema = z.object({
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().min(1, "Einddatum is verplicht"),
  isBulkPlanning: z.boolean().default(false),
  selectedVolunteers: z.array(z.string()).default([]),
  selectedRoomId: z.string().min(1, "Selecteer een ruimte").optional(),
  volunteerId: z.string().min(1, "Selecteer een vrijwilliger").optional(),
  roomId: z.string().min(1, "Selecteer een ruimte").optional(),
});

interface PlanningFormProps {
  volunteers: { id: string; firstName: string; lastName: string }[];
  rooms: { id: string; name: string }[];
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
  form: UseFormReturn<z.infer<typeof planningSchema>>;
  editingPlanning: any | null;
}

export function PlanningForm({
  volunteers,
  rooms,
  onSubmit,
  onClose,
  form,
  editingPlanning
}: PlanningFormProps) {
  const { toast } = useToast();
  const isBulkPlanning = form.watch("isBulkPlanning");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = async (data: z.infer<typeof planningSchema>) => {
    try {
      if (isBulkPlanning) {
        if (!data.selectedRoomId) {
          toast({
            title: "Fout",
            description: "Selecteer een ruimte",
            variant: "destructive",
          });
          return;
        }
        if (!data.selectedVolunteers?.length) {
          toast({
            title: "Fout",
            description: "Selecteer ten minste één vrijwilliger",
            variant: "destructive",
          });
          return;
        }

        const plannings = data.selectedVolunteers.map(volunteerId => ({
          roomId: data.selectedRoomId,
          volunteerId: volunteerId,
          startDate: data.startDate,
          endDate: data.endDate
        }));

        await onSubmit({ plannings });
      } else {
        if (!data.volunteerId) {
          toast({
            title: "Fout",
            description: "Selecteer een vrijwilliger",
            variant: "destructive",
          });
          return;
        }
        if (!data.roomId) {
          toast({
            title: "Fout",
            description: "Selecteer een ruimte",
            variant: "destructive",
          });
          return;
        }

        const planning = {
          roomId: data.roomId,
          volunteerId: data.volunteerId,
          startDate: data.startDate,
          endDate: data.endDate
        };

        await onSubmit({ plannings: [planning] });
      }

      form.reset();
      setSearchTerm("");
      onClose();
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het opslaan van de planning",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {!editingPlanning && (
          <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-border">
            <Switch
              checked={isBulkPlanning}
              onCheckedChange={(checked) => {
                form.setValue("isBulkPlanning", checked);
                if (checked) {
                  form.setValue("selectedVolunteers", []);
                  form.setValue("selectedRoomId", "");
                  form.setValue("volunteerId", undefined);
                  form.setValue("roomId", undefined);
                } else {
                  form.setValue("selectedVolunteers", []);
                  form.setValue("selectedRoomId", undefined);
                  form.setValue("volunteerId", "");
                  form.setValue("roomId", "");
                }
              }}
              className="data-[state=checked]:bg-[#963E56]"
            />
            <Label className="text-sm">Bulk Inplannen</Label>
          </div>
        )}

        {/* Room Selection */}
        <FormField
          control={form.control}
          name={isBulkPlanning ? "selectedRoomId" : "roomId"}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Ruimte</FormLabel>
              <Select
                value={field.value || ""}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecteer een ruimte" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={8}
                >
                  {rooms.map((room) => (
                    <SelectItem
                      key={room.id}
                      value={room.id}
                    >
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            field.value === room.id ? "opacity-100" : "opacity-0"
                          )}
                        />
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

        {/* Volunteer Selection */}
        {((isBulkPlanning && form.watch("selectedRoomId")) || (!isBulkPlanning && form.watch("roomId"))) && (
          <FormField
            control={form.control}
            name={isBulkPlanning ? "selectedVolunteers" : "volunteerId"}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  Vrijwilliger{isBulkPlanning ? 's' : ''}
                </FormLabel>
                <Select
                  value={isBulkPlanning ? field.value?.[0] || "" : field.value || ""}
                  onValueChange={(value) => {
                    if (isBulkPlanning) {
                      const current = field.value || [];
                      const updated = current.includes(value)
                        ? current.filter(id => id !== value)
                        : [...current, value];
                      field.onChange(updated);
                    } else {
                      field.onChange(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {isBulkPlanning
                        ? field.value?.length
                          ? `${field.value.length} vrijwilliger(s) geselecteerd`
                          : "Selecteer vrijwilligers"
                        : "Selecteer vrijwilliger"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={8}
                  >
                    <div className="sticky top-0 p-2 bg-white border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="text"
                          placeholder="Zoek vrijwilliger..."
                          value={searchTerm}
                          onKeyDown={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSearchTerm(e.target.value);
                          }}
                          className="pl-9 h-9"
                        />
                      </div>
                    </div>
                    <div className="pt-1">
                      {volunteers
                        .filter(volunteer => {
                          const fullName = `${volunteer.firstName} ${volunteer.lastName}`.toLowerCase();
                          return fullName.includes(searchTerm.toLowerCase());
                        })
                        .map((volunteer) => (
                          <SelectItem
                            key={volunteer.id}
                            value={volunteer.id}
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                className={cn(
                                  "h-4 w-4 flex-shrink-0",
                                  isBulkPlanning
                                    ? (field.value || []).includes(volunteer.id)
                                      ? "opacity-100"
                                      : "opacity-0"
                                    : field.value === volunteer.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                )}
                              />
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
                              field.onChange(field.value?.filter(v => v !== id));
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

        {/* Date Selection */}
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

        <div className="flex justify-end gap-3 pt-6">
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
            className="bg-[#963E56] hover:bg-[#963E56]/90 text-sm"
          >
            {editingPlanning ? "Planning Bijwerken" : "Planning Opslaan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default PlanningForm;