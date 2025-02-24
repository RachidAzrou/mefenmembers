import { Document, Page, View, Text, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";

Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
});

const styles = StyleSheet.create({
  page: { 
    padding: 40,
    backgroundColor: '#fff',
    fontFamily: 'Inter',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 20,
  },
  headerText: {
    flex: 1,
  },
  title: { 
    fontSize: 28,
    color: '#963E56',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
  },
  calendar: { 
    flexDirection: "row",
    gap: 20,
  },
  dayColumn: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 15,
  },
  dayHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: '#374151',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
  },
  planning: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderLeft: 2,
    borderLeftColor: '#963E56',
  },
  roomName: {
    fontSize: 12,
    fontWeight: "bold",
    color: '#963E56',
    marginBottom: 4,
  },
  volunteerName: {
    fontSize: 11,
    color: '#4B5563',
  },
  noPlanning: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 10,
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    paddingTop: 15,
  },
  logo: {
    width: 120,
    marginRight: 30,
  }
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
        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <View style={styles.headerText}>
            <Text style={styles.title}>MEFEN Weekplanning</Text>
            <Text style={styles.subtitle}>Roosteroverzicht Vrijwilligers</Text>
            <Text style={styles.date}>
              Week van {format(weekStart, 'd MMMM yyyy', { locale: nl })} t/m {format(addDays(weekStart, 6), 'd MMMM yyyy', { locale: nl })}
            </Text>
          </View>
        </View>

        <View style={styles.calendar}>
          {weekDays.map((day) => {
            const dayPlannings = getPlanningsForDay(day);
            return (
              <View key={day.toISOString()} style={styles.dayColumn}>
                <Text style={styles.dayHeader}>
                  {format(day, "EEEE", { locale: nl })}
                </Text>
                <Text style={styles.dayDate}>
                  {format(day, "d MMMM", { locale: nl })}
                </Text>

                {dayPlannings.length > 0 ? (
                  dayPlannings.map((planning, i) => (
                    <View key={i} style={styles.planning}>
                      <Text style={styles.roomName}>{planning.room.name}</Text>
                      <Text style={styles.volunteerName}>
                        {`${planning.volunteer.firstName} ${planning.volunteer.lastName}`}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noPlanning}>Geen toewijzingen</Text>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>
          MEFEN Vrijwilligers Management Systeem • Gegenereerd op {format(new Date(), "d MMMM yyyy", { locale: nl })}
        </Text>
      </Page>
    </Document>
  );
}