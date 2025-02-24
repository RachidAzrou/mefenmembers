import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Edit2, Trash2, Plus, DoorOpen } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRole } from "@/hooks/use-role";

const roomSchema = z.object({
  name: z.string().min(1, "Ruimtenaam is verplicht"),
});

type Room = z.infer<typeof roomSchema> & { id: string };

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useRole();

  const form = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: "",
    },
  });

  useState(() => {
    const roomsRef = ref(db, "rooms");
    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data).map(([id, room]) => ({
        id,
        ...(room as Omit<Room, "id">),
      })) : [];
      setRooms(roomsList);
    });
  });

  const onSubmit = async (data: z.infer<typeof roomSchema>) => {
    try {
      if (editingRoom) {
        await update(ref(db, `rooms/${editingRoom.id}`), data);
        toast({
          title: "Succes",
          description: "Ruimte succesvol bijgewerkt",
        });
      } else {
        await push(ref(db, "rooms"), data);
        toast({
          title: "Succes",
          description: "Ruimte succesvol toegevoegd",
        });
      }
      form.reset();
      setEditingRoom(null);
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon ruimte niet opslaan",
      });
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    form.reset(room);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(db, `rooms/${id}`));
      toast({
        title: "Succes",
        description: "Ruimte succesvol verwijderd",
      });
      setDeleteRoomId(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon ruimte niet verwijderen",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <DoorOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Ruimtes</h1>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6BB85C] hover:bg-[#6BB85C]/90">
                <Plus className="h-4 w-4 mr-2" />
                Ruimte Toevoegen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRoom ? "Ruimte Bewerken" : "Nieuwe Ruimte Toevoegen"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruimtenaam</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ruimtenaam" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    {editingRoom ? "Bijwerken" : "Toevoegen"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead className="w-[100px]">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell>{room.name}</TableCell>
                <TableCell className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(room)}
                    className="text-[#6BB85C] hover:text-[#6BB85C] hover:bg-[#6BB85C]/10"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteRoomId(room.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rooms.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-6 text-gray-500">
                  Geen ruimtes gevonden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deleteRoomId}
        onOpenChange={() => setDeleteRoomId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. Dit zal de ruimte permanent verwijderen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRoomId && handleDelete(deleteRoomId)}
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