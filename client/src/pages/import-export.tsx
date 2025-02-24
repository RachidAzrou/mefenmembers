import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/firebase";
import { ref, onValue, remove, push, get } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileCheck, Users, X } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

// Register custom font for PDF
Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
});

// PDF styles
const styles = StyleSheet.create({
  page: { 
    padding: 40,
    fontFamily: 'Inter',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 20,
  },
  logo: {
    width: 100,
    marginRight: 20,
  },
  headerText: {
    flex: 1,
  },
  title: { 
    fontSize: 24,
    color: '#963E56',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  date: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  table: { 
    display: 'table', 
    width: '100%',
    marginTop: 20,
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableRow: { 
    flexDirection: 'row',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableCell: { 
    flex: 1,
    fontSize: 10,
    color: '#374151',
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 8,
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    paddingTop: 10,
  }
});

type PendingVolunteer = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  submittedAt: string;
  status: 'pending';
};

type ExportField = {
  id: string;
  label: string;
  checked: boolean;
};

const VolunteersPDF = ({ volunteers, fields }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image 
          src="/static/Naamloos.png"
          style={styles.logo}
        />
        <View style={styles.headerText}>
          <Text style={styles.title}>MEFEN Vrijwilligersoverzicht</Text>
          <Text style={styles.subtitle}>Volledige lijst van actieve vrijwilligers</Text>
          <Text style={styles.date}>
            Bijgewerkt op {format(new Date(), 'd MMMM yyyy', { locale: nl })}
          </Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          {fields.map(field => (
            field.checked && (
              <Text key={field.id} style={styles.tableHeaderCell}>
                {field.label}
              </Text>
            )
          ))}
        </View>
        {volunteers.map((volunteer, i) => (
          <View key={i} style={styles.tableRow}>
            {fields.map(field => (
              field.checked && (
                <Text key={field.id} style={styles.tableCell}>
                  {volunteer[field.id]}
                </Text>
              )
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        MEFEN Vrijwilligers Management Systeem • Totaal aantal vrijwilligers: {volunteers.length}
      </Text>
    </Page>
  </Document>
);

export default function ImportExport() {
  const [pendingVolunteers, setPendingVolunteers] = useState<PendingVolunteer[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [exportFields, setExportFields] = useState<ExportField[]>([
    { id: 'firstName', label: 'Voornaam', checked: true },
    { id: 'lastName', label: 'Achternaam', checked: true },
    { id: 'phoneNumber', label: 'Telefoonnummer', checked: true },
  ]);
  const { toast } = useToast();

  useEffect(() => {
    const pendingRef = ref(db, "pending_volunteers");
    onValue(pendingRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]) => ({
        id,
        ...(volunteer as Omit<PendingVolunteer, "id">),
      })) : [];
      setPendingVolunteers(volunteersList);
    });

    const volunteersRef = ref(db, "volunteers");
    onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]) => ({
        id,
        ...volunteer,
      })) : [];
      setVolunteers(volunteersList);
    });
  }, []);

  const handleImport = async () => {
    try {
      for (const volunteerId of selectedVolunteers) {
        const volunteer = pendingVolunteers.find(v => v.id === volunteerId);
        if (volunteer) {
          await push(ref(db, "volunteers"), {
            firstName: volunteer.firstName,
            lastName: volunteer.lastName,
            phoneNumber: volunteer.phoneNumber
          });
          await remove(ref(db, `pending_volunteers/${volunteerId}`));
        }
      }

      toast({
        title: "Succes",
        description: "Geselecteerde vrijwilligers zijn succesvol geïmporteerd.",
      });
      setSelectedVolunteers([]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is iets misgegaan bij het importeren.",
      });
    }
  };

  const handleReject = async () => {
    try {
      for (const volunteerId of selectedVolunteers) {
        await remove(ref(db, `pending_volunteers/${volunteerId}`));
      }

      toast({
        title: "Succes",
        description: "Geselecteerde aanmeldingen zijn succesvol geweigerd.",
      });
      setSelectedVolunteers([]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is iets misgegaan bij het weigeren van de aanmeldingen.",
      });
    }
  };


  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <Users className="h-8 w-8 text-[#963E56]" />
        <h1 className="text-3xl font-bold text-[#963E56]">Import & Export</h1>
      </div>

      {/* Import Section */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gray-50/80">
          <CardTitle className="flex items-center gap-2 text-[#963E56]">
            <Upload className="h-5 w-5" />
            Importeer Aanmeldingen
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {pendingVolunteers.length > 0 ? (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedVolunteers.length === pendingVolunteers.length}
                          onCheckedChange={(checked) => {
                            setSelectedVolunteers(
                              checked ? pendingVolunteers.map(v => v.id) : []
                            );
                          }}
                        />
                      </TableHead>
                      <TableHead>Voornaam</TableHead>
                      <TableHead>Achternaam</TableHead>
                      <TableHead>Telefoonnummer</TableHead>
                      <TableHead>Aangemeld op</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingVolunteers.map((volunteer) => (
                      <TableRow key={volunteer.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedVolunteers.includes(volunteer.id)}
                            onCheckedChange={(checked) => {
                              setSelectedVolunteers(
                                checked
                                  ? [...selectedVolunteers, volunteer.id]
                                  : selectedVolunteers.filter(id => id !== volunteer.id)
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>{volunteer.firstName}</TableCell>
                        <TableCell>{volunteer.lastName}</TableCell>
                        <TableCell>{volunteer.phoneNumber}</TableCell>
                        <TableCell>
                          {new Date(volunteer.submittedAt).toLocaleDateString('nl-NL')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-4 mt-6">
                <Button
                  onClick={handleImport}
                  disabled={selectedVolunteers.length === 0}
                  className="bg-[#963E56] hover:bg-[#963E56]/90 text-white flex-1"
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Importeer Geselecteerde ({selectedVolunteers.length})
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={selectedVolunteers.length === 0}
                  variant="destructive"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Weiger Geselecteerde ({selectedVolunteers.length})
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Geen nieuwe aanmeldingen gevonden</p>
              <p className="mt-1 text-sm">Nieuwe vrijwilligers aanmeldingen verschijnen hier automatisch</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gray-50/80">
          <CardTitle className="flex items-center gap-2 text-[#963E56]">
            <Download className="h-5 w-5" />
            Exporteer Vrijwilligerslijst
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="rounded-lg border p-6 bg-gray-50/30">
              <h3 className="font-medium text-lg mb-4 text-gray-900">Selecteer velden voor export:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {exportFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={field.id}
                      checked={field.checked}
                      onCheckedChange={(checked) => {
                        setExportFields(exportFields.map(f =>
                          f.id === field.id ? { ...f, checked: !!checked } : f
                        ));
                      }}
                    />
                    <label htmlFor={field.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <PDFDownloadLink
              document={<VolunteersPDF volunteers={volunteers} fields={exportFields} />}
              fileName={`vrijwilligers-${format(new Date(), 'yyyy-MM-dd')}.pdf`}
              className="block w-full"
            >
              {({ loading }) => (
                <Button 
                  className="w-full bg-[#963E56] hover:bg-[#963E56]/90 text-white"
                  disabled={loading || exportFields.every(f => !f.checked)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? "Bezig met genereren..." : "Download PDF"}
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}