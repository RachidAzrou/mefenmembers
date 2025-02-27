import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { db } from "@/lib/firebase";
import { ref, onValue, update } from "firebase/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Room {
  id: string;
  name: string;
  channel?: string;
}

export default function Communication() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newChannel, setNewChannel] = useState("");
  const { isAdmin } = useRole();
  const { toast } = useToast();

  useEffect(() => {
    const roomsRef = ref(db, "rooms");
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data).map(([id, room]: [string, any]) => ({
        id,
        ...room
      })) : [];
      setRooms(roomsList);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateChannel = async (roomId: string, channel: string) => {
    try {
      await update(ref(db, `rooms/${roomId}`), {
        channel
      });
      toast({
        title: "Kanaal bijgewerkt",
        description: "Het walkietalkie kanaal is succesvol bijgewerkt.",
        duration: 3000,
      });
      setDialogOpen(false);
      setNewChannel("");
      setEditingRoom(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is een fout opgetreden bij het bijwerken van het kanaal.",
        duration: 3000,
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex items-center gap-3">
        <Radio className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#963E56]">
          Communicatie
        </h1>
      </div>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Radio className="h-5 w-5 sm:h-8 sm:w-8 text-[#963E56]/80" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Walkietalkie Kanalen
              </p>
              <p className="text-lg sm:text-2xl font-bold text-[#963E56]">
                {rooms.filter(r => r.channel).length} / {rooms.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <div className="min-w-[600px] sm:min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ruimte</TableHead>
                  <TableHead>Kanaal</TableHead>
                  {isAdmin && <TableHead className="w-[100px]">Acties</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 3 : 2}
                      className="h-24 text-center"
                    >
                      <Radio className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Geen ruimtes gevonden
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Radio className="h-4 w-4 text-[#963E56]" />
                          <span>{room.channel || "-"}</span>
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Dialog open={dialogOpen && editingRoom?.id === room.id} onOpenChange={(open) => {
                            if (!open) {
                              setEditingRoom(null);
                              setNewChannel("");
                            }
                            setDialogOpen(open);
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#963E56] hover:text-[#963E56]/90 hover:bg-[#963E56]/10"
                                onClick={() => {
                                  setEditingRoom(room);
                                  setNewChannel(room.channel || "");
                                }}
                              >
                                Bewerken
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] sm:max-w-[450px] p-4 sm:p-6 bg-white border-none shadow-lg mx-4">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-semibold text-[#963E56]">
                                  Kanaal Bewerken
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">
                                    Ruimte
                                  </label>
                                  <div className="p-2 bg-muted/50 rounded-md">
                                    {room.name}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">
                                    Walkietalkie Kanaal
                                  </label>
                                  <Input
                                    value={newChannel}
                                    onChange={(e) => setNewChannel(e.target.value)}
                                    placeholder="Voer kanaalnummer in"
                                  />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                  <Button
                                    variant="ghost"
                                    onClick={() => {
                                      setDialogOpen(false);
                                      setEditingRoom(null);
                                      setNewChannel("");
                                    }}
                                  >
                                    Annuleren
                                  </Button>
                                  <Button
                                    onClick={() => handleUpdateChannel(room.id, newChannel)}
                                    className="bg-[#963E56] hover:bg-[#963E56]/90"
                                  >
                                    Opslaan
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}