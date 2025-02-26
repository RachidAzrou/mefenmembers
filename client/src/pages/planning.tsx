import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Search, X, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import React from 'react';
import { db } from "@/lib/firebase";
import { ref, remove, onValue } from "firebase/database";

interface Planning {
  id: string;
  volunteerId: string;
  roomId: string;
  startDate: string;
  endDate: string;
}

const PlanningTable = ({
  plannings,
  emptyMessage,
  volunteers,
  rooms,
  onEdit,
  onDelete,
  searchValue,
  onSearchChange,
  showActions = false,
}: {
  plannings: Planning[];
  emptyMessage: string;
  volunteers: { id: string; firstName: string; lastName: string; }[];
  rooms: { id: string; name: string; }[];
  onEdit: (planning: Planning) => void;
  onDelete: (id: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  showActions?: boolean;
}) => {
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="space-y-4" onClick={stopPropagation}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Zoek op vrijwilliger of ruimte..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vrijwilliger</TableHead>
              <TableHead>Ruimte</TableHead>
              <TableHead>Periode</TableHead>
              {showActions && <TableHead className="w-[100px]">Acties</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {plannings.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showActions ? 4 : 3}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              plannings.map((planning) => {
                const volunteer = volunteers.find(
                  (v) => v.id === planning.volunteerId
                );
                const room = rooms.find((r) => r.id === planning.roomId);

                return (
                  <TableRow key={planning.id}>
                    <TableCell className="font-medium">
                      {volunteer
                        ? `${volunteer.firstName} ${volunteer.lastName}`
                        : "-"}
                    </TableCell>
                    <TableCell>{room ? room.name : "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="whitespace-nowrap">
                          {format(new Date(planning.startDate), "EEEE d MMM yyyy", {
                            locale: nl,
                          })}
                        </div>
                        <div className="whitespace-nowrap text-muted-foreground">
                          {format(new Date(planning.endDate), "EEEE d MMM yyyy", {
                            locale: nl,
                          })}
                        </div>
                      </div>
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onEdit(planning)}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onDelete(planning.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const Planning = () => {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [volunteers, setVolunteers] = useState<{ id: string; firstName: string; lastName: string; }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string; }[]>([]);
  const [searchActive, setSearchActive] = useState("");
  const [searchUpcoming, setSearchUpcoming] = useState("");
  const [searchPast, setSearchPast] = useState("");
  const { isAdmin } = useRole();

  useEffect(() => {
    const planningsRef = ref(db, "plannings");
    const volunteersRef = ref(db, "volunteers");
    const roomsRef = ref(db, "rooms");

    const unsubPlannings = onValue(planningsRef, (snapshot) => {
      const data = snapshot.val();
      const planningsList = data ? Object.entries(data).map(([id, planning]: [string, any]) => ({ id, ...planning })) : [];
      setPlannings(planningsList);
    });

    const unsubVolunteers = onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]: [string, any]) => ({ id, ...volunteer })) : [];
      setVolunteers(volunteersList);
    });

    const unsubRooms = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      const roomsList = data ? Object.entries(data).map(([id, room]: [string, any]) => ({ id, ...room })) : [];
      setRooms(roomsList);
    });

    return () => {
      unsubPlannings();
      unsubVolunteers();
      unsubRooms();
    };
  }, []);

  const handleEdit = (planning: Planning) => {
    // Implement edit functionality here
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(db, `plannings/${id}`));
    } catch (error) {
      console.error("Error deleting planning:", error);
    }
  };

  const filterPlannings = (plannings: Planning[], search: string) => {
    const searchTerm = search.toLowerCase();
    return plannings.filter((planning) => {
      const volunteer = volunteers.find((v) => v.id === planning.volunteerId);
      const room = rooms.find((r) => r.id === planning.roomId);
      return (
        !searchTerm ||
        (volunteer &&
          `${volunteer.firstName} ${volunteer.lastName}`
            .toLowerCase()
            .includes(searchTerm)) ||
        (room && room.name.toLowerCase().includes(searchTerm))
      );
    });
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const activePlannings = plannings.filter((planning) => {
    const start = new Date(planning.startDate);
    const end = new Date(planning.endDate);
    return start <= now && end >= now;
  });

  const upcomingPlannings = plannings.filter((planning) => {
    const start = new Date(planning.startDate);
    return start > now;
  });

  const pastPlannings = plannings.filter((planning) => {
    const end = new Date(planning.endDate);
    return end < now;
  });

  const filteredActivePlannings = filterPlannings(activePlannings, searchActive);
  const filteredUpcomingPlannings = filterPlannings(upcomingPlannings, searchUpcoming);
  const filteredPastPlannings = filterPlannings(pastPlannings, searchPast);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Planning</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="bg-primary/10 rounded-full p-2 mr-3">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Actieve Planningen</div>
                <div className="text-2xl font-bold">{activePlannings.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="bg-primary/10 rounded-full p-2 mr-3">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Toekomstige Planningen</div>
                <div className="text-2xl font-bold">{upcomingPlannings.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="bg-primary/10 rounded-full p-2 mr-3">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Afgeronde Planningen</div>
                <div className="text-2xl font-bold">{pastPlannings.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 bg-background rounded-lg border p-6">
        <CollapsibleSection
          title="Actieve Planningen"
          icon={<Calendar className="h-5 w-5" />}
          defaultOpen={true}
        >
          <PlanningTable
            plannings={filteredActivePlannings}
            emptyMessage="Er zijn geen actieve planningen voor vandaag"
            volunteers={volunteers}
            rooms={rooms}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchValue={searchActive}
            onSearchChange={setSearchActive}
            showActions={isAdmin}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Toekomstige Planningen"
          icon={<Calendar className="h-5 w-5" />}
          defaultOpen={true}
        >
          <PlanningTable
            plannings={filteredUpcomingPlannings}
            emptyMessage="Geen toekomstige planningen gevonden"
            volunteers={volunteers}
            rooms={rooms}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchValue={searchUpcoming}
            onSearchChange={setSearchUpcoming}
            showActions={isAdmin}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Afgeronde Planningen"
          icon={<Calendar className="h-5 w-5" />}
          defaultOpen={false}
        >
          <PlanningTable
            plannings={filteredPastPlannings}
            emptyMessage="Geen afgeronde planningen gevonden"
            volunteers={volunteers}
            rooms={rooms}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchValue={searchPast}
            onSearchChange={setSearchPast}
            showActions={isAdmin}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default Planning;