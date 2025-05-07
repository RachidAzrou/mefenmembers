import React, { useState, useEffect } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from "@/components/ui/card";
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import { 
  ChartContainer, ChartTooltip, ChartTooltipContent 
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  FileText, Download, BarChart3, PieChart as PieChartIcon, 
  LineChart as LineChartIcon, Users, Calendar, UserCheck, 
  UserX, CircleDollarSign, Banknote, Filter
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Member } from "@shared/schema";
import MyPdfDocument from "@/components/pdf/report-pdf";
import { format, sub, startOfMonth, endOfMonth, getMonth, getYear } from "date-fns";
import { nl } from "date-fns/locale";

// Kleuren en thema
const colors = {
  primary: "#963E56",
  secondary: "#3E5796",
  accent: "#5E963E",
  muted: "#AAAAAA",
  error: "#E74C3C",
  warning: "#F39C12",
  info: "#3498DB",
  success: "#2ECC71",
};

// Functie om de leeftijd te berekenen
const calculateAge = (birthDate: string | null): number => {
  if (!birthDate) return 0;
  const today = new Date();
  const bDate = new Date(birthDate);
  let age = today.getFullYear() - bDate.getFullYear();
  const monthDiff = today.getMonth() - bDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bDate.getDate())) {
    age--;
  }
  
  return age;
};

// Functie om leden per leeftijdsgroep te groeperen
const groupMembersByAgeRange = (members: Member[]) => {
  const ageGroups = [
    { name: "0-12 jaar", range: [0, 12], count: 0, color: colors.info },
    { name: "13-17 jaar", range: [13, 17], count: 0, color: colors.success },
    { name: "18-24 jaar", range: [18, 24], count: 0, color: colors.accent },
    { name: "25-34 jaar", range: [25, 34], count: 0, color: colors.warning },
    { name: "35-49 jaar", range: [35, 49], count: 0, color: colors.primary },
    { name: "50-64 jaar", range: [50, 64], count: 0, color: colors.secondary },
    { name: "65+ jaar", range: [65, 120], count: 0, color: colors.muted },
  ];

  members.forEach(member => {
    const age = calculateAge(member.birthDate);
    const group = ageGroups.find(
      g => age >= g.range[0] && age <= g.range[1]
    );
    if (group) {
      group.count++;
    }
  });

  return ageGroups;
};

// Functie om leden per lidmaatschapstype te groeperen
const groupMembersByMembershipType = (members: Member[]) => {
  const types = [
    { name: "Standaard", value: "standaard", count: 0, color: colors.primary },
    { name: "Student", value: "student", count: 0, color: colors.info },
    { name: "Senior", value: "senior", count: 0, color: colors.secondary },
  ];

  members.forEach(member => {
    const type = types.find(t => t.value === member.membershipType);
    if (type) {
      type.count++;
    }
  });

  return types;
};

// Functie om leden per geslacht te groeperen
const groupMembersByGender = (members: Member[]) => {
  const genders = [
    { name: "Man", value: "man", count: 0, color: colors.info },
    { name: "Vrouw", value: "vrouw", count: 0, color: colors.primary },
  ];

  members.forEach(member => {
    const gender = genders.find(g => g.value === member.gender);
    if (gender) {
      gender.count++;
    }
  });

  return genders;
};

// Functie om te bepalen of leden in een bepaalde periode zijn toegevoegd
const getMembersInPeriod = (
  members: Member[], 
  startDate: Date, 
  endDate: Date
): Member[] => {
  return members.filter(member => {
    const registrationDate = new Date(member.registrationDate);
    return registrationDate >= startDate && registrationDate <= endDate;
  });
};

// Functie om lidmaatschapsgroei per maand te berekenen voor de afgelopen 12 maanden
const calculateMembershipGrowth = (members: Member[]) => {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const date = sub(new Date(), { months: i });
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const newMembers = getMembersInPeriod(members, monthStart, monthEnd).length;
    
    months.push({
      name: format(date, 'MMM yy', { locale: nl }),
      nieuwe_leden: newMembers,
    });
  }
  return months;
};

// Functie om inkomsten per maand te berekenen (gesimuleerd op basis van lidmaatschapstype)
const calculateMonthlyRevenue = (members: Member[]) => {
  const rates = {
    standaard: 50, // jaarlijks bedrag in euro
    student: 25,
    senior: 35
  };

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const date = sub(new Date(), { months: i });
    const month = format(date, 'MMM yy', { locale: nl });
    
    // Bereken het totale bedrag aan inkomsten voor deze maand
    let totalRevenue = 0;
    members.forEach(member => {
      // Alleen leden die betaald hebben meenemen
      if (member.paymentStatus) {
        const baseRate = rates[member.membershipType as keyof typeof rates] || rates.standaard;
        // Voor maandelijkse betalers, neem direct het bedrag
        // Voor jaarlijkse betalers, neem alleen de volledige contributie in hun startmaand
        if (member.paymentTerm === "maandelijks") {
          totalRevenue += baseRate / 12;
        } else if (member.paymentTerm === "driemaandelijks") {
          // Voor driemaandelijkse betalers, neem het bedrag in de 1e, 4e, 7e en 10e maand
          const memberStartMonth = getMonth(new Date(member.startDate || member.registrationDate));
          const currentMonth = getMonth(date);
          if ((currentMonth - memberStartMonth) % 3 === 0) {
            totalRevenue += baseRate / 4;
          }
        } else if (member.paymentTerm === "jaarlijks") {
          // Voor jaarlijkse betalers, neem het volledige bedrag in hun startmaand
          const memberStartMonth = getMonth(new Date(member.startDate || member.registrationDate));
          const memberStartYear = getYear(new Date(member.startDate || member.registrationDate));
          const currentMonth = getMonth(date);
          const currentYear = getYear(date);
          
          if (memberStartMonth === currentMonth && 
              (memberStartYear === currentYear || 
               (memberStartYear < currentYear && (currentYear - memberStartYear) % 1 === 0))) {
            totalRevenue += baseRate;
          }
        }
      }
    });
    
    months.push({
      name: month,
      inkomsten: Math.round(totalRevenue), // Afgerond op hele euro's
    });
  }
  
  return months;
};

// Functie om betaalstatus te groeperen
const groupMembersByPaymentStatus = (members: Member[]) => {
  const paidMembers = members.filter(m => m.paymentStatus).length;
  return [
    { name: "Betaald", value: paidMembers, color: colors.success },
    { name: "Niet betaald", value: members.length - paidMembers, color: colors.error },
  ];
};

// Functie om betaalmethodes te groeperen
const groupMembersByPaymentMethod = (members: Member[]) => {
  const methods = [
    { name: "Contant", value: "cash", count: 0, color: colors.warning },
    { name: "Domiciliëring", value: "domiciliering", count: 0, color: colors.success },
    { name: "Overschrijving", value: "overschrijving", count: 0, color: colors.info },
    { name: "Bancontact", value: "bancontact", count: 0, color: colors.accent },
  ];

  members.forEach(member => {
    const method = methods.find(m => m.value === member.paymentMethod);
    if (method) {
      method.count++;
    }
  });

  return methods;
};

// Functie om termijnen te groeperen
const groupMembersByPaymentTerm = (members: Member[]) => {
  const terms = [
    { name: "Jaarlijks", value: "jaarlijks", count: 0, color: colors.primary },
    { name: "Maandelijks", value: "maandelijks", count: 0, color: colors.info },
    { name: "Driemaandelijks", value: "driemaandelijks", count: 0, color: colors.accent },
  ];

  members.forEach(member => {
    const term = terms.find(t => t.value === member.paymentTerm);
    if (term) {
      term.count++;
    }
  });

  return terms;
};

// Hoofdcomponent
export default function Rapportage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState("all");
  const [reportData, setReportData] = useState<any>(null);
  
  // Haal alle leden op
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/members");
      return response.json();
    }
  });
  
  // Bereid gegevens voor de PDF voor
  useEffect(() => {
    if (members.length > 0) {
      setReportData({
        title: "MEFEN Moskee - Ledenrapportage",
        date: format(new Date(), "dd/MM/yyyy"),
        totalMembers: members.length,
        membersByAgeGroup: groupMembersByAgeRange(members),
        membersByMembershipType: groupMembersByMembershipType(members),
        membersByGender: groupMembersByGender(members),
        membershipGrowth: calculateMembershipGrowth(members),
        membersByPaymentStatus: groupMembersByPaymentStatus(members),
        membersByPaymentMethod: groupMembersByPaymentMethod(members),
        membersByPaymentTerm: groupMembersByPaymentTerm(members),
        monthlyRevenue: calculateMonthlyRevenue(members)
      });
    }
  }, [members]);

  // Filter leden op basis van geselecteerde periode
  const filteredMembers = React.useMemo(() => {
    if (period === "all") return members;
    
    const now = new Date();
    let startDate;
    
    switch (period) {
      case "month":
        startDate = sub(now, { months: 1 });
        break;
      case "quarter":
        startDate = sub(now, { months: 3 });
        break;
      case "year":
        startDate = sub(now, { years: 1 });
        break;
      default:
        startDate = new Date(0); // Begin van de tijd
    }
    
    return members.filter(member => new Date(member.registrationDate) >= startDate);
  }, [members, period]);
  
  // Bereken statistieken
  const totalMembers = filteredMembers.length;
  const newMembersThisMonth = getMembersInPeriod(
    members, 
    startOfMonth(new Date()),
    new Date()
  ).length;
  
  const newMembersThisYear = getMembersInPeriod(
    members,
    new Date(new Date().getFullYear(), 0, 1),
    new Date()
  ).length;
  
  const membersByAgeGroup = groupMembersByAgeRange(filteredMembers);
  const membersByGender = groupMembersByGender(filteredMembers);
  const membersByMembershipType = groupMembersByMembershipType(filteredMembers);
  const membershipGrowth = calculateMembershipGrowth(members);
  const membersByPaymentStatus = groupMembersByPaymentStatus(filteredMembers);
  const membersByPaymentMethod = groupMembersByPaymentMethod(filteredMembers);
  const membersByPaymentTerm = groupMembersByPaymentTerm(filteredMembers);
  const monthlyRevenue = calculateMonthlyRevenue(members);

  if (isLoading) {
    return (
      <div className="flex h-24 w-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#963E56]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header sectie */}
      <div className="rounded-lg bg-gradient-to-r from-[#963E56]/80 to-[#963E56] p-6 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
              Rapportage &amp; Statistieken
            </h1>
            <p className="text-white/80">
              Inzicht in ledenaantallen, financiën en trends
            </p>
          </div>

          {reportData && (
            <div className="mt-4 sm:mt-0">
              <PDFDownloadLink
                document={<MyPdfDocument data={reportData} />}
                fileName={`MEFEN-Rapportage-${format(new Date(), 'dd-MM-yyyy')}.pdf`}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white hover:bg-white/90 text-[#963E56] h-10 px-4 py-2"
              >
                {({ blob, url, loading, error }) => (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    {loading ? "Voorbereiden..." : "Exporteer PDF"}
                  </>
                )}
              </PDFDownloadLink>
            </div>
          )}
        </div>
      </div>

      {/* Filters sectie */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Periode:</span>
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value)}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Periode selecteren" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle tijd</SelectItem>
              <SelectItem value="month">Afgelopen maand</SelectItem>
              <SelectItem value="quarter">Afgelopen kwartaal</SelectItem>
              <SelectItem value="year">Afgelopen jaar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs sectie */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="overview">Overzicht</TabsTrigger>
          <TabsTrigger value="membership">Lidmaatschap</TabsTrigger>
          <TabsTrigger value="finance">Financiën</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overzicht tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Kerncijfers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <Users className="h-5 w-5 mr-2 text-[#963E56]" />
                  Ledenbestand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#963E56]">{totalMembers}</div>
                <p className="text-sm text-gray-500">Totaal aantal leden</p>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-lg font-semibold">{newMembersThisMonth}</div>
                    <p className="text-xs text-gray-500">Nieuwe leden deze maand</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-lg font-semibold">{newMembersThisYear}</div>
                    <p className="text-xs text-gray-500">Nieuwe leden dit jaar</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <PieChartIcon className="h-5 w-5 mr-2 text-[#963E56]" />
                  Lidmaatschapstypen
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={membersByMembershipType}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="count"
                    >
                      {membersByMembershipType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${value} leden`, 'Aantal']} 
                      labelFormatter={(value: any) => membersByMembershipType[value].name}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
              <CardFooter className="pt-0 justify-center">
                <div className="flex flex-wrap gap-2 justify-center">
                  {membersByMembershipType.map((type) => (
                    <Badge 
                      key={type.value} 
                      variant="outline" 
                      className="flex items-center gap-1.5"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: type.color }}
                      ></div>
                      {type.name}: {type.count}
                    </Badge>
                  ))}
                </div>
              </CardFooter>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <CircleDollarSign className="h-5 w-5 mr-2 text-[#963E56]" />
                  Betaalstatus
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={membersByPaymentStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {membersByPaymentStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${value} leden`, 'Aantal']} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
              <CardFooter className="pt-0 justify-center">
                <div className="flex flex-wrap gap-2 justify-center">
                  {membersByPaymentStatus.map((status, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="flex items-center gap-1.5"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      ></div>
                      {status.name}: {status.value}
                    </Badge>
                  ))}
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Leeftijdsgroepen en geslacht */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <BarChart3 className="h-5 w-5 mr-2 text-[#963E56]" />
                  Leeftijdsgroepen
                </CardTitle>
                <CardDescription>Verdeling van leden per leeftijdsgroep</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={membersByAgeGroup}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip 
                      formatter={(value: any) => [`${value} leden`, 'Aantal']} 
                    />
                    <Bar dataKey="count" fill={colors.primary}>
                      {membersByAgeGroup.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <Users className="h-5 w-5 mr-2 text-[#963E56]" />
                  Geslachtsverdeling
                </CardTitle>
                <CardDescription>Verdeling van leden op basis van geslacht</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="w-52 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={membersByGender}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ name, percent }) => 
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {membersByGender.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${value} leden`, 'Aantal']} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {membersByGender.map((gender) => (
                    <Badge 
                      key={gender.value} 
                      variant="outline" 
                      className="flex items-center gap-1.5"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: gender.color }}
                      ></div>
                      {gender.name}: {gender.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lidmaatschap tab */}
        <TabsContent value="membership" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <Calendar className="h-5 w-5 mr-2 text-[#963E56]" />
                  Lidmaatschapsduur
                </CardTitle>
                <CardDescription>Hoelang zijn leden al lid?</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Hier kunnen we membershipYears toevoegen als we meer data hebben */}
                <div className="flex flex-col space-y-2 text-center">
                  <span className="text-sm text-gray-500">Gebaseerd op beschikbare registratiedata</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <UserCheck className="h-5 w-5 mr-2 text-[#963E56]" />
                  Nieuwe aanmeldingen
                </CardTitle>
                <CardDescription>Nieuwe leden per maand</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={membershipGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value: any) => [`${value} leden`, 'Nieuwe leden']} />
                    <Bar dataKey="nieuwe_leden" fill={colors.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <UserX className="h-5 w-5 mr-2 text-[#963E56]" />
                  Opzeggingen
                </CardTitle>
                <CardDescription>Aantal beëindigde lidmaatschappen</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-[200px]">
                <div className="text-3xl font-bold text-gray-300">-</div>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Geen gegevens beschikbaar over beëindigde lidmaatschappen
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lidmaatschapstypen en betaalmethodes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <Users className="h-5 w-5 mr-2 text-[#963E56]" />
                  Lidmaatschapstypen
                </CardTitle>
                <CardDescription>Verdeling van lidmaatschapstypen</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={membersByMembershipType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value: any) => [`${value} leden`, 'Aantal']} />
                    <Bar dataKey="count" fill={colors.primary}>
                      {membersByMembershipType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <PieChartIcon className="h-5 w-5 mr-2 text-[#963E56]" />
                  Regio-verdeling
                </CardTitle>
                <CardDescription>Geografische spreiding van leden</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-[250px]">
                <div className="text-3xl font-bold text-gray-300">-</div>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Geen gegevens beschikbaar over geografische spreiding
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financiën tab */}
        <TabsContent value="finance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <Banknote className="h-5 w-5 mr-2 text-[#963E56]" />
                  Inkomsten overzicht
                </CardTitle>
                <CardDescription>Geïnde lidgelden per maand</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`€${value}`, 'Inkomsten']} />
                    <Bar dataKey="inkomsten" fill={colors.success} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <PieChartIcon className="h-5 w-5 mr-2 text-[#963E56]" />
                  Betaalmethodes
                </CardTitle>
                <CardDescription>Verdeling van betaalmethodes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={membersByPaymentMethod}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="count"
                    >
                      {membersByPaymentMethod.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${value} leden`, 'Aantal']} 
                      labelFormatter={(value: any) => membersByPaymentMethod[value].name}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <PieChartIcon className="h-5 w-5 mr-2 text-[#963E56]" />
                  Betalingstermijnen
                </CardTitle>
                <CardDescription>Verdeling van betalingstermijnen</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={membersByPaymentTerm}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="count"
                    >
                      {membersByPaymentTerm.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${value} leden`, 'Aantal']} 
                      labelFormatter={(value: any) => membersByPaymentTerm[value].name}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center text-gray-700">
                <CircleDollarSign className="h-5 w-5 mr-2 text-[#963E56]" />
                Openstaande betalingen
              </CardTitle>
              <CardDescription>Leden met openstaande betalingen</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="rounded-lg overflow-hidden border border-gray-100">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Naam</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lidnummer</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lidmaatschapstype</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bedrag</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredMembers
                        .filter(member => !member.paymentStatus)
                        .map((member) => {
                          // Bereken bedrag op basis van type
                          let amount = 50; // standaard
                          if (member.membershipType === "student") amount = 25;
                          if (member.membershipType === "senior") amount = 35;

                          return (
                            <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {member.firstName} {member.lastName}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.memberNumber.toString().padStart(4, '0')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.membershipType === "standaard" && "Standaard"}
                                {member.membershipType === "student" && "Student"}
                                {member.membershipType === "senior" && "Senior"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                €{amount}
                              </td>
                            </tr>
                          );
                        })}
                      {filteredMembers.filter(member => !member.paymentStatus).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                            Geen openstaande betalingen gevonden
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <LineChartIcon className="h-5 w-5 mr-2 text-[#963E56]" />
                  Ledengroei over tijd
                </CardTitle>
                <CardDescription>Aantal nieuwe leden per maand</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={membershipGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value: any) => [`${value} leden`, 'Nieuwe leden']} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="nieuwe_leden"
                      stroke={colors.primary}
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-700">
                  <LineChartIcon className="h-5 w-5 mr-2 text-[#963E56]" />
                  Inkomsten trend
                </CardTitle>
                <CardDescription>Lidgelden per maand</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`€${value}`, 'Inkomsten']} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="inkomsten"
                      stroke={colors.success}
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}