import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ref, push, remove, update, onValue } from "firebase/database";
import { UserPlus, Edit2, Trash2, Search, Users, CheckSquare, Square, Settings2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { logUserAction } from "@/lib/activity-logger";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

const volunteerSchema = z.object({
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  phoneNumber: z.string().min(1, "Telefoonnummer is verplicht"),
});

type Volunteer = z.infer<typeof volunteerSchema> & { id: string };

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [deleteVolunteerId, setDeleteVolunteerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof volunteerSchema>>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
    },
  });

  useState(() => {
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

  const onSubmit = async (data: z.infer<typeof volunteerSchema>) => {
    try {
      if (editingVolunteer) {
        await update(ref(db, `volunteers/${editingVolunteer.id}`), data);
        await logUserAction(
          "Vrijwilliger bijgewerkt",
          `${'Bijgewerkt'}: ${data.firstName} ${data.lastName}`,
          {
            type: "volunteer",
            id: editingVolunteer?.id,
            name: `${data.firstName} ${data.lastName}`
          }
        );
        toast({
          title: "Succes",
          description: "Vrijwilliger succesvol bijgewerkt",
        });
      } else {
        await push(ref(db, "volunteers"), data);
        await logUserAction(
          "Vrijwilliger toegevoegd",
          `${'Toegevoegd'}: ${data.firstName} ${data.lastName}`,
          {
            type: "volunteer",
            id: null,
            name: `${data.firstName} ${data.lastName}`
          }
        );
        toast({
          title: "Succes",
          description: "Vrijwilliger succesvol toegevoegd",
        });
      }
      form.reset();
      setEditingVolunteer(null);
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon vrijwilliger niet opslaan",
      });
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      const volunteersToDelete = volunteers.filter(v => ids.includes(v.id));
      await Promise.all(ids.map(id => remove(ref(db, `volunteers/${id}`))));
      await logUserAction(
        "Vrijwilliger(s) verwijderd",
        `${ids.length} vrijwilliger(s) verwijderd`,
        {
          type: "volunteer",
          id: ids.join(','),
          name: volunteersToDelete.map(v => `${v.firstName} ${v.lastName}`).join(', ')
        }
      );
      toast({
        title: "Succes",
        description: `${ids.length} vrijwilliger(s) succesvol verwijderd`,
      });
      setDeleteVolunteerId(null);
      setSelectedVolunteers([]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon vrijwilliger(s) niet verwijderen",
      });
    }
  };

  const handleEdit = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer);
    form.reset({
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      phoneNumber: volunteer.phoneNumber,
    });
    setDialogOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedVolunteers.length === filteredVolunteers.length) {
      setSelectedVolunteers([]);
    } else {
      setSelectedVolunteers(filteredVolunteers.map(v => v.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedVolunteers(prev =>
      prev.includes(id)
        ? prev.filter(v => v !== id)
        : [...prev, id]
    );
  };

  const filteredVolunteers = volunteers.filter(volunteer => {
    const searchString = `${volunteer.firstName} ${volunteer.lastName} ${volunteer.phoneNumber}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Vrijwilligers</h1>
      </div>

      {/* Statistics Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-primary/80" />
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Totaal Aantal Vrijwilligers</h3>
              <p className="text-2xl font-bold text-primary">{volunteers.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Add Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Zoeken..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 self-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6BB85C] hover:bg-[#6BB85C]/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Vrijwilliger Toevoegen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingVolunteer ? "Vrijwilliger Bewerken" : "Nieuwe Vrijwilliger"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voornaam</FormLabel>
                        <FormControl>
                          <Input placeholder="Voornaam" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Achternaam</FormLabel>
                        <FormControl>
                          <Input placeholder="Achternaam" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefoonnummer</FormLabel>
                        <FormControl>
                          <Input placeholder="Telefoonnummer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    {editingVolunteer ? "Bijwerken" : "Toevoegen"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`${isEditMode ? "bg-primary/10 text-primary" : ""}`}
                >
                  <Settings2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isEditMode ? "Bewerken afsluiten" : "Lijst bewerken"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
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
                    {selectedVolunteers.length === filteredVolunteers.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              )}
              <TableHead>Voornaam</TableHead>
              <TableHead>Achternaam</TableHead>
              <TableHead>Telefoonnummer</TableHead>
              {isEditMode && <TableHead className="w-[100px]">Acties</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVolunteers.map((volunteer) => (
              <TableRow key={volunteer.id}>
                {isEditMode && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleSelect(volunteer.id)}
                      className="hover:bg-transparent"
                    >
                      {selectedVolunteers.includes(volunteer.id) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                )}
                <TableCell>{volunteer.firstName}</TableCell>
                <TableCell>{volunteer.lastName}</TableCell>
                <TableCell>{volunteer.phoneNumber}</TableCell>
                {isEditMode && (
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(volunteer)}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteVolunteerId(volunteer.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filteredVolunteers.length === 0 && (
              <TableRow>
                <TableCell 
                  colSpan={isEditMode ? 5 : 4} 
                  className="text-center py-6 text-muted-foreground"
                >
                  Geen vrijwilligers gevonden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Actions */}
      {isEditMode && selectedVolunteers.length > 0 && (
        <div className="fixed bottom-4 right-4 flex items-center gap-3 bg-white p-4 rounded-lg shadow-lg border animate-in slide-in-from-bottom-2">
          <span className="text-sm text-muted-foreground">
            {selectedVolunteers.length} geselecteerd
          </span>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="destructive"
            onClick={() => setDeleteVolunteerId("bulk")}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Verwijderen
          </Button>
        </div>
      )}

      <AlertDialog
        open={!!deleteVolunteerId}
        onOpenChange={() => setDeleteVolunteerId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteVolunteerId === "bulk"
                ? `Je staat op het punt om ${selectedVolunteers.length} vrijwilliger(s) te verwijderen. Deze actie kan niet ongedaan worden gemaakt.`
                : "Deze actie kan niet ongedaan worden gemaakt. Dit zal de vrijwilliger permanent verwijderen."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVolunteerId === "bulk"
                ? handleDelete(selectedVolunteers)
                : deleteVolunteerId && handleDelete([deleteVolunteerId])
              }
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