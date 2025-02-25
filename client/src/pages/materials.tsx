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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { ref, push, update, remove, onValue } from "firebase/database";
import { Package2, Edit2, RotateCcw, Search, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { useRole } from "@/hooks/use-role";
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
import { Card, CardContent } from "@/components/ui/card";


const materialSchema = z.object({
  typeId: z.string().min(1, "Type materiaal is verplicht"),
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht"),
  number: z.coerce.number().min(1).max(100),
});

const materialTypeSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  maxCount: z.coerce.number().min(1, "Minimaal 1 vereist").max(100, "Maximaal 100 toegestaan"),
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
  const [editingMaterialType, setEditingMaterialType] = useState<MaterialType | null>(null);
  const [isTypesDialogOpen, setIsTypesDialogOpen] = useState(false);
  const [deleteMaterialTypeId, setDeleteMaterialTypeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const form = useForm<z.infer<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      number: 1,
    },
  });

  const typeForm = useForm<z.infer<typeof materialTypeSchema>>({
    resolver: zodResolver(materialTypeSchema),
    defaultValues: {
      name: "",
      maxCount: 1,
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
      setMaterials(materialsList);
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

  const onSubmit = async (data: z.infer<typeof materialSchema>) => {
    try {
      const existingMaterial = materials.find(
        m => m.typeId === data.typeId &&
            m.number === data.number &&
            m.isCheckedOut
      );

      if (existingMaterial && !editingMaterial) {
        toast({
          variant: "destructive",
          title: "Fout",
          description: "Dit materiaal is al uitgeleend",
        });
        return;
      }

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
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materiaal niet toewijzen",
      });
    }
  };

  const onSubmitType = async (data: z.infer<typeof materialTypeSchema>) => {
    try {
      if (editingMaterialType) {
        await update(ref(db, `materialTypes/${editingMaterialType.id}`), data);
        toast({
          title: "Succes",
          description: "Materiaaltype succesvol bijgewerkt",
        });
        setEditingMaterialType(null);
      } else {
        await push(ref(db, "materialTypes"), data);
        toast({
          title: "Succes",
          description: "Materiaaltype succesvol toegevoegd",
        });
      }
      typeForm.reset();
      setIsTypesDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materiaaltype niet opslaan",
      });
    }
  };

  const handleDeleteMaterialType = async (id: string) => {
    try {
      await remove(ref(db, `materialTypes/${id}`));
      toast({
        title: "Succes",
        description: "Materiaaltype succesvol verwijderd",
      });
      setDeleteMaterialTypeId(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materiaaltype niet verwijderen",
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

  const handleEditType = (type: MaterialType) => {
    setEditingMaterialType(type);
    typeForm.reset({
      name: type.name,
      maxCount: type.maxCount,
    });
    setIsTypesDialogOpen(true);
  };

  const filteredMaterials = materials.filter(material => {
    const type = materialTypes.find(t => t.id === material.typeId);
    const volunteer = volunteers.find(v => v.id === material.volunteerId);
    const searchString = `${type?.name || ''} ${volunteer?.firstName || ''} ${volunteer?.lastName || ''} ${material.number}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const selectedType = materialTypes.find(t => t.id === form.watch("typeId"));
  const maxNumber = selectedType?.maxCount || 100;

  // Calculate statistics
  const checkedOutMaterials = materials.filter(m => m.isCheckedOut).length;
  const checkedOutByType = materialTypes.map(type => ({
    name: type.name,
    count: materials.filter(m => m.typeId === type.id && m.isCheckedOut).length,
    total: type.maxCount
  }));

  // Add bulk selection toggle
  const toggleSelectAll = () => {
    if (selectedMaterials.length === filteredMaterials.length) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(filteredMaterials.map(m => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedMaterials(prev =>
      prev.includes(id)
        ? prev.filter(m => m !== id)
        : [...prev, id]
    );
  };

  const handleBulkReturn = async (materialIds: string[]) => {
    try {
      const updates = {};
      materialIds.forEach(id => {
        updates[`materials/${id}/volunteerId`] = null;
        updates[`materials/${id}/isCheckedOut`] = false;
      });
      await update(ref(db, ''), updates);
      toast({ title: 'Succes', description: 'Materialen succesvol geretourneerd' });
      setSelectedMaterials([]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Fout', description: 'Kon materialen niet retourneren' });
    }
  };


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
          {isAdmin && (
            <>
              <Dialog open={isTypesDialogOpen} onOpenChange={setIsTypesDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Materiaaltype
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingMaterialType ? "Materiaaltype Bewerken" : "Nieuw Materiaaltype"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...typeForm}>
                    <form onSubmit={typeForm.handleSubmit(onSubmitType)} className="space-y-4">
                      <FormField
                        control={typeForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Naam</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Materiaaltype naam" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={typeForm.control}
                        name="maxCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum aantal</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                {...field}
                                placeholder="Maximum aantal"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full">
                        {editingMaterialType ? "Bijwerken" : "Toevoegen"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6BB85C] hover:bg-[#6BB85C]/90">
                <Package2 className="h-4 w-4 mr-2" />
                Materiaal Toewijzen
              </Button>
            </DialogTrigger>
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
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer nummer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: maxNumber }).map((_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package2 className="h-8 w-8 text-primary/80" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Uitgeleende Materialen</h3>
                <p className="text-2xl font-bold text-primary">{checkedOutMaterials}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {checkedOutByType.map(stat => (
          <Card key={stat.name}>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Package2 className="h-8 w-8 text-primary/80" />
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">{stat.name}</h3>
                  <p className="text-2xl font-bold text-primary">
                    {stat.count} / {stat.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`hover:bg-gray-100 ${isEditMode ? "bg-gray-100 text-primary" : ""}`}
                title={isEditMode ? "Bewerken afsluiten" : "Bewerken"}
              >
                <Edit2 className="h-5 w-5" />
              </Button>
            </div>

            {isEditMode && (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleSelectAll}
                          className="hover:bg-transparent"
                        >
                          {selectedMaterials.length === filteredMaterials.length ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>Materiaaltype</TableHead>
                      <TableHead>Maximum Aantal</TableHead>
                      <TableHead className="w-[100px]">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleSelect(type.id)}
                            className="hover:bg-transparent"
                          >
                            {selectedMaterials.includes(type.id) ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>{type.name}</TableCell>
                        <TableCell>{type.maxCount}</TableCell>
                        <TableCell className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditType(type)}
                            className="text-[#6BB85C] hover:text-[#6BB85C] hover:bg-[#6BB85C]/10"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteMaterialTypeId(type.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {isEditMode && (
                    <TableHead className="w-[50px]">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSelectAll}
                        className="hover:bg-transparent"
                      >
                        {selectedMaterials.length === filteredMaterials.length ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                  )}
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
                      {isEditMode && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleSelect(item.id)}
                            className="hover:bg-transparent"
                          >
                            {selectedMaterials.includes(item.id) ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      )}
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
                      <TableCell className="flex space-x-2">
                        {isEditMode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                            className="text-[#6BB85C] hover:text-[#6BB85C] hover:bg-[#6BB85C]/10"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReturn(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMaterials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isEditMode ? 6 : 5} className="text-center py-6 text-gray-500">
                      Geen materialen gevonden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Bulk Actions - Only show when in edit mode */}
          {isEditMode && selectedMaterials.length > 0 && (
            <div className="fixed bottom-4 right-4 flex gap-2 bg-white p-4 rounded-lg shadow-lg border">
              <span className="text-sm text-gray-500 self-center mr-2">
                {selectedMaterials.length} geselecteerd
              </span>
              <Button
                variant="default"
                onClick={() => handleBulkReturn(selectedMaterials)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retourneren
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={!!deleteMaterialTypeId}
        onOpenChange={() => setDeleteMaterialTypeId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. Dit zal het materiaaltype permanent verwijderen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMaterialTypeId && handleDeleteMaterialType(deleteMaterialTypeId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}