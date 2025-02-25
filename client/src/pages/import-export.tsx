import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ref, onValue, remove, push } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Users, X, FileUp, FileDown, FileJson } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useRole } from "@/hooks/use-role";
import { logUserAction, UserActionTypes } from "@/lib/activity-logger";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#fff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 15,
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
    fontSize: 14,
    color: '#4B5563',
  },
  table: {
    width: '100%',
    marginTop: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    minHeight: 35,
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    color: '#374151',
  },
  tableCellHeader: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 8,
    borderTop: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  logo: {
    width: 80,
    marginRight: 20,
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

type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
};

type ExportField = {
  id: keyof Volunteer;
  label: string;
  checked: boolean;
};

const VolunteersPDF = ({ volunteers, fields }: { volunteers: Volunteer[], fields: ExportField[] }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image
          src={`${window.location.origin}/static/Naamloos.png`}
          style={styles.logo}
        />
        <View style={styles.headerText}>
          <Text style={styles.title}>MEFEN Vrijwilligersoverzicht</Text>
          <Text style={styles.subtitle}>
            Bijgewerkt op {format(new Date(), 'd MMMM yyyy', { locale: nl })}
          </Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          {fields.filter(f => f.checked).map((field) => (
            <Text key={field.id} style={styles.tableCellHeader}>{field.label}</Text>
          ))}
        </View>

        {volunteers.map((volunteer, index) => (
          <View key={index} style={styles.tableRow}>
            {fields.filter(f => f.checked).map((field) => (
              <Text key={field.id} style={styles.tableCell}>
                {volunteer[field.id] || '-'}
              </Text>
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
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [exportFields, setExportFields] = useState<ExportField[]>([
    { id: 'firstName', label: 'Voornaam', checked: true },
    { id: 'lastName', label: 'Achternaam', checked: true },
    { id: 'phoneNumber', label: 'Telefoonnummer', checked: true },
  ]);
  const { toast } = useToast();
  const { isAdmin } = useRole();

  useEffect(() => {
    const volunteersRef = ref(db, "volunteers");
    const unsubscribeVolunteers = onValue(volunteersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const volunteersList = Object.entries(data).map(([id, volunteer]: [string, any]) => ({
          id,
          ...volunteer
        }));
        setVolunteers(volunteersList);
      } else {
        setVolunteers([]);
      }
    });

    const pendingRef = ref(db, "pending_volunteers");
    const unsubscribePending = onValue(pendingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const pendingList = Object.entries(data).map(([id, volunteer]: [string, any]) => ({
          id,
          ...volunteer,
          status: 'pending'
        }));

        // Sort by submission date, newest first
        pendingList.sort((a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );

        setPendingVolunteers(pendingList);

        // Show notification for new registrations
        if (pendingList.length > 0) {
          const latestSubmission = new Date(pendingList[0].submittedAt);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

          if (latestSubmission > fiveMinutesAgo) {
            toast({
              title: "Nieuwe Aanmelding",
              description: "Er is een nieuwe vrijwilliger aanmelding binnengekomen.",
              duration: 5000,
            });
          }
        }
      } else {
        setPendingVolunteers([]);
      }
    });

    return () => {
      unsubscribeVolunteers();
      unsubscribePending();
    };
  }, [toast]);

  const handleImport = async () => {
    try {
      for (const volunteerId of selectedVolunteers) {
        const volunteer = pendingVolunteers.find(v => v.id === volunteerId);
        if (volunteer) {
          const newVolunteerRef = await push(ref(db, "volunteers"), {
            firstName: volunteer.firstName,
            lastName: volunteer.lastName,
            phoneNumber: volunteer.phoneNumber
          });
          await remove(ref(db, `pending_volunteers/${volunteerId}`));

          await logUserAction(
            UserActionTypes.IMPORT_VOLUNTEERS,
            `Vrijwilliger ${volunteer.firstName} ${volunteer.lastName} geïmporteerd`,
            {
              type: "volunteer",
              id: newVolunteerRef.key!,
              name: `${volunteer.firstName} ${volunteer.lastName}`
            }
          );
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
        const volunteer = pendingVolunteers.find(v => v.id === volunteerId);
        if (volunteer) {
          await remove(ref(db, `pending_volunteers/${volunteerId}`));
          await logUserAction(
            UserActionTypes.VOLUNTEER_DELETE,
            `Vrijwilliger aanmelding ${volunteer.firstName} ${volunteer.lastName} geweigerd`,
            {
              type: "volunteer",
              id: volunteerId,
              name: `${volunteer.firstName} ${volunteer.lastName}`
            }
          );
        }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileJson className="h-8 w-8 text-[#963E56]" />
          <h1 className="text-2xl sm:text-3xl font-bold text-[#963E56]">Import & Export</h1>
        </div>
      </div>

      {/* Import Section */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gray-50/80">
          <CardTitle className="flex items-center gap-2 text-[#963E56] text-lg sm:text-xl">
            <FileDown className="h-5 w-5" />
            Importeer Aanmeldingen
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 overflow-x-auto">
          {pendingVolunteers.length > 0 ? (
            <>
              <div className="rounded-lg border min-w-[600px] sm:min-w-0">
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
                      <TableHead className="hidden sm:table-cell">Telefoonnummer</TableHead>
                      <TableHead className="hidden sm:table-cell">Aangemeld op</TableHead>
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
                        <TableCell className="hidden sm:table-cell">{volunteer.phoneNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {format(new Date(volunteer.submittedAt), 'd MMMM yyyy', { locale: nl })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <Button
                  onClick={handleImport}
                  disabled={selectedVolunteers.length === 0}
                  className="bg-[#963E56] hover:bg-[#963E56]/90 text-white w-full sm:w-auto sm:flex-1"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Importeer ({selectedVolunteers.length})
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={selectedVolunteers.length === 0}
                  variant="destructive"
                  className="w-full sm:w-auto sm:flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Weiger ({selectedVolunteers.length})
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
          <CardTitle className="flex items-center gap-2 text-[#963E56] text-lg sm:text-xl">
            <FileUp className="h-5 w-5" />
            Exporteer Vrijwilligerslijst
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="rounded-lg border p-4 sm:p-6 bg-gray-50/30">
              <h3 className="font-medium text-lg mb-4 text-gray-900">
                Selecteer velden voor export:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
                    <label
                      htmlFor={field.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <PDFDownloadLink
                  document={<VolunteersPDF volunteers={volunteers} fields={exportFields} />}
                  fileName={`vrijwilligers-${format(new Date(), 'yyyy-MM-dd')}.pdf`}
                  onClick={async () => {
                    await logUserAction(
                      UserActionTypes.GENERATE_VOLUNTEERS_PDF,
                      `Vrijwilligers PDF gegenereerd`,
                      {
                        type: "export",
                        id: new Date().toISOString(),
                        name: `vrijwilligers-${format(new Date(), 'yyyy-MM-dd')}.pdf`
                      }
                    );
                  }}
                >
                  {({ loading }) => (
                    <Button
                      className="bg-[#963E56] hover:bg-[#963E56]/90 text-white w-full sm:w-auto"
                      disabled={loading || exportFields.every(f => !f.checked)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {loading ? "PDF wordt gemaakt..." : "Download PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}