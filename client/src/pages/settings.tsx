import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { updateUserRole } from "@/lib/roles";
import { db, auth } from "@/lib/firebase";
import { ref, onValue, remove } from "firebase/database";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, UserPlus, Users, Activity, CalendarIcon } from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { logUserAction, UserActionTypes, UserAction } from "@/lib/activity-logger";

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

const passwordChangeSchema = z.object({
  newPassword: z.string().min(6, "Wachtwoord moet minimaal 6 tekens bevatten"),
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export default function Settings() {
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [changingPasswordFor, setChangingPasswordFor] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<DatabaseUser | null>(null);
  const [userLogs, setUserLogs] = useState<(UserAction & { id: string })[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const { toast } = useToast();
  const { isAdmin } = useRole();

  const form = useForm<NewUserFormData>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      isAdmin: false,
    },
  });

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
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

  useEffect(() => {
    const logsRef = ref(db, "user_logs");
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logsList = Object.entries(data).map(([id, log]: [string, any]) => ({
          id,
          ...log
        }));
        setUserLogs(logsList);
      } else {
        setUserLogs([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredLogs = userLogs.filter(log => {
    const logDate = new Date(log.timestamp).toISOString().split('T')[0];
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const dateMatch = logDate === selectedDateStr;
    const userMatch = selectedUser === "all" || log.userEmail === selectedUser;
    return dateMatch && userMatch;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleRoleChange = async (uid: string, email: string, newIsAdmin: boolean) => {
    try {
      await updateUserRole(uid, email, newIsAdmin);
      await logUserAction(
        UserActionTypes.USER_ROLE_UPDATE,
        `${email} is nu ${newIsAdmin ? 'administrator' : 'medewerker'}`,
        {
          type: "user",
          id: uid,
          name: email
        }
      );
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
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateUserRole(userCredential.user.uid, data.email, data.isAdmin);
      await logUserAction(
        UserActionTypes.USER_CREATE,
        `Nieuwe gebruiker ${data.email} aangemaakt als ${data.isAdmin ? 'administrator' : 'medewerker'}`,
        {
          type: "user",
          id: userCredential.user.uid,
          name: data.email
        }
      );

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

  const handlePasswordChange = async (data: PasswordChangeFormData) => {
    if (!changingPasswordFor) return;

    try {
      await sendPasswordResetEmail(auth, changingPasswordFor);
      await logUserAction(
        "Wachtwoord reset",
        `Wachtwoord reset link verstuurd naar ${changingPasswordFor}`
      );

      toast({
        title: "Succes",
        description: "Een wachtwoord reset link is verstuurd naar de gebruiker",
      });
      setChangingPasswordFor(null);
      passwordForm.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: error.message || "Kon wachtwoord niet wijzigen",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      await remove(ref(db, `users/${deletingUser.uid}`));
      await logUserAction(
        UserActionTypes.USER_DELETE,
        `Gebruiker ${deletingUser.email} is verwijderd`,
        {
          type: "user",
          id: deletingUser.uid,
          name: deletingUser.email
        }
      );

      toast({
        title: "Succes",
        description: `Gebruiker ${deletingUser.email} is verwijderd`,
      });
      setDeletingUser(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: error.message || "Kon gebruiker niet verwijderen",
      });
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('materiaal')) return '📦';
    if (action.includes('vrijwilliger')) return '👤';
    if (action.includes('planning')) return '📅';
    if (action.includes('gebruiker')) return '👥';
    if (action.includes('ingelogd') || action.includes('uitgelogd')) return '🔑';
    if (action.includes('export')) return '📤';
    if (action.includes('import')) return '📥';
    if (action.includes('pdf') || action.includes('PDF')) return '📄';
    return '📝';
  };

  const getActionDescription = (log: UserAction) => {
    const type = log.targetType?.toLowerCase();
    const name = log.targetName || '-';

    switch (type) {
      case 'material':
        if (log.materialNumber) {
          return `${name} #${log.materialNumber}${log.volunteerName ? ` (${log.volunteerName})` : ''}`;
        }
        return name;

      case 'volunteer':
      case 'planning':
      case 'user':
      case 'auth':
        return name;

      case 'export':
      case 'import':
        return `${name} (${format(new Date(log.timestamp), 'dd/MM/yyyy')})`;

      default:
        return name;
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
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Instellingen</h1>
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="add-user" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-6 py-4 bg-gray-50/80 hover:bg-gray-50/90 [&[data-state=open]>svg]:rotate-180">
            <div className="flex items-center gap-2 text-[#963E56]">
              <UserPlus className="h-5 w-5" />
              <span className="font-semibold">Medewerker Toevoegen</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-6">
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
                              placeholder="naam@voorbeeld.be"
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
                              placeholder="Minimaal 6 tekens, gebruik hoofdletters, cijfers en symbolen"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="bg-[#963E56] hover:bg-[#963E56]/90"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Medewerker Toevoegen
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="manage-users" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-6 py-4 bg-gray-50/80 hover:bg-gray-50/90 [&[data-state=open]>svg]:rotate-180">
            <div className="flex items-center gap-2 text-[#963E56]">
              <Users className="h-5 w-5" />
              <span className="font-semibold">Gebruikersbeheer</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-6">
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
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.admin
                              ? 'bg-[#963E56]/10 text-[#963E56]'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.admin ? 'Admin' : 'Medewerker'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleRoleChange(user.uid, user.email, !user.admin)}
                              variant="outline"
                              size="sm"
                              className="min-w-[140px] text-[#963E56] hover:text-[#963E56] hover:bg-[#963E56]/10"
                            >
                              Maak {user.admin ? 'Medewerker' : 'Admin'}
                            </Button>
                            <Button
                              onClick={() => setChangingPasswordFor(user.email)}
                              variant="outline"
                              size="sm"
                              className="min-w-[140px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Reset Wachtwoord
                            </Button>
                            <Button
                              onClick={() => setDeletingUser(user)}
                              variant="outline"
                              size="sm"
                              className="min-w-[140px] text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Verwijderen
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Geen gebruikers gevonden</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="activity-logs" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-6 py-4 bg-gray-50/80 hover:bg-gray-50/90 [&[data-state=open]>svg]:rotate-180">
            <div className="flex items-center gap-2 text-[#963E56]">
              <Activity className="h-5 w-5" />
              <span className="font-semibold">Gebruikersactiviteit</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                    <div className="w-full sm:w-auto">
                      <label className="text-sm font-medium mb-1.5 block">Selecteer Gebruiker</label>
                      <Select
                        value={selectedUser}
                        onValueChange={setSelectedUser}
                      >
                        <SelectTrigger className="w-full sm:w-[250px]">
                          <SelectValue placeholder="Alle gebruikers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle gebruikers</SelectItem>
                          {users.map(user => (
                            <SelectItem key={user.email} value={user.email}>
                              {user.email} {user.admin ? '(Admin)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full sm:w-auto">
                      <label className="text-sm font-medium mb-1.5 block">Selecteer Datum</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full sm:w-[240px] justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? (
                              format(selectedDate, "d MMMM yyyy", { locale: nl })
                            ) : (
                              <span>Kies een datum</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            initialFocus
                            locale={nl}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedDate(new Date());
                        setSelectedUser("all");
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 rounded-lg border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="w-[180px]">Tijdstip</TableHead>
                      <TableHead>Gebruiker</TableHead>
                      <TableHead>Activiteit</TableHead>
                      <TableHead>Object</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {format(new Date(log.timestamp), "d MMM yyyy HH:mm:ss", { locale: nl })}
                        </TableCell>
                        <TableCell>{log.userEmail}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getActionIcon(log.action)}</span>
                            <span>{log.action}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getActionDescription(log)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Geen activiteiten gevonden voor de geselecteerde filters</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Totaal aantal activiteiten: {filteredLogs.length}
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {changingPasswordFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="border-b">
              <CardTitle className="text-[#963E56]">Wachtwoord Reset</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
                  <p>Er wordt een wachtwoord reset link gestuurd naar:</p>
                  <p className="font-medium mt-1">{changingPasswordFor}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setChangingPasswordFor(null);
                      passwordForm.reset();
                    }}
                  >
                    Annuleren
                  </Button>
                  <Button
                    onClick={() => handlePasswordChange(passwordForm.getValues())}
                    className="bg-[#963E56] hover:bg-[#963E56]/90"
                  >
                    Verstuur Reset Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="border-b">
              <CardTitle className="text-red-600">Gebruiker Verwijderen</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-red-50 text-red-800 p-4 rounded-lg text-sm">
                  <p className="font-medium">Weet u zeker dat u deze gebruiker wilt verwijderen?</p>
                  <p className="mt-2">{deletingUser.email}</p>
                  <p className="mt-2 text-red-600">
                    Let op: Deze actie kan niet ongedaan worden gemaakt.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeletingUser(null)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    onClick={handleDeleteUser}
                    variant="destructive"
                  >
                    Verwijderen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}