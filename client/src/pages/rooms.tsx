import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { House } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BsTrash,
  BsPencil,
  BsPlus,
} from 'react-icons/bs';

const roomSchema = z.object({
  name: z.string().min(1, "Ruimtenaam is verplicht"),
});

type Room = z.infer<typeof roomSchema> & { id: string };

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useRole();

  const form = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    const roomsRef = ref(db, "rooms");
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data).map(([id, room]) => ({
        id,
        ...(room as Omit<Room, "id">),
      })) : [];
      setRooms(roomsList);
    });

    return () => unsubscribe();
  }, []);

  const onSubmit = async (data: z.infer<typeof roomSchema>) => {
    try {
      if (editingRoom) {
        await update(ref(db, `rooms/${editingRoom.id}`), data);
        toast({
          title: "Succes",
          description: "Ruimte succesvol bijgewerkt",
        });
        setEditingRoom(null);
      } else {
        await push(ref(db, "rooms"), data);
        toast({
          title: "Succes",
          description: "Ruimte succesvol toegevoegd",
        });
      }
      form.reset();
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
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <House className="h-8 w-8 text-[#963E56]" />
          <h1 className="text-3xl font-bold text-[#963E56]">Ruimtes</h1>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#963E56] hover:bg-[#963E56]/90">
                  <BsPlus className="h-4 w-4 mr-2" />
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
                    <Button type="submit" className="w-full bg-[#963E56] hover:bg-[#963E56]/90">
                      {editingRoom ? "Bijwerken" : "Toevoegen"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={isEditMode ? "bg-[#963E56]/10 text-[#963E56]" : ""}
                  >
                    <BsPencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isEditMode ? "Bewerken afsluiten" : "Lijst bewerken"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map((room) => (
          <Card key={room.id} className="group relative hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <House className="h-8 w-8 text-[#963E56]/80" />
                  <span className="text-lg font-semibold">{room.name}</span>
                </div>
                {isEditMode && isAdmin && (
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(room)}
                      className="text-[#963E56] hover:text-[#963E56]/90 hover:bg-[#963E56]/10"
                    >
                      <BsPencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteRoomId(room.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <BsTrash className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Actieve toewijzingen</span>
                </div>
                <span className="font-medium">{activeAssignments[room.id] || 0}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {rooms.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center h-32 text-muted-foreground">
            <House className="h-8 w-8 mb-2 opacity-50" />
            <p>Geen ruimtes gevonden</p>
          </div>
        )}
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