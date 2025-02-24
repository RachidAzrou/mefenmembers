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
  Calendar as CalendarIcon,
  Edit2,
  Trash2,
  Users,
  Users2,
  CalendarDays,
  Building,
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
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
  const { toast } = useToast();

  const form = useForm<z.infer<typeof planningSchema>>({
    resolver: zodResolver(planningSchema),
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

  // Calculate statistics
  const totalScheduledVolunteers = plannings.length;
  const uniqueVolunteersScheduled = new Set(plannings.map(p => p.volunteerId)).size;
  const uniqueRoomsScheduled = new Set(plannings.map(p => p.roomId)).size;

  // Get active plannings (current date falls between start and end date)
  const activePlannings = plannings.filter(planning => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(planning.startDate);
    const end = new Date(planning.endDate);
    return start <= now && now <= end;
  });

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
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
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
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            min={form.watch("startDate") || new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
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
        title="Actieve Planningen"
        icon={<Users className="h-5 w-5 text-primary" />}
        defaultOpen={true}
      >
        <div className="rounded-lg border bg-card overflow-x-auto">
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
              {activePlannings.map((planning) => {
                const volunteer = volunteers.find((v) => v.id === planning.volunteerId);
                const room = rooms.find((r) => r.id === planning.roomId);
                return (
                  <TableRow key={planning.id}>
                    <TableCell className="font-medium">
                      {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : "-"}
                    </TableCell>
                    <TableCell>{room ? room.name : "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(planning.startDate), "d MMM", { locale: nl })} - {format(new Date(planning.endDate), "d MMM", { locale: nl })}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
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
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {activePlannings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                    Geen actieve planningen gevonden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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