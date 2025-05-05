import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Member } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, List, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Veldnamen en labels definitie
const FIELDS = [
  { id: "memberNumber", label: "Lidnummer", enabled: true },
  { id: "firstName", label: "Voornaam", enabled: true },
  { id: "lastName", label: "Achternaam", enabled: true },
  { id: "birthDate", label: "Geboortedatum", enabled: true },
  { id: "email", label: "E-mailadres", enabled: true },
  { id: "phoneNumber", label: "Telefoonnummer", enabled: true },
  { id: "accountNumber", label: "Rekeningnummer", enabled: true },
  { id: "paymentStatus", label: "Betaalstatus", enabled: true },
  { id: "registrationDate", label: "Registratiedatum", enabled: true },
  { id: "notes", label: "Notities", enabled: true },
];

export default function ExportPage() {
  const [exportFields, setExportFields] = useState(FIELDS);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const { toast } = useToast();
  
  // Haal alle leden op
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/members");
      return response.json();
    }
  });
  
  // Filter leden op basis van betaalstatus
  const filteredMembers = members.filter(member => {
    if (paymentFilter === "all") return true;
    if (paymentFilter === "paid") return member.paymentStatus === true;
    if (paymentFilter === "unpaid") return member.paymentStatus === false;
    return true;
  });
  
  // Toggle een veld aan/uit
  const toggleField = (fieldId: string) => {
    setExportFields(fields => 
      fields.map(field => 
        field.id === fieldId 
          ? { ...field, enabled: !field.enabled } 
          : field
      )
    );
  };
  
  // Selecteer alle velden
  const selectAllFields = () => {
    setExportFields(fields => 
      fields.map(field => ({ ...field, enabled: true }))
    );
  };
  
  // Deselecteer alle velden
  const deselectAllFields = () => {
    setExportFields(fields => 
      fields.map(field => ({ ...field, enabled: false }))
    );
  };
  
  // Exporteer naar Excel
  const exportToExcel = () => {
    // Bouw de export data
    const exportData = filteredMembers.map(member => {
      const memberData: Record<string, any> = {};
      
      // Voeg alleen geselecteerde velden toe
      exportFields.forEach(field => {
        if (field.enabled) {
          switch (field.id) {
            case "birthDate":
              memberData[field.label] = member.birthDate 
                ? new Date(member.birthDate).toLocaleDateString() 
                : "";
              break;
            case "registrationDate":
              memberData[field.label] = new Date(member.registrationDate).toLocaleDateString();
              break;
            case "paymentStatus":
              memberData[field.label] = member.paymentStatus ? "Betaald" : "Niet betaald";
              break;
            default:
              memberData[field.label] = member[field.id as keyof Member] || "";
          }
        }
      });
      
      return memberData;
    });
    
    // Maak Excel werkblad en voeg data toe
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leden");
    
    // Genereer bestandsnaam met datum
    const date = new Date().toISOString().split('T')[0];
    const filename = `ledenlijst_${date}.xlsx`;
    
    // Download het bestand
    XLSX.writeFile(workbook, filename);
    
    toast({
      title: "Export voltooid",
      description: `De ledenlijst is geëxporteerd naar ${filename}`,
    });
  };
  
  // Exporteer naar CSV
  const exportToCsv = () => {
    // Bouw de export data
    const exportData = filteredMembers.map(member => {
      const memberData: Record<string, any> = {};
      
      // Voeg alleen geselecteerde velden toe
      exportFields.forEach(field => {
        if (field.enabled) {
          switch (field.id) {
            case "birthDate":
              memberData[field.label] = member.birthDate 
                ? new Date(member.birthDate).toLocaleDateString() 
                : "";
              break;
            case "registrationDate":
              memberData[field.label] = new Date(member.registrationDate).toLocaleDateString();
              break;
            case "paymentStatus":
              memberData[field.label] = member.paymentStatus ? "Betaald" : "Niet betaald";
              break;
            default:
              memberData[field.label] = member[field.id as keyof Member] || "";
          }
        }
      });
      
      return memberData;
    });
    
    // Maak CSV string
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Download als CSV bestand
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const date = new Date().toISOString().split('T')[0];
    const filename = `ledenlijst_${date}.csv`;
    
    // Download via link
    if (navigator.msSaveBlob) { // IE 10+
      navigator.msSaveBlob(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    toast({
      title: "Export voltooid",
      description: `De ledenlijst is geëxporteerd naar ${filename}`,
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exporteren</h1>
          <p className="text-muted-foreground">
            Exporteer de ledenlijst naar verschillende bestandsformaten.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="outline">
              Terug naar Dashboard
            </Button>
          </Link>
        </div>
      </div>
      
      <Tabs defaultValue="excel">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="excel">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel Spreadsheet (.xlsx)
          </TabsTrigger>
          <TabsTrigger value="csv">
            <FileText className="mr-2 h-4 w-4" />
            CSV Bestand (.csv)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="excel" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Exporteren naar Excel</CardTitle>
              <CardDescription>
                Exporteer de ledenlijst naar een Excel spreadsheet (.xlsx).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Exporteer instellingen</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="payment-filter">Filter op betaling</Label>
                      <Select 
                        value={paymentFilter} 
                        onValueChange={setPaymentFilter}
                      >
                        <SelectTrigger id="payment-filter">
                          <SelectValue placeholder="Filter op betaling" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle leden</SelectItem>
                          <SelectItem value="paid">Alleen betaald</SelectItem>
                          <SelectItem value="unpaid">Alleen niet betaald</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllFields}>
                        <Check className="mr-2 h-4 w-4" />
                        Alles selecteren
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAllFields}>
                        Alles deselecteren
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Selecteer velden</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {exportFields.map((field) => (
                      <div className="flex items-center space-x-2" key={field.id}>
                        <Checkbox
                          id={`field-${field.id}`}
                          checked={field.enabled}
                          onCheckedChange={() => toggleField(field.id)}
                        />
                        <Label htmlFor={`field-${field.id}`}>{field.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4">
                  <h3 className="text-sm font-medium mb-2">Voorvertoning</h3>
                  <div className="rounded-md border overflow-hidden">
                    {isLoading ? (
                      <div className="p-4">
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ) : (
                      <div className="p-4 text-sm">
                        <p className="font-medium">Deze export bevat:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>{filteredMembers.length} leden</li>
                          <li>{exportFields.filter(f => f.enabled).length} velden</li>
                          <li>
                            Gefilterd op betaald: {
                              paymentFilter === "all" 
                                ? "Alle leden" 
                                : paymentFilter === "paid" 
                                  ? "Alleen betaalde leden" 
                                  : "Alleen niet betaalde leden"
                            }
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={exportToExcel}
                    disabled={isLoading || exportFields.filter(f => f.enabled).length === 0}
                    className="bg-[#963E56] hover:bg-[#963E56]/90 text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exporteren naar Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="csv" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Exporteren naar CSV</CardTitle>
              <CardDescription>
                Exporteer de ledenlijst naar een CSV bestand (.csv).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Exporteer instellingen</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="payment-filter-csv">Filter op betaling</Label>
                      <Select 
                        value={paymentFilter} 
                        onValueChange={setPaymentFilter}
                      >
                        <SelectTrigger id="payment-filter-csv">
                          <SelectValue placeholder="Filter op betaling" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle leden</SelectItem>
                          <SelectItem value="paid">Alleen betaald</SelectItem>
                          <SelectItem value="unpaid">Alleen niet betaald</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllFields}>
                        <Check className="mr-2 h-4 w-4" />
                        Alles selecteren
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAllFields}>
                        Alles deselecteren
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Selecteer velden</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {exportFields.map((field) => (
                      <div className="flex items-center space-x-2" key={`csv-${field.id}`}>
                        <Checkbox
                          id={`csv-field-${field.id}`}
                          checked={field.enabled}
                          onCheckedChange={() => toggleField(field.id)}
                        />
                        <Label htmlFor={`csv-field-${field.id}`}>{field.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4">
                  <h3 className="text-sm font-medium mb-2">Voorvertoning</h3>
                  <div className="rounded-md border overflow-hidden">
                    {isLoading ? (
                      <div className="p-4">
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ) : (
                      <div className="p-4 text-sm">
                        <p className="font-medium">Deze export bevat:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>{filteredMembers.length} leden</li>
                          <li>{exportFields.filter(f => f.enabled).length} velden</li>
                          <li>
                            Gefilterd op betaald: {
                              paymentFilter === "all" 
                                ? "Alle leden" 
                                : paymentFilter === "paid" 
                                  ? "Alleen betaalde leden" 
                                  : "Alleen niet betaalde leden"
                            }
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={exportToCsv}
                    disabled={isLoading || exportFields.filter(f => f.enabled).length === 0}
                    className="bg-[#963E56] hover:bg-[#963E56]/90 text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exporteren naar CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}