import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Member, InsertMember, insertMemberSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, Plus, Edit, Trash2, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPhoneNumber } from "@/lib/utils";
import * as XLSX from "xlsx";

// Component voor lidmaatschapsbeheer
export default function Members() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPaid, setFilterPaid] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/members");
      return response.json();
    }
  });

  // Mutation om een nieuw lid toe te voegen
  const createMemberMutation = useMutation({
    mutationFn: async (newMember: Omit<InsertMember, 'id' | 'registrationDate'>) => {
      const response = await apiRequest("POST", "/api/members", newMember);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Lid toegevoegd",
        description: "Het nieuwe lid is succesvol toegevoegd.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij toevoegen",
        description: `Er is een fout opgetreden: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation om een lid bij te werken
  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, member }: { id: number; member: Partial<Omit<InsertMember, 'id' | 'registrationDate'>> }) => {
      const response = await apiRequest("PUT", `/api/members/${id}`, member);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Lid bijgewerkt",
        description: "De gegevens van het lid zijn succesvol bijgewerkt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij bijwerken",
        description: `Er is een fout opgetreden: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation om een lid te verwijderen
  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "Lid verwijderd",
        description: "Het lid is succesvol verwijderd.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij verwijderen",
        description: `Er is een fout opgetreden: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Filter leden op basis van zoekopdracht en betalingsstatus
  const filteredMembers = members.filter(member => {
    const matchesSearch = searchQuery === "" || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.memberNumber?.toString().includes(searchQuery) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      member.phoneNumber.includes(searchQuery);
    
    const matchesPaidStatus = filterPaid === "all" || 
      (filterPaid === "paid" && member.paymentStatus === true) ||
      (filterPaid === "unpaid" && member.paymentStatus === false);
    
    return matchesSearch && matchesPaidStatus;
  });

  // Exporteer ledenlijst naar Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredMembers.map(member => ({
      "Lidnummer": member.memberNumber,
      "Voornaam": member.firstName,
      "Achternaam": member.lastName,
      "E-mail": member.email || "",
      "Telefoonnummer": member.phoneNumber || "",
      "Betaalstatus": member.paymentStatus ? "Betaald" : "Niet betaald",
      "Notities": member.notes || ""
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leden");
    
    // Genereer bestandsnaam met datum
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `ledenlijst_${date}.xlsx`);
    
    toast({
      title: "Lijst geëxporteerd",
      description: "De ledenlijst is succesvol geëxporteerd naar Excel.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ledenbeheer</h1>
          <p className="text-muted-foreground">
            Beheer de leden van Moskee MEFEN.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-[#963E56] hover:bg-[#963E56]/90 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Nieuw lid
          </Button>
          <Button
            variant="outline"
            onClick={exportToExcel}
            className="border-[#963E56] text-[#963E56] hover:bg-[#963E56]/10"
          >
            <Download className="mr-2 h-4 w-4" /> Exporteren
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Leden</CardTitle>
            <CardDescription>
              {filteredMembers.length} leden in totaal, {members.filter(m => m.paymentStatus).length} hebben betaald.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Zoeken op naam, lidnummer, e-mail of telefoon..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={filterPaid}
                onValueChange={(value) => setFilterPaid(value)}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter op betaling" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle leden</SelectItem>
                  <SelectItem value="paid">Betaald</SelectItem>
                  <SelectItem value="unpaid">Niet betaald</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lidnummer</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead className="hidden md:table-cell">E-mail</TableHead>
                    <TableHead className="hidden md:table-cell">Telefoon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex justify-center items-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-[#963E56]" />
                          <span className="ml-2">Leden laden...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Geen leden gevonden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.memberNumber}
                        </TableCell>
                        <TableCell>
                          {member.firstName} {member.lastName}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {member.email || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {member.phoneNumber ? formatPhoneNumber(member.phoneNumber) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={member.paymentStatus ? "default" : "outline"}
                            className={member.paymentStatus ? "bg-green-500 hover:bg-green-600" : ""}
                          >
                            {member.paymentStatus ? "Betaald" : "Niet betaald"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedMember(member);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Bewerken</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedMember(member);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                              <span className="sr-only">Verwijderen</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Dialoog voor het toevoegen van een nieuw lid */}
      <MemberFormDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={(data) => createMemberMutation.mutate(data)}
        isSubmitting={createMemberMutation.isPending}
        title="Nieuw lid toevoegen"
        description="Vul de gegevens in om een nieuw lid toe te voegen."
        submitLabel="Toevoegen"
      />
      
      {/* Dialoog voor het bewerken van een lid */}
      {selectedMember && (
        <MemberFormDialog 
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSubmit={(data) => updateMemberMutation.mutate({ id: selectedMember.id, member: data })}
          isSubmitting={updateMemberMutation.isPending}
          title="Lid bewerken"
          description="Bewerk de gegevens van dit lid."
          submitLabel="Opslaan"
          defaultValues={selectedMember}
        />
      )}
      
      {/* Dialoog voor het verwijderen van een lid */}
      {selectedMember && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lid verwijderen</DialogTitle>
              <DialogDescription>
                Weet je zeker dat je het lid "{selectedMember.firstName} {selectedMember.lastName}" wilt verwijderen?
                Deze actie kan niet ongedaan worden gemaakt.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteMemberMutation.mutate(selectedMember.id)}
                disabled={deleteMemberMutation.isPending}
              >
                {deleteMemberMutation.isPending ? "Bezig met verwijderen..." : "Verwijderen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Form validator schema
const memberFormSchema = insertMemberSchema.extend({
  phoneNumber: z.string().min(1, "Telefoonnummer is verplicht"),
  email: z.string().email("Voer een geldig e-mailadres in").optional().or(z.literal('')),
  notes: z.string().optional(),
}).omit({ id: true, registrationDate: true });

// Dialoog met formulier voor het toevoegen/bewerken van een lid
function MemberFormDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isSubmitting, 
  title, 
  description, 
  submitLabel,
  defaultValues 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: z.infer<typeof memberFormSchema>) => void;
  isSubmitting: boolean;
  title: string;
  description: string;
  submitLabel: string;
  defaultValues?: Partial<Member>;
}) {
  // Form setup with react-hook-form and zod validation
  const form = useForm<z.infer<typeof memberFormSchema>>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: defaultValues ? {
      firstName: defaultValues.firstName || "",
      lastName: defaultValues.lastName || "",
      email: defaultValues.email || "",
      phoneNumber: defaultValues.phoneNumber || "",
      paymentStatus: defaultValues.paymentStatus || false,
      notes: defaultValues.notes || "",
      memberNumber: defaultValues.memberNumber
    } : {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      paymentStatus: false,
      notes: "",
      memberNumber: 0 // Dit wordt overschreven door de server
    }
  });

  // Handle form submission
  function handleSubmit(data: z.infer<typeof memberFormSchema>) {
    onSubmit(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="E-mail (optioneel)" {...field} />
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
            </div>
            
            <FormField
              control={form.control}
              name="paymentStatus"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Betaald</FormLabel>
                    <FormDescription>
                      Geef aan of dit lid heeft betaald.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notities</FormLabel>
                  <FormControl>
                    <Input placeholder="Notities (optioneel)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
              <Button 
                type="submit" 
                className="bg-[#963E56] hover:bg-[#963E56]/90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Bezig..." : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}