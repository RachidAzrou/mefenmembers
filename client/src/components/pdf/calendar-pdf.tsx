import { Document, Page, View, Text, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";

// Register custom font for PDF
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
    marginBottom: 30,
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 20,
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
  calendar: { 
    display: 'flex',
    flexDirection: "row",
    gap: 15,
  },
  dayColumn: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: "bold",
    color: '#374151',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
  },
  planning: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderLeft: 2,
    borderLeftColor: '#963E56',
  },
  roomName: {
    fontSize: 11,
    fontWeight: "bold",
    color: '#963E56',
    marginBottom: 2,
  },
  volunteerName: {
    fontSize: 10,
    color: '#4B5563',
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
  },
  noPlanning: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  logo: {
    width: 100,
    marginRight: 20,
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
};

export function CalendarPDF({ weekStart, plannings }: CalendarPDFProps) {
  console.log('Rendering CalendarPDF with:', { weekStart, plannings });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const getPlanningsForDay = (day: Date) => {
    return plannings.filter(planning => 
      format(planning.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image 
            src="/static/Naamloos.png"
            style={styles.logo}
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>MEFEN Weekplanning</Text>
            <Text style={styles.subtitle}>Roosteroverzicht Vrijwilligers</Text>
            <Text style={styles.date}>
              Week van {format(weekStart, 'd MMMM yyyy', { locale: nl })} t/m {format(addDays(weekStart, 6), 'd MMMM yyyy', { locale: nl })}
            </Text>
          </View>
        </View>

        {/* Calendar Grid */}
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

        {/* Footer */}
        <Text style={styles.footer}>
          MEFEN Vrijwilligers Management Systeem • Gegenereerd op {format(new Date(), "d MMMM yyyy", { locale: nl })}
        </Text>
      </Page>
    </Document>
  );
}