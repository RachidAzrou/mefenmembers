import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Check, X, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  const [openVolunteer, setOpenVolunteer] = useState(false);
  const [openRoom, setOpenRoom] = useState(false);

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
                  <Popover open={openVolunteer} onOpenChange={setOpenVolunteer}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          type="button"
                          className="w-full justify-start"
                        >
                          {field.value?.length > 0 ? (
                            <span>{field.value.length} vrijwilliger(s) geselecteerd</span>
                          ) : (
                            <span>Selecteer vrijwilligers</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Zoek vrijwilligers..."
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        <CommandEmpty>Geen vrijwilligers gevonden.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
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
                                  (field.value || []).includes(volunteer.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {volunteer.firstName} {volunteer.lastName}
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
                  <Popover open={openRoom} onOpenChange={setOpenRoom}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          type="button"
                          className="w-full justify-start"
                        >
                          {field.value?.length > 0 ? (
                            <span>{field.value.length} ruimte(s) geselecteerd</span>
                          ) : (
                            <span>Selecteer ruimtes</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Zoek ruimtes..." />
                        <CommandEmpty>Geen ruimtes gevonden.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
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
                                  (field.value || []).includes(room.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {room.name}
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
          </>
        ) : (
          <>
            <FormField
              control={form.control}
              name="volunteerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vrijwilliger</FormLabel>
                  <Popover open={openVolunteer} onOpenChange={setOpenVolunteer}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          type="button"
                          className="w-full justify-start"
                        >
                          {field.value ? (
                            <span>
                              {volunteers.find(v => v.id === field.value)?.firstName}{' '}
                              {volunteers.find(v => v.id === field.value)?.lastName}
                            </span>
                          ) : (
                            <span>Selecteer een vrijwilliger</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Zoek vrijwilliger..."
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        <CommandEmpty>Geen vrijwilligers gevonden.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {filteredVolunteers.map((volunteer) => (
                            <CommandItem
                              key={volunteer.id}
                              onSelect={() => {
                                field.onChange(volunteer.id);
                                setOpenVolunteer(false);
                              }}
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
                  <Popover open={openRoom} onOpenChange={setOpenRoom}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          type="button"
                          className="w-full justify-start"
                        >
                          {field.value ? (
                            <span>{rooms.find(r => r.id === field.value)?.name}</span>
                          ) : (
                            <span>Selecteer een ruimte</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Zoek ruimtes..." />
                        <CommandEmpty>Geen ruimtes gevonden.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {rooms.map((room) => (
                            <CommandItem
                              key={room.id}
                              onSelect={() => {
                                field.onChange(room.id);
                                setOpenRoom(false);
                              }}
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
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
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