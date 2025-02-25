import { WeekView } from "@/components/calendar/week-view";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Card, CardContent } from "@/components/ui/card";
import { Package2 } from "lucide-react";

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
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

  useEffect(() => {
    // Fetch material types
    const materialTypesRef = ref(db, "materialTypes");
    onValue(materialTypesRef, (snapshot) => {
      const data = snapshot.val();
      const typesList = data ? Object.entries(data).map(([id, type]: [string, any]) => ({
        id,
        ...type
      })) : [];
      setMaterialTypes(typesList);
    });

    // Fetch volunteers
    const volunteersRef = ref(db, "volunteers");
    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]: [string, any]) => ({
        id,
        ...volunteer
      })) : [];
      setVolunteers(volunteersList);
    });

    // Fetch materials
    const materialsRef = ref(db, "materials");
    onValue(materialsRef, (snapshot) => {
      const data = snapshot.val();
      const materialsList = data ? Object.entries(data).map(([id, material]: [string, any]) => ({
        id,
        ...material
      })).filter((material: Material) => material.isCheckedOut) : [];
      setCheckedOutMaterials(materialsList);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Package2 className="h-8 w-8 text-primary/80" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Uitgeleend Materiaal</p>
                  <h3 className="text-2xl font-bold">{checkedOutMaterials.length}</h3>
                </div>
              </div>
            </div>
            {checkedOutMaterials.length > 0 && (
              <div className="mt-4 space-y-2">
                {checkedOutMaterials.map(material => {
                  const type = materialTypes.find(t => t.id === material.typeId);
                  const volunteer = volunteers.find(v => v.id === material.volunteerId);
                  return (
                    <div key={material.id} className="text-sm">
                      <span className="font-medium">{type?.name} #{material.number}</span>
                      <span className="text-muted-foreground"> - {volunteer ? `${volunteer.firstName} ${volunteer.lastName}` : 'Onbekend'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <WeekView checkedOutMaterials={checkedOutMaterials.length} />
    </div>
  );
}