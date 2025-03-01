import { WeekView } from "@/components/calendar/week-view";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { LayoutGrid, Users, Package2, CheckCircle2, DoorOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:bg-[#963E56]/5"
          onClick={() => setSelectedBlock('materials')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Uitgeleende Materialen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Package2 className="h-8 w-8 text-[#963E56]" />
                <div className="ml-2 sm:ml-3">
                  <div className="text-lg sm:text-2xl font-bold">{checkedOutMaterials.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">materialen</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:bg-[#963E56]/5"
          onClick={() => setSelectedBlock('volunteers')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Totaal Vrijwilligers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-[#963E56]" />
                <div className="ml-2 sm:ml-3">
                  <div className="text-lg sm:text-2xl font-bold">{volunteers.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">vrijwilligers</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:bg-[#963E56]/5"
          onClick={() => setSelectedBlock('rooms')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Totaal Ruimtes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DoorOpen className="h-8 w-8 text-[#963E56]" />
                <div className="ml-2 sm:ml-3">
                  <div className="text-lg sm:text-2xl font-bold">{rooms.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">ruimtes</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:bg-[#963E56]/5"
          onClick={() => setSelectedBlock('active')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Actieve Vrijwilligers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle2 className="h-8 w-8 text-[#963E56]" />
                <div className="ml-2 sm:ml-3">
                  <div className="text-lg sm:text-2xl font-bold">{activeVolunteers.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">actief</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={selectedBlock !== null} onOpenChange={() => setSelectedBlock(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              {selectedBlock === 'materials' && <Package2 className="h-6 w-6 text-[#963E56]" />}
              {selectedBlock === 'volunteers' && <Users className="h-6 w-6 text-[#963E56]" />}
              {selectedBlock === 'active' && <CheckCircle2 className="h-6 w-6 text-[#963E56]" />}
              {selectedBlock === 'rooms' && <DoorOpen className="h-6 w-6 text-[#963E56]" />}
              <DialogTitle className="text-lg font-semibold text-[#963E56]">
                {selectedBlock === 'materials' && 'Uitgeleende Materialen'}
                {selectedBlock === 'volunteers' && 'Alle Vrijwilligers'}
                {selectedBlock === 'active' && 'Actieve Vrijwilligers'}
                {selectedBlock === 'rooms' && 'Alle Ruimtes'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] rounded-lg border bg-card">
            {selectedBlock === 'materials' && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Nummer</TableHead>
                    <TableHead className="font-semibold">Uitgeleend aan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkedOutMaterials.map(material => {
                    const type = materialTypes.find(t => t.id === material.typeId);
                    const volunteer = volunteers.find(v => v.id === material.volunteerId);
                    return (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">{type?.name || 'Onbekend'}</TableCell>
                        <TableCell>#{material.number}</TableCell>
                        <TableCell>
                          {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'Onbekend'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {checkedOutMaterials.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Geen uitgeleende materialen
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            {(selectedBlock === 'volunteers' || selectedBlock === 'active') && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Naam</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedBlock === 'volunteers' ? volunteers : activeVolunteers).map(volunteer => (
                    <TableRow key={volunteer.id}>
                      <TableCell className="font-medium">
                        {volunteer.firstName} {volunteer.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          volunteer.isActive 
                            ? "bg-green-50 text-green-700 border-green-200/50"
                            : "bg-gray-50 text-gray-600 border-gray-200/50"
                        }>
                          {volunteer.isActive ? 'Actief' : 'Inactief'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {selectedBlock === 'rooms' && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Naam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map(room => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <WeekView checkedOutMaterials={checkedOutMaterials.length} />
      </div>
    </div>
  );
}