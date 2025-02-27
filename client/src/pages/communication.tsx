import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Radio className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#963E56]">
          Communicatie
        </h1>
      </div>

      {/* Stats Card */}
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

      {/* Room Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map((room) => (
          <Card key={room.id} className="overflow-hidden">
            <CardHeader className="space-y-1 p-4">
              <CardTitle className="text-base font-medium flex items-center justify-between">
                {room.name}
                {room.channel && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Kanaal {room.channel}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#963E56]" />
                <span className="text-sm text-muted-foreground">
                  {room.channel || "Geen kanaal toegewezen"}
                </span>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingRoom(room);
                    setNewChannel(room.channel || "");
                    setDialogOpen(true);
                  }}
                  className="w-full mt-3 text-[#963E56] hover:text-[#963E56]/90 hover:bg-[#963E56]/10"
                >
                  Bewerken
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingRoom(null);
          setNewChannel("");
        }
        setDialogOpen(open);
      }}>
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
                {editingRoom?.name}
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
                onClick={() => editingRoom && handleUpdateChannel(editingRoom.id, newChannel)}
                className="bg-[#963E56] hover:bg-[#963E56]/90"
              >
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}