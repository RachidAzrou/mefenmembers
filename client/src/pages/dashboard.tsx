import { WeekView } from "@/components/calendar/week-view";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-foreground">Deze Week</h2>
              <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center justify-center space-x-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Vorige</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center justify-center"
                >
                  Vandaag
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center justify-center space-x-1"
                >
                  <span className="hidden sm:inline mr-1">Volgende</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="rounded-lg border bg-card">
              <WeekView checkedOutMaterials={checkedOutMaterials.length} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}