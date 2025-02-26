import { WeekView } from "@/components/calendar/week-view";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Card, CardContent } from "@/components/ui/card";

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
};

export default function Dashboard() {
  const [checkedOutMaterials, setCheckedOutMaterials] = useState<Material[]>([]);

  useEffect(() => {
    const materialsRef = ref(db, "materials");
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
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Weekoverzicht</h2>
            <div className="rounded-lg border bg-card overflow-hidden">
              <WeekView checkedOutMaterials={checkedOutMaterials.length} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}