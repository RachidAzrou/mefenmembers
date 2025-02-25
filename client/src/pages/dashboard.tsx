import { WeekView } from "@/components/calendar/week-view";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

type Material = {
  id: string;
  name: string;
  status: 'available' | 'checked_out';
  checkedOutBy?: string;
  checkedOutAt?: string;
};

export default function Dashboard() {
  const [checkedOutMaterials, setCheckedOutMaterials] = useState<Material[]>([]);

  useEffect(() => {
    const materialsRef = ref(db, "materials");
    onValue(materialsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const materialsList = Object.entries(data)
          .map(([id, material]: [string, any]) => ({
            id,
            ...material
          }))
          .filter((material: Material) => material.status === 'checked_out');
        setCheckedOutMaterials(materialsList);
      } else {
        setCheckedOutMaterials([]);
      }
    });
  }, []);

  return (
    <div>
      <WeekView checkedOutMaterials={checkedOutMaterials.length} />
    </div>
  );
}