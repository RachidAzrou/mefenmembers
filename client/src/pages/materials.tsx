import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { ref, push, update, onValue } from "firebase/database";
import { Package2, Edit2, RotateCcw, Search } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const materialSchema = z.object({
  typeId: z.string().min(1, "Type materiaal is verplicht"),
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht"),
  number: z.coerce.number().min(1).max(100),
});

type MaterialType = {
  id: string;
  name: string;
  maxCount: number;
};

type Material = {
  id: string;
  typeId: string;
  number: number;
  volunteerId?: string;
  isCheckedOut: boolean;
};

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      number: 1,
    },
  });

  useState(() => {
    const materialTypesRef = ref(db, "materialTypes");
    onValue(materialTypesRef, (snapshot) => {
      const data = snapshot.val();
      const typesList = data ? Object.entries(data).map(([id, type]) => ({
        id,
        ...(type as Omit<MaterialType, "id">),
      })) : [];
      setMaterialTypes(typesList);
    });

    const materialsRef = ref(db, "materials");
    onValue(materialsRef, (snapshot) => {
      const data = snapshot.val();
      const materialsList = data ? Object.entries(data).map(([id, material]) => ({
        id,
        ...(material as Omit<Material, "id">),
      })) : [];
      setMaterials(materialsList.filter((m) => m.isCheckedOut));
    });

    const volunteersRef = ref(db, "volunteers");
    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]) => ({
        id,
        ...(volunteer as Omit<Volunteer, "id">),
      })) : [];
      setVolunteers(volunteersList);
    });
  });

  const selectedType = materialTypes.find(t => t.id === form.watch("typeId"));
  const maxNumber = selectedType?.maxCount || 100;

  const onSubmit = async (data: z.infer<typeof materialSchema>) => {
    try {
      if (editingMaterial) {
        await update(ref(db, `materials/${editingMaterial.id}`), {
          ...data,
          isCheckedOut: true,
        });
        toast({
          title: "Succes",
          description: "Materiaal succesvol bijgewerkt",
        });
        setEditingMaterial(null);
      } else {
        await push(ref(db, "materials"), {
          ...data,
          isCheckedOut: true,
        });
        toast({
          title: "Succes",
          description: "Materiaal succesvol toegewezen",
        });
      }
      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materiaal niet toewijzen",
      });
    }
  };

  const handleDelete = async (materialId: string) => {
    try {
      await update(ref(db, `materials/${materialId}`), {
        volunteerId: null,
        isCheckedOut: false,
      });
      toast({
        title: "Succes",
        description: "Materiaal succesvol verwijderd",
      });
      setDeleteMaterialId(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materiaal niet verwijderen",
      });
    }
  };

  const handleReturn = async (materialId: string) => {
    try {
      await update(ref(db, `materials/${materialId}`), {
        volunteerId: null,
        isCheckedOut: false,
      });
      toast({
        title: "Succes",
        description: "Materiaal succesvol geretourneerd",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materiaal niet retourneren",
      });
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    form.reset({
      typeId: material.typeId,
      volunteerId: material.volunteerId || "",
      number: material.number,
    });
    setDialogOpen(true);
  };

  const filteredMaterials = materials.filter(material => {
    const type = materialTypes.find(t => t.id === material.typeId);
    const volunteer = volunteers.find(v => v.id === material.volunteerId);
    const searchString = `${type?.name || ''} ${volunteer?.firstName || ''} ${volunteer?.lastName || ''} ${material.number}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Package2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Materiaalbeheer</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Zoeken..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMaterial ? "Materiaal Bewerken" : "Materiaal Toewijzen"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="typeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type Materiaal</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {materialTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="volunteerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vrijwilliger</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer vrijwilliger" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {volunteers.map((volunteer) => (
                              <SelectItem key={volunteer.id} value={volunteer.id}>
                                {volunteer.firstName} {volunteer.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nummer</FormLabel>
                        <Input
                          type="number"
                          min={1}
                          max={maxNumber}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    {editingMaterial ? "Materiaal Bijwerken" : "Materiaal Toewijzen"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Nummer</TableHead>
              <TableHead>Vrijwilliger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials.map((item) => {
              const type = materialTypes.find((t) => t.id === item.typeId);
              const volunteer = volunteers.find((v) => v.id === item.volunteerId);
              return (
                <TableRow key={item.id}>
                  <TableCell>{type?.name || "-"}</TableCell>
                  <TableCell>{item.number}</TableCell>
                  <TableCell>
                    {volunteer
                      ? `${volunteer.firstName} ${volunteer.lastName}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isCheckedOut ? "default" : "secondary"}>
                      {item.isCheckedOut ? "Uitgeleend" : "Beschikbaar"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(item)}
                      className="text-[#D9A347] hover:text-[#D9A347] hover:bg-[#D9A347]/10"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReturn(item.id)}
                      className="text-[#D9A347] hover:text-[#D9A347] hover:bg-[#D9A347]/10"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredMaterials.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                  Geen materialen gevonden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}