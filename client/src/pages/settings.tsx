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
import { logUserAction, UserActionTypes, UserAction, getUserLogs } from "@/lib/activity-logger";

// ... bestaande type definities en schema's blijven hetzelfde ...

export default function Settings() {
  // ... bestaande state variabelen blijven hetzelfde ...

  const [userLogs, setUserLogs] = useState<(UserAction & { id: string })[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try {
        const logs = await getUserLogs({
          startDate: selectedDate,
          userId: selectedUser === "all" ? undefined : selectedUser,
          category: selectedCategory === "all" ? undefined : selectedCategory
        });
        setUserLogs(logs as (UserAction & { id: string })[]);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setIsLoadingLogs(false);
      }
    };

    fetchLogs();
  }, [selectedDate, selectedUser, selectedCategory]);

  // ... andere bestaande functies blijven hetzelfde ...

  // Verbeterde categorieën voor logs
  const categories = [
    { id: "all", label: "Alle activiteiten" },
    { id: "auth", label: "Authenticatie" },
    { id: "planning", label: "Planning" },
    { id: "volunteer", label: "Vrijwilligers" },
    { id: "material", label: "Materialen" },
    { id: "room", label: "Ruimtes" },
    { id: "user", label: "Gebruikers" },
    { id: "export", label: "Export/Import" },
  ];

  const getActionIcon = (action: string) => {
    if (action.includes('materiaal')) return '📦';
    if (action.includes('vrijwilliger')) return '👤';
    if (action.includes('planning')) return '📅';
    if (action.includes('gebruiker')) return '👥';
    if (action.includes('ingelogd') || action.includes('uitgelogd') || action.includes('wachtwoord')) return '🔑';
    if (action.includes('export')) return '📤';
    if (action.includes('import')) return '📥';
    if (action.includes('pdf') || action.includes('PDF')) return '📄';
    if (action.includes('ruimte')) return '🏢';
    if (action.includes('filter')) return '🔍';
    if (action.includes('zoek')) return '🔎';
    if (action.includes('bulk')) return '📚';
    if (action.includes('pagina') || action.includes('zijbalk')) return '📱';
    if (action.includes('modal')) return '💭';
    if (action.includes('bewerkingsmodus')) return '✏️';
    if (action.includes('sortering')) return '↕️';
    if (action.includes('vernieuwd')) return '🔄';
    return '📝';
  };

  const getActionDescription = (log: UserAction) => {
    const type = log.targetType?.toLowerCase();
    const name = log.targetName || '-';

    switch (type) {
      case 'material':
        return `${name}`;
      case 'volunteer':
      case 'planning':
      case 'user':
      case 'auth':
        return name;
      case 'export':
      case 'import':
        return `${name} (${format(new Date(log.timestamp), 'dd/MM/yyyy')})`;
      default:
        return log.details || name;
    }
  };

  // ... Rest van de bestaande code blijft hetzelfde tot aan de activity logs sectie ...

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      {/* ... Bestaande header en andere secties blijven hetzelfde ... */}

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
                <CardDescription>
                  Filter de activiteiten op gebruiker, datum en type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                  <div className="w-full sm:w-auto">
                    <label className="text-sm font-medium mb-1.5 block">
                      Selecteer Gebruiker
                    </label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
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
                    <label className="text-sm font-medium mb-1.5 block">
                      Selecteer Datum
                    </label>
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

                  <div className="w-full sm:w-auto">
                    <label className="text-sm font-medium mb-1.5 block">
                      Type Activiteit
                    </label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Alle activiteiten" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDate(new Date());
                      setSelectedUser("all");
                      setSelectedCategory("all");
                    }}
                    className="self-stretch sm:self-auto"
                  >
                    Reset Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 rounded-lg border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="w-[160px] sm:w-[180px]">Tijdstip</TableHead>
                      <TableHead>Gebruiker</TableHead>
                      <TableHead>Activiteit</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingLogs ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <Activity className="h-8 w-8 animate-spin" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : userLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Geen activiteiten gevonden voor de geselecteerde filters</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      userLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap font-medium text-xs sm:text-sm">
                            {format(new Date(log.timestamp), "d MMM yyyy HH:mm:ss", { locale: nl })}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {log.userEmail}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg hidden sm:inline">{getActionIcon(log.action)}</span>
                              <span className="text-xs sm:text-sm">{log.action}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm max-w-[200px] sm:max-w-none truncate">
                            {getActionDescription(log)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-gray-500 mt-4">
              <p>
                Totaal aantal activiteiten: {userLogs.length}
              </p>
              <p className="text-xs">
                Activiteiten worden automatisch 30 dagen bewaard
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ... Rest van de bestaande code (modals etc.) blijft hetzelfde ... */}
    </div>
  );
}