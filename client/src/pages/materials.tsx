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
import {
  Package2,
  Edit2,
  RotateCcw,
  Search,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Shirt,
  Shield,
  Lamp,
  Radio,
  Settings2,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

const getMaterialIcon = (materialName: string) => {
  const name = materialName.toLowerCase();
  if (name.includes('jas')) return <Shirt className="h-8 w-8 text-primary/80" />;
  if (name.includes('hesje')) return <Shield className="h-8 w-8 text-primary/80" />;
  if (name.includes('lamp')) return <Lamp className="h-8 w-8 text-primary/80" />;
  if (name.includes('walkie')) return <Radio className="h-8 w-8 text-primary/80" />;
  return <Package2 className="h-8 w-8 text-primary/80" />;
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
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Package2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Materiaalbeheer</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Type Toevoegen
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
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Package2 className="h-4 w-4 mr-2" />
                    Toewijzen
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
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {checkedOutByType.map(stat => (
          <Card key={stat.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getMaterialIcon(stat.name)}
                  <div className="ml-3">
                    <div className="text-2xl font-bold">{stat.count}</div>
                    <div className="text-sm text-muted-foreground">van {stat.total}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        {isAdmin && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Materiaallijst</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`${isEditMode ? "bg-primary/10 text-primary" : ""}`}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    {isEditMode ? "Bewerken afsluiten" : "Lijst bewerken"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isEditMode ? "Bewerkmodus afsluiten" : "Lijst bewerken"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {isEditMode && (
                  <TableHead className="w-[50px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
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
                        </TooltipTrigger>
                        <TooltipContent>
                          {selectedMaterials.length === filteredMaterials.length ?
                            "Deselecteer alles" : "Selecteer alles"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
                  <TableRow key={item.id} className="group">
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
                      <Badge
                        variant={item.isCheckedOut ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {item.isCheckedOut ? "Uitgeleend" : "Beschikbaar"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditMode && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(item)}
                                  className="text-primary hover:text-primary hover:bg-primary/10"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Bewerken</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {item.isCheckedOut && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleReturn(item.id)}
                                  className="text-primary hover:text-primary hover:bg-primary/10"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Retourneren</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredMaterials.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isEditMode ? 6 : 5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <Package2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Geen materialen gevonden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {isEditMode && selectedMaterials.length > 0 && (
          <div className="fixed bottom-4 right-4 flex items-center gap-3 bg-white p-4 rounded-lg shadow-lg border animate-in slide-in-from-bottom-2">
            <span className="text-sm text-muted-foreground">
              {selectedMaterials.length} geselecteerd
            </span>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="default"
              onClick={() => handleBulkReturn(selectedMaterials)}
              className="bg-primary hover:bg-primary/90"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retourneren
            </Button>
          </div>
        )}
      </div>
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