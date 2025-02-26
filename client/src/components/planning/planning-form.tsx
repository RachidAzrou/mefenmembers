import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Check, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";
import { z } from "zod";
import { UseFormReturn } from "react-hook-form";

const planningSchema = z.object({
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht").optional(),
  roomId: z.string().min(1, "Ruimte is verplicht").optional(),
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().min(1, "Einddatum is verplicht"),
  isBulkPlanning: z.boolean().default(false),
  selectedVolunteers: z.array(z.string()).default([]),
  selectedRooms: z.array(z.string()).default([])
});

type PlanningFormData = z.infer<typeof planningSchema>;

interface PlanningFormProps {
  volunteers: { id: string; firstName: string; lastName: string }[];
  rooms: { id: string; name: string }[];
  onSubmit: (data: PlanningFormData) => Promise<void>;
  onClose: () => void;
  form: UseFormReturn<PlanningFormData>;
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
  const [searchTerm, setSearchTerm] = useState("");

  const filteredVolunteers = volunteers.filter(volunteer =>
    `${volunteer.firstName} ${volunteer.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const isBulkPlanning = form.watch("isBulkPlanning");
  const selectedVolunteers = form.watch("selectedVolunteers") || [];
  const selectedRooms = form.watch("selectedRooms") || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!editingPlanning && (
          <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-border">
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
              className="data-[state=checked]:bg-[#963E56]"
            />
            <Label>Bulk Inplannen</Label>
          </div>
        )}

        {isBulkPlanning ? (
          <>
            <FormField
              control={form.control}
              name="selectedVolunteers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vrijwilligers</FormLabel>
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput
                      placeholder="Zoek vrijwilligers..."
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                    <CommandEmpty>Geen vrijwilligers gevonden.</CommandEmpty>
                    <CommandGroup className="max-h-[150px] overflow-auto">
                      {filteredVolunteers.map((volunteer) => (
                        <CommandItem
                          key={volunteer.id}
                          onSelect={() => {
                            const current = field.value || [];
                            const updated = current.includes(volunteer.id)
                              ? current.filter(id => id !== volunteer.id)
                              : [...current, volunteer.id];
                            field.onChange(updated);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value?.includes(volunteer.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {volunteer.firstName} {volunteer.lastName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                  {selectedVolunteers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedVolunteers.map(id => {
                        const volunteer = volunteers.find(v => v.id === id);
                        return (
                          <div
                            key={id}
                            className="bg-[#963E56]/10 text-[#963E56] text-sm rounded-full px-3 py-1 flex items-center gap-2"
                          >
                            <span>{volunteer?.firstName} {volunteer?.lastName}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => {
                                form.setValue(
                                  "selectedVolunteers",
                                  selectedVolunteers.filter(v => v !== id)
                                );
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

            <FormField
              control={form.control}
              name="selectedRooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruimtes</FormLabel>
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="Zoek ruimtes..." />
                    <CommandEmpty>Geen ruimtes gevonden.</CommandEmpty>
                    <CommandGroup className="max-h-[150px] overflow-auto">
                      {rooms.map((room) => (
                        <CommandItem
                          key={room.id}
                          onSelect={() => {
                            const current = field.value || [];
                            const updated = current.includes(room.id)
                              ? current.filter(id => id !== room.id)
                              : [...current, room.id];
                            field.onChange(updated);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value?.includes(room.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {room.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                  {selectedRooms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedRooms.map(id => {
                        const room = rooms.find(r => r.id === id);
                        return (
                          <div
                            key={id}
                            className="bg-[#963E56]/10 text-[#963E56] text-sm rounded-full px-3 py-1 flex items-center gap-2"
                          >
                            <span>{room?.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => {
                                form.setValue(
                                  "selectedRooms",
                                  selectedRooms.filter(r => r !== id)
                                );
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
          </>
        ) : (
          <>
            <FormField
              control={form.control}
              name="volunteerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vrijwilliger</FormLabel>
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput
                      placeholder="Zoek vrijwilliger..."
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                    <CommandEmpty>Geen vrijwilligers gevonden.</CommandEmpty>
                    <CommandGroup className="max-h-[150px] overflow-auto">
                      {filteredVolunteers.map((volunteer) => (
                        <CommandItem
                          key={volunteer.id}
                          onSelect={() => field.onChange(volunteer.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === volunteer.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {volunteer.firstName} {volunteer.lastName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
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
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="Zoek ruimtes..." />
                    <CommandEmpty>Geen ruimtes gevonden.</CommandEmpty>
                    <CommandGroup className="max-h-[150px] overflow-auto">
                      {rooms.map((room) => (
                        <CommandItem
                          key={room.id}
                          onSelect={() => field.onChange(room.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === room.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {room.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
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
                          format(parseISO(field.value), "d MMM yyyy", { locale: nl })
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
                          format(parseISO(field.value), "d MMM yyyy", { locale: nl })
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
                        const startDate = form.getValues("startDate");
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
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Annuleren
          </Button>
          <Button
            type="submit"
            className="bg-[#963E56] hover:bg-[#963E56]/90"
          >
            {editingPlanning ? "Planning Bijwerken" : "Planning Opslaan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}