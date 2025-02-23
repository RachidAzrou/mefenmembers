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
import { ref, update, onValue } from "firebase/database";
import { Package } from "lucide-react";
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

const materialSchema = z.object({
  volunteerId: z.string().min(1, "Vrijwilliger is verplicht"),
  type: z.string().min(1, "Materiaaltype is verplicht"),
  number: z.number().min(1).max(100),
});

type Material = {
  id: string;
  type: string;
  number: number;
  volunteerId?: string;
  isCheckedOut: boolean;
};

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
};

const MATERIAL_TYPES = [
  { value: "jas", label: "Jas", max: 100 },
  { value: "hesje", label: "Hesje", max: 100 },
  { value: "lamp", label: "Lamp", max: 20 },
  { value: "walkie_talkie", label: "Walkie Talkie", max: 20 },
];

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
  });

  // Load materials and volunteers from Firebase
  useState(() => {
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
      const materialItem = materials.find(
        (e) => e.type === data.type && e.number === data.number
      );

      if (materialItem) {
        await update(ref(db, `materials/${materialItem.id}`), {
          volunteerId: data.volunteerId,
          isCheckedOut: true,
        });
        toast({
          title: "Succes",
          description: "Materiaal succesvol toegewezen",
        });
        form.reset();
      } else {
        toast({
          variant: "destructive",
          title: "Fout",
          description: "Materiaal niet gevonden",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon materiaal niet toewijzen",
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Materiaal Beheer</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Package className="h-4 w-4 mr-2" />
              Materiaal Toewijzen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Materiaal Toewijzen</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Materiaal Type</FormLabel>
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
                          {MATERIAL_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
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
                          {Array.from({ length: 100 }).map((_, i) => (
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
                  Materiaal Toewijzen
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Nummer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Toegewezen Aan</TableHead>
            <TableHead className="w-24">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((item) => {
            const volunteer = volunteers.find((v) => v.id === item.volunteerId);
            return (
              <TableRow key={item.id}>
                <TableCell className="capitalize">
                  {item.type.replace("_", " ")}
                </TableCell>
                <TableCell>{item.number}</TableCell>
                <TableCell>
                  {item.isCheckedOut ? "Uitgeleend" : "Beschikbaar"}
                </TableCell>
                <TableCell>
                  {volunteer
                    ? `${volunteer.firstName} ${volunteer.lastName}`
                    : "-"}
                </TableCell>
                <TableCell>
                  {item.isCheckedOut && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReturn(item.id)}
                    >
                      Retourneren
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
