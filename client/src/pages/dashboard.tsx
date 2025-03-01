import { WeekView } from "@/components/calendar/week-view";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { LayoutGrid, Users, Package2, CheckCircle2, DoorOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Material = {
  id: string;
  typeId: string;
  number: number;
  volunteerId: string;
  isCheckedOut: boolean;
};

type MaterialType = {
  id: string;
  name: string;
};

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

type Room = {
  id: string;
  name: string;
};

export default function Dashboard() {
  const [checkedOutMaterials, setCheckedOutMaterials] = useState<Material[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<'materials' | 'volunteers' | 'active' | 'rooms' | null>(null);

  useEffect(() => {
    const materialsRef = ref(db, "materials");
    const volunteersRef = ref(db, "volunteers");
    const materialTypesRef = ref(db, "materialTypes");
    const roomsRef = ref(db, "rooms");

    onValue(materialsRef, (snapshot) => {
      const data = snapshot.val();
      const materialsList = data ? Object.entries(data)
        .map(([id, material]: [string, any]) => ({
          id,
          ...material
        }))
        .filter((material: Material) => material.isCheckedOut) : [];
      setCheckedOutMaterials(materialsList);
    });

    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data)
        .map(([id, volunteer]: [string, any]) => ({
          id,
          ...volunteer
        })) : [];
      setVolunteers(volunteersList);
    });

    onValue(materialTypesRef, (snapshot) => {
      const data = snapshot.val();
      const typesList = data ? Object.entries(data)
        .map(([id, type]: [string, any]) => ({
          id,
          ...type
        })) : [];
      setMaterialTypes(typesList);
    });

    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data)
        .map(([id, room]: [string, any]) => ({
          id,
          ...room
        })) : [];
      setRooms(roomsList);
    });
  }, []);

  const activeVolunteers = volunteers.filter(v => v.isActive);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="h-6 w-6 sm:h-8 sm:w-8 text-[#963E56]" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#963E56]">Dashboard</h1>
      </div>

      {/* Statistics Blocks - Above the calendar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => setSelectedBlock('materials')}
        >
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Uitgeleende Materialen</p>
              <p className="text-2xl font-bold">{checkedOutMaterials.length}</p>
            </div>
            <Package2 className="h-8 w-8 text-[#D9A347]" />
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => setSelectedBlock('volunteers')}
        >
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Totaal Vrijwilligers</p>
              <p className="text-2xl font-bold">{volunteers.length}</p>
            </div>
            <Users className="h-8 w-8 text-[#963E56]" />
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => setSelectedBlock('rooms')}
        >
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Totaal Ruimtes</p>
              <p className="text-2xl font-bold">{rooms.length}</p>
            </div>
            <DoorOpen className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => setSelectedBlock('active')}
        >
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Actieve Vrijwilligers</p>
              <p className="text-2xl font-bold">{activeVolunteers.length}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <WeekView checkedOutMaterials={checkedOutMaterials.length} />
      </div>

      {/* Details Dialog */}
      <Dialog open={selectedBlock !== null} onOpenChange={() => setSelectedBlock(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBlock === 'materials' && 'Uitgeleende Materialen'}
              {selectedBlock === 'volunteers' && 'Alle Vrijwilligers'}
              {selectedBlock === 'active' && 'Actieve Vrijwilligers'}
              {selectedBlock === 'rooms' && 'Alle Ruimtes'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedBlock === 'materials' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Nummer</TableHead>
                    <TableHead>Uitgeleend aan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkedOutMaterials.map(material => {
                    const type = materialTypes.find(t => t.id === material.typeId);
                    const volunteer = volunteers.find(v => v.id === material.volunteerId);
                    return (
                      <TableRow key={material.id}>
                        <TableCell>{type?.name || 'Onbekend'}</TableCell>
                        <TableCell>{material.number}</TableCell>
                        <TableCell>
                          {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'Onbekend'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {(selectedBlock === 'volunteers' || selectedBlock === 'active') && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedBlock === 'volunteers' ? volunteers : activeVolunteers).map(volunteer => (
                    <TableRow key={volunteer.id}>
                      <TableCell>{volunteer.firstName} {volunteer.lastName}</TableCell>
                      <TableCell>
                        {volunteer.isActive ? (
                          <span className="text-green-600">Actief</span>
                        ) : (
                          <span className="text-gray-500">Inactief</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {selectedBlock === 'rooms' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map(room => (
                    <TableRow key={room.id}>
                      <TableCell>{room.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}