import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

// Base64 encoded MEFEN logo.  REPLACE THIS WITH YOUR ACTUAL LOGO.
const MEFEN_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=='; 

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#fff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 1,
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
    flexDirection: 'row',
    gap: 10,
  },
  dayColumn: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  planning: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#963E56',
  },
  roomName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#963E56',
    marginBottom: 2,
  },
  volunteerName: {
    fontSize: 10,
    color: '#4B5563',
  },
  noPlanning: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
});

type Planning = {
  date: Date;
  volunteer: {
    firstName: string;
    lastName: string;
  };
  room: {
    name: string;
  };
};

type Props = {
  weekStart: Date;
  plannings: Planning[];
};

export function CalendarPDF({ weekStart, plannings }: Props) {
  console.log('CalendarPDF received:', { weekStart, plannings });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });

  const getPlanningsForDay = (day: Date) => {
    return plannings.filter(planning => {
      const planningDate = new Date(planning.date);
      return format(planningDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    });
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>MEFEN Weekplanning</Text>
            <Text style={styles.subtitle}>Roosteroverzicht Vrijwilligers</Text>
            <Text style={styles.date}>
              Week van {format(weekStart, 'd MMMM yyyy', { locale: nl })}
            </Text>
          </View>
        </View>

        <View style={styles.calendar}>
          {weekDays.map((day) => {
            const dayPlannings = getPlanningsForDay(day);
            console.log(`Plannings for ${format(day, 'yyyy-MM-dd')}:`, dayPlannings);

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
                      <Text style={styles.roomName}>
                        {planning.room.name}
                      </Text>
                      <Text style={styles.volunteerName}>
                        {`${planning.volunteer.firstName} ${planning.volunteer.lastName}`.trim()}
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