import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";

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
  logo: {
    width: 80,
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
  weekInfo: {
    fontSize: 14,
    color: '#4B5563',
  },
  calendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  day: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    padding: 10,
  },
  dayHeader: {
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 10,
  },
  dayName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  dayDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  planning: {
    backgroundColor: '#fff',
    borderRadius: 3,
    padding: 8,
    marginBottom: 8,
    borderLeft: 2,
    borderLeftColor: '#963E56',
  },
  roomName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#963E56',
    marginBottom: 3,
  },
  volunteerName: {
    fontSize: 10,
    color: '#4B5563',
  },
  emptyMessage: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
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
});

type Planning = {
  room: { name: string };
  volunteer: { firstName: string; lastName: string };
  date: Date;
};

type CalendarPDFProps = {
  weekStart: Date;
  plannings: Planning[];
  logoUrl?: string;
};

export function CalendarPDF({ weekStart, plannings, logoUrl }: CalendarPDFProps) {
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const getPlanningsForDay = (day: Date) => {
    return plannings.filter(planning => 
      format(planning.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header met logo en titel */}
        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <View style={styles.headerText}>
            <Text style={styles.title}>MEFEN Weekplanning</Text>
            <Text style={styles.weekInfo}>
              Week van {format(weekStart, 'd MMMM yyyy', { locale: nl })}
            </Text>
          </View>
        </View>

        {/* Weekkalender */}
        <View style={styles.calendar}>
          {weekDays.map((day) => {
            const dayPlannings = getPlanningsForDay(day);
            return (
              <View key={day.toISOString()} style={styles.day}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>
                    {format(day, 'EEEE', { locale: nl })}
                  </Text>
                  <Text style={styles.dayDate}>
                    {format(day, 'd MMMM', { locale: nl })}
                  </Text>
                </View>

                {dayPlannings.length > 0 ? (
                  dayPlannings.map((planning, index) => (
                    <View key={index} style={styles.planning}>
                      <Text style={styles.roomName}>{planning.room.name}</Text>
                      <Text style={styles.volunteerName}>
                        {planning.volunteer.firstName} {planning.volunteer.lastName}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyMessage}>Geen planning</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          MEFEN Vrijwilligers Management Systeem • Gegenereerd op {format(new Date(), 'd MMMM yyyy', { locale: nl })}
        </Text>
      </Page>
    </Document>
  );
}