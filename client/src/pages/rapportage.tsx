import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from '@/components/ui/label';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { Loader2, Download, Calendar, ChevronDown, ChevronUp, Users, Wallet, CreditCard, Clock } from "lucide-react";
import MyPdfDocument from '@/components/pdf/report-pdf';
import { cn } from '@/lib/utils';
import { format, subMonths, differenceInYears, differenceInMonths } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Member } from '@shared/schema';
import { Separator } from '@/components/ui/separator';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";

// Helper functie om leeftijd te berekenen op basis van geboortedatum
function calculateAge(dateOfBirth: Date | string | null | undefined): number {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  return differenceInYears(new Date(), birthDate);
}

// Groepeer leden per leeftijdscategorie
function groupMembersByAgeRange(members: Member[]): { name: string; count: number; color: string }[] {
  const ageGroups = [
    { name: "0-12", min: 0, max: 12, color: "#4361EE" },
    { name: "13-17", min: 13, max: 17, color: "#4CC9F0" },
    { name: "18-24", min: 18, max: 24, color: "#4895EF" },
    { name: "25-34", min: 25, max: 34, color: "#3F37C9" },
    { name: "35-49", min: 35, max: 49, color: "#560BAD" },
    { name: "50-64", min: 50, max: 64, color: "#7209B7" },
    { name: "65+", min: 65, max: 120, color: "#B5179E" }
  ];

  // Initialiseer resultaten met 0 voor alle categorieën
  const results = ageGroups.map(group => ({ 
    name: group.name, 
    count: 0, 
    color: group.color 
  }));

  // Tel leden per leeftijdscategorie
  members.forEach(member => {
    const age = calculateAge(member.dateOfBirth);
    const group = ageGroups.find(g => age >= g.min && age <= g.max);
    if (group) {
      const index = results.findIndex(r => r.name === group.name);
      if (index >= 0) {
        results[index].count++;
      }
    }
  });

  return results;
}

// Bereken de geschatte inkomsten per lid per maand op basis van betalingstermijn
function calculateMemberRevenue(member: Member): number {
  const membershipTypes: Record<string, number> = {
    "regulier": 10,
    "student": 5,
    "gezin": 20,
    "verminderd tarief": 2.5,
    "erelid": 0
  };

  const paymentTermMultiplier: Record<string, number> = {
    "jaarlijks": 1/12,
    "halfjaarlijks": 1/6,
    "per kwartaal": 1/3,
    "maandelijks": 1
  };

  const baseAmount = membershipTypes[member.membershipType?.toLowerCase() || "regulier"] || 10;
  const multiplier = paymentTermMultiplier[member.paymentTerm?.toLowerCase() || "maandelijks"] || 1;
  
  return baseAmount * multiplier;
}

// Groepeer leden per lidmaatschapstype
function groupMembersByMembershipType(members: Member[]): { name: string; count: number; color: string }[] {
  const membershipTypes = [
    { name: "Regulier", color: "#2ECC71" },
    { name: "Student", color: "#3498DB" },
    { name: "Gezin", color: "#9B59B6" },
    { name: "Verminderd tarief", color: "#F1C40F" },
    { name: "Erelid", color: "#E67E22" }
  ];

  // Initialiseer resultaten
  const results = membershipTypes.map(type => ({ 
    name: type.name, 
    count: 0, 
    color: type.color 
  }));

  // Tel leden per type
  members.forEach(member => {
    const typeName = member.membershipType || "Regulier";
    const index = results.findIndex(r => 
      r.name.toLowerCase() === typeName.toLowerCase()
    );
    if (index >= 0) {
      results[index].count++;
    }
  });

  return results;
}

// Groepeer leden per betaalmethode
function groupMembersByPaymentMethod(members: Member[]): { name: string; count: number; color: string }[] {
  const paymentMethods = [
    { name: "Automatische incasso", color: "#2ECC71" },
    { name: "Overschrijving", color: "#3498DB" },
    { name: "Contant", color: "#9B59B6" },
    { name: "Anders", color: "#E67E22" }
  ];

  // Initialiseer resultaten
  const results = paymentMethods.map(method => ({ 
    name: method.name, 
    count: 0, 
    color: method.color 
  }));

  // Tel leden per betaalmethode
  members.forEach(member => {
    const methodName = member.paymentMethod || "Anders";
    const index = results.findIndex(r => 
      r.name.toLowerCase() === methodName.toLowerCase()
    );
    if (index >= 0) {
      results[index].count++;
    } else {
      // Als het een niet-standaard methode is, tel het bij 'Anders'
      const andersIndex = results.findIndex(r => r.name === "Anders");
      if (andersIndex >= 0) {
        results[andersIndex].count++;
      }
    }
  });

  return results;
}

// Groepeer leden per betalingstermijn
function groupMembersByPaymentTerm(members: Member[]): { name: string; count: number; color: string }[] {
  const paymentTerms = [
    { name: "Maandelijks", color: "#2ECC71" },
    { name: "Per kwartaal", color: "#3498DB" },
    { name: "Halfjaarlijks", color: "#9B59B6" },
    { name: "Jaarlijks", color: "#E67E22" }
  ];

  // Initialiseer resultaten
  const results = paymentTerms.map(term => ({ 
    name: term.name, 
    count: 0, 
    color: term.color 
  }));

  // Tel leden per betalingstermijn
  members.forEach(member => {
    const termName = member.paymentTerm || "Maandelijks";
    const index = results.findIndex(r => 
      r.name.toLowerCase() === termName.toLowerCase()
    );
    if (index >= 0) {
      results[index].count++;
    }
  });

  return results;
}

// Groepeer leden per geslacht
function groupMembersByGender(members: Member[]): { name: string; count: number; color: string }[] {
  return [
    { 
      name: "Man", 
      count: members.filter(m => m.gender?.toLowerCase() === "man").length,
      color: "#3498DB"
    },
    { 
      name: "Vrouw", 
      count: members.filter(m => m.gender?.toLowerCase() === "vrouw").length,
      color: "#E83E8C"
    }
  ];
}

// Groepeer leden per betaalstatus
function groupMembersByPaymentStatus(members: Member[]): { name: string; value: number; color: string }[] {
  return [
    { 
      name: "Betaald", 
      value: members.filter(m => m.paymentStatus?.toLowerCase() === "betaald").length,
      color: "#2ECC71"
    },
    { 
      name: "Niet betaald", 
      value: members.filter(m => 
        m.paymentStatus?.toLowerCase() === "niet betaald" || !m.paymentStatus
      ).length,
      color: "#E74C3C"
    }
  ];
}

// Analyseer lidmaatschapsgroei over de laatste 12 maanden
function analyzeMembershipGrowth(members: Member[]): any[] {
  const today = new Date();
  const results = [];

  // Genereer data voor de afgelopen 12 maanden
  for (let i = 0; i < 12; i++) {
    const monthDate = subMonths(today, i);
    const monthName = format(monthDate, 'MMM', { locale: nl });
    const monthYear = format(monthDate, 'MMM yyyy', { locale: nl });
    
    // Tel nieuwe leden deze maand
    const newMembersCount = members.filter(member => {
      if (!member.registrationDate) return false;
      const regDate = new Date(member.registrationDate);
      return regDate.getMonth() === monthDate.getMonth() && 
             regDate.getFullYear() === monthDate.getFullYear();
    }).length;

    results.unshift({
      maand: monthName,
      maand_jaar: monthYear,
      nieuwe_leden: newMembersCount
    });
  }

  return results;
}

// Bereken geschatte inkomsten per maand
function calculateMonthlyRevenue(members: Member[]): any[] {
  const today = new Date();
  const results = [];

  // Bereken totale maandelijkse inkomsten
  const totalMonthlyRevenue = members.reduce((total, member) => {
    return total + calculateMemberRevenue(member);
  }, 0);

  // Genereer data voor de afgelopen 12 maanden (geschat op basis van huidige leden)
  for (let i = 0; i < 12; i++) {
    const monthDate = subMonths(today, i);
    const monthName = format(monthDate, 'MMM', { locale: nl });
    
    // Voor eenvoudige berekening: neem aan dat de huidige inkomsten representatief zijn
    // In een echte applicatie zou je historische gegevens moeten gebruiken
    results.unshift({
      maand: monthName,
      inkomsten: Math.round(totalMonthlyRevenue)
    });
  }

  return results;
}

export default function Rapportage() {
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 6));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("overzicht");
  const [filterType, setFilterType] = useState<string | undefined>(undefined);

  // Haal ledendata op
  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ['/api/members'],
  });

  // Bereken alle statistieken voor rapportage
  const membersByAgeGroup = members ? groupMembersByAgeRange(members) : [];
  const membersByMembershipType = members ? groupMembersByMembershipType(members) : [];
  const membersByPaymentMethod = members ? groupMembersByPaymentMethod(members) : [];
  const membersByPaymentTerm = members ? groupMembersByPaymentTerm(members) : [];
  const membersByGender = members ? groupMembersByGender(members) : [];
  const membersByPaymentStatus = members ? groupMembersByPaymentStatus(members) : [];
  const membershipGrowth = members ? analyzeMembershipGrowth(members) : [];
  const monthlyRevenue = members ? calculateMonthlyRevenue(members) : [];

  // Bereken het aantal leden dat stemgerechtigd is (18+)
  const eligibleVoters = members ? members.filter(member => {
    if (!member.dateOfBirth) return false;
    return calculateAge(member.dateOfBirth) >= 18;
  }).length : 0;

  // Bereken gemiddelde leeftijd
  const averageAge = members && members.length > 0 
    ? Math.round(members.reduce((sum, member) => {
        return sum + (member.dateOfBirth ? calculateAge(member.dateOfBirth) : 0);
      }, 0) / members.length) 
    : 0;

  // Bereken totale maandelijkse inkomsten
  const totalMonthlyRevenue = members 
    ? members.reduce((total, member) => {
        return total + calculateMemberRevenue(member);
      }, 0)
    : 0;

  // Genereer PDF data
  const pdfData = {
    title: "MEFEN Moskee Ledenrapportage",
    date: format(new Date(), 'dd-MM-yyyy'),
    totalMembers: members?.length || 0,
    eligibleVoters,
    averageAge,
    membersByAgeGroup,
    membersByGender,
    membersByMembershipType,
    membersByPaymentMethod,
    membersByPaymentTerm,
    membersByPaymentStatus,
    membershipGrowth,
    monthlyRevenue,
    totalMonthlyRevenue
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Gegevens laden...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rapportage</h1>
        <p className="text-muted-foreground">
          Bekijk statistieken en rapporten over het ledenbeheer van de moskee.
        </p>
      </div>

      <Tabs defaultValue="overzicht" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
            <TabsTrigger value="financieel">Financieel</TabsTrigger>
            <TabsTrigger value="ledengroei">Ledengroei</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Select onValueChange={setFilterType} value={filterType || ""}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alle leden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alle leden</SelectItem>
                <SelectItem value="regulier">Regulier</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="gezin">Gezin</SelectItem>
                <SelectItem value="verminderd">Verminderd tarief</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" className="gap-1" onClick={() => setShowPdfPreview(!showPdfPreview)}>
              {showPdfPreview ? "Verberg PDF" : "PDF bekijken"}
            </Button>
            
            <PDFDownloadLink 
              document={<MyPdfDocument data={pdfData} />} 
              fileName="MEFEN-Rapportage.pdf"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              {({ loading }) => 
                loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    PDF downloaden
                  </>
                )
              }
            </PDFDownloadLink>
          </div>
        </div>

        {/* PDF Preview sectie */}
        {showPdfPreview && (
          <div className="mb-6 border rounded-lg overflow-hidden" style={{ height: 500 }}>
            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
              <MyPdfDocument data={pdfData} />
            </PDFViewer>
          </div>
        )}

        <TabsContent value="overzicht" className="space-y-4">
          {/* Overzichtskaarten sectie */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totaal leden</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Waarvan {eligibleVoters} stemgerechtigd
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gemiddelde leeftijd</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageAge} jaar</div>
                <p className="text-xs text-muted-foreground">
                  Van leden met bekende leeftijd
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Geschatte inkomsten</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{Math.round(totalMonthlyRevenue)}/mnd</div>
                <p className="text-xs text-muted-foreground">
                  Gebaseerd op lidmaatschapstype
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Betaalstatus</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(membersByPaymentStatus[0]?.value / (members?.length || 1) * 100)}%</div>
                <p className="text-xs text-muted-foreground">
                  Van leden heeft betaald
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Grafieken sectie */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Leden per leeftijdsgroep</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={membersByAgeGroup}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name, props) => [`${value} leden`, 'Aantal']}
                        labelFormatter={(label) => `Leeftijd ${label}`}
                      />
                      <Bar dataKey="count" name="Leden">
                        {membersByAgeGroup.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Verdeling per lidmaatschapstype</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={membersByMembershipType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="name"
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);

                          return (
                            <text
                              x={x}
                              y={y}
                              fill="white"
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              fontSize={12}
                            >
                              {`${membersByMembershipType[index].name} (${Math.round(percent * 100)}%)`}
                            </text>
                          );
                        }}
                      >
                        {membersByMembershipType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [`${value} leden`, props.payload.name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Geslachtsverdeling</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={membersByGender}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="name"
                        label
                      >
                        {membersByGender.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} leden (${Math.round(value / (members?.length || 1) * 100)}%)`, 
                          name
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Betaalstatus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={membersByPaymentStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label
                      >
                        {membersByPaymentStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} leden (${Math.round(value / (members?.length || 1) * 100)}%)`, 
                          name
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financieel" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Betalingsmethodes</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={membersByPaymentMethod}
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip 
                        formatter={(value, name, props) => [`${value} leden`, 'Aantal']}
                      />
                      <Bar dataKey="count" name="Leden">
                        {membersByPaymentMethod.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Betalingstermijnen</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={membersByPaymentTerm}
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip 
                        formatter={(value, name, props) => [`${value} leden`, 'Aantal']}
                      />
                      <Bar dataKey="count" name="Leden">
                        {membersByPaymentTerm.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Geschatte maandelijkse inkomsten</CardTitle>
              <CardDescription>
                Gebaseerd op huidige lidmaatschapstypen en betalingstermijnen
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyRevenue}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="maand" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name, props) => [`€${value}`, 'Inkomsten']}
                    />
                    <Bar dataKey="inkomsten" name="Inkomsten" fill="#2ECC71" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledengroei" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Ledengroei</h3>
              <p className="text-sm text-muted-foreground">
                Bekijk de ontwikkeling van het ledenbestand over tijd
              </p>
            </div>
            
            <div className="flex gap-2 items-center">
              <div className="flex flex-col">
                <Label className="mb-1">Vanaf</Label>
                <DatePicker date={startDate} setDate={setStartDate} />
              </div>
              <div className="flex flex-col">
                <Label className="mb-1">Tot</Label>
                <DatePicker date={endDate} setDate={setEndDate} />
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Nieuwe leden per maand</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={membershipGrowth.slice(-6)} // laatste 6 maanden
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="maand" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name, props) => [`${value} leden`, 'Nieuwe leden']}
                      labelFormatter={(label) => `${membershipGrowth.find(m => m.maand === label)?.maand_jaar}`}
                    />
                    <Bar dataKey="nieuwe_leden" name="Nieuwe leden" fill="#3F37C9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cumulatieve ledengroei</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={membershipGrowth.slice(-12).map((month, index, arr) => {
                      // Bereken cumulatief aantal
                      const cumulative = arr.slice(0, index + 1).reduce(
                        (sum, m) => sum + m.nieuwe_leden, 
                        0
                      );
                      return { ...month, cumulatief: cumulative };
                    })}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="maand" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name, props) => [`${value} leden`, 'Cumulatief']}
                      labelFormatter={(label) => `${membershipGrowth.find(m => m.maand === label)?.maand_jaar}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulatief" 
                      name="Cumulatieve groei" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}