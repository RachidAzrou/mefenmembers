import { useState } from "react";
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
import { Download, Upload, FileCheck } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// PDF styles
const styles = StyleSheet.create({
  page: { padding: 30 },
  title: { fontSize: 20, marginBottom: 20, textAlign: 'center' },
  table: { display: 'table', width: '100%', marginBottom: 20 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#EEEEEE' },
  tableCell: { padding: 5, flex: 1 },
  tableHeader: { backgroundColor: '#F3F4F6', fontWeight: 'bold' }
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

export default function ImportExport() {
  const [pendingVolunteers, setPendingVolunteers] = useState<PendingVolunteer[]>([]);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [exportFields, setExportFields] = useState<ExportField[]>([
    { id: 'firstName', label: 'Voornaam', checked: true },
    { id: 'lastName', label: 'Achternaam', checked: true },
    { id: 'phoneNumber', label: 'Telefoonnummer', checked: true },
  ]);
  const { toast } = useToast();

  // Fetch pending volunteers
  useState(() => {
    const pendingRef = ref(db, "pending_volunteers");
    onValue(pendingRef, (snapshot) => {
      const data = snapshot.val();
      const volunteersList = data ? Object.entries(data).map(([id, volunteer]) => ({
        id,
        ...(volunteer as Omit<PendingVolunteer, "id">),
      })) : [];
      setPendingVolunteers(volunteersList);
    });
  });

  const handleImport = async () => {
    try {
      // Import selected volunteers
      for (const volunteerId of selectedVolunteers) {
        const volunteer = pendingVolunteers.find(v => v.id === volunteerId);
        if (volunteer) {
          // Add to volunteers collection
          await push(ref(db, "volunteers"), {
            firstName: volunteer.firstName,
            lastName: volunteer.lastName,
            phoneNumber: volunteer.phoneNumber
          });
          // Remove from pending
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

  // PDF Document Component
  const VolunteersPDF = ({ volunteers, fields }) => (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>MEFEN Vrijwilligerslijst</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            {fields.map(field => (
              field.checked && (
                <Text key={field.id} style={styles.tableCell}>{field.label}</Text>
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
      </Page>
    </Document>
  );

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Importeer Aanmeldingen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingVolunteers.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
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
              <Button
                onClick={handleImport}
                disabled={selectedVolunteers.length === 0}
                className="mt-4 bg-[#6BB85C] hover:bg-[#6BB85C]/90"
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Importeer Geselecteerde ({selectedVolunteers.length})
              </Button>
            </>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Geen nieuwe aanmeldingen gevonden
            </p>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-6 w-6" />
            Exporteer Vrijwilligerslijst
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-medium mb-3">Selecteer velden voor export:</h3>
              {exportFields.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={field.checked}
                    onCheckedChange={(checked) => {
                      setExportFields(exportFields.map(f =>
                        f.id === field.id ? { ...f, checked: !!checked } : f
                      ));
                    }}
                  />
                  <label htmlFor={field.id}>{field.label}</label>
                </div>
              ))}
            </div>
            
            <PDFDownloadLink
              document={<VolunteersPDF volunteers={[]} fields={exportFields} />}
              fileName="vrijwilligers.pdf"
            >
              {({ loading }) => (
                <Button 
                  className="w-full"
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
