import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { updateUserRole } from "@/lib/roles";
import { db, auth } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, UserCog } from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

type DatabaseUser = {
  uid: string;
  email: string;
  admin: boolean;
};

const newUserSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens bevatten"),
  isAdmin: z.boolean().default(false),
});

type NewUserFormData = z.infer<typeof newUserSchema>;

export default function Settings() {
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const form = useForm<NewUserFormData>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      isAdmin: false,
    },
  });

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.entries(data).map(([uid, userData]: [string, any]) => ({
          uid,
          ...userData
        }));
        setUsers(usersList);
      } else {
        setUsers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (uid: string, email: string, newIsAdmin: boolean) => {
    try {
      await updateUserRole(uid, email, newIsAdmin);
      toast({
        title: "Succes",
        description: `Gebruiker ${email} is nu ${newIsAdmin ? 'admin' : 'medewerker'}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon gebruikersrol niet wijzigen",
      });
    }
  };

  const onSubmit = async (data: NewUserFormData) => {
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);

      // Add user to Firebase Realtime Database with role
      await updateUserRole(userCredential.user.uid, data.email, data.isAdmin);

      toast({
        title: "Succes",
        description: "Nieuwe gebruiker is succesvol aangemaakt",
      });
      form.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: error.message || "Kon gebruiker niet aanmaken",
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Je hebt geen toegang tot deze pagina.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="h-8 w-8 text-[#963E56]" />
        <h1 className="text-3xl font-bold text-[#963E56]">Instellingen</h1>
      </div>

      <Card className="shadow-md">
        <CardHeader className="border-b bg-gray-50/80">
          <CardTitle className="flex items-center gap-2 text-[#963E56]">
            <UserCog className="h-5 w-5" />
            Gebruikersbeheer
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Add New User Form */}
            <div className="rounded-lg border p-4 bg-gray-50/30">
              <h3 className="text-lg font-medium mb-4">Nieuwe Gebruiker Toevoegen</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mailadres</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="E-mailadres" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wachtwoord</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Wachtwoord" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end gap-4">
                    <Button
                      type="submit"
                      className="bg-[#963E56] hover:bg-[#963E56]/90"
                    >
                      Gebruiker Toevoegen
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            {/* Users Table */}
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead>E-mailadres</TableHead>
                    <TableHead>Huidige Rol</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.admin ? 'Admin' : 'Medewerker'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleRoleChange(user.uid, user.email, !user.admin)}
                          variant="outline"
                          className="text-[#963E56] hover:text-[#963E56] hover:bg-[#963E56]/10"
                        >
                          Maak {user.admin ? 'Medewerker' : 'Admin'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-gray-500">
                        Geen gebruikers gevonden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}