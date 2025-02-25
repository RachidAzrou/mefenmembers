import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#fff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  logo: {
    width: 100,
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    color: '#D9A347',
    marginBottom: 2,
    textAlign: 'left',
  },
  weekInfo: {
    fontSize: 12,
    color: '#4B5563',
  },
  calendar: {
    flexDirection: 'row',
    gap: 8,
  },
  day: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    padding: 8,
  },
  dayHeader: {
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
    marginBottom: 8,
  },
  dayName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#D9A347',
  },
  dayDate: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  roomSection: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: 1,
    borderTopColor: '#E5E7EB',
  },
  roomName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2F7A1F',
    marginBottom: 4,
  },
  planning: {
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 4,
    marginBottom: 4,
    borderLeft: 1,
    borderLeftColor: '#6BB85C',
  },
  volunteerName: {
    fontSize: 9,
    color: '#4B5563',
  },
  timeSlot: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 1,
  },
  emptyMessage: {
    fontSize: 8,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 7,
    borderTop: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
});

type Planning = {
  room: { name: string };
  volunteer: { firstName: string; lastName: string };
  date: Date;
  startTime?: string;
  endTime?: string;
};

type CalendarPDFProps = {
  weekStart: Date;
  plannings: Planning[];
  logoUrl?: string;
};

export function CalendarPDF({ weekStart, plannings, logoUrl }: CalendarPDFProps) {
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const getPlanningsForDay = (day: Date) => {
    const dayPlannings = plannings.filter(planning => 
      format(planning.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );

    // Group by room
    const roomPlannings = new Map<string, Planning[]>();
    dayPlannings.forEach(planning => {
      const roomName = planning.room.name;
      if (!roomPlannings.has(roomName)) {
        roomPlannings.set(roomName, []);
      }
      roomPlannings.get(roomName)?.push(planning);
    });

    return roomPlannings;
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <View style={styles.headerText}>
            <Text style={styles.title}>MEFEN Planning</Text>
            <Text style={styles.weekInfo}>
              Week van {format(weekStart, 'd MMMM yyyy', { locale: nl })}
            </Text>
          </View>
        </View>

        <View style={styles.calendar}>
          {weekDays.map((day) => {
            const planningsByRoom = getPlanningsForDay(day);

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

                {Array.from(planningsByRoom.entries()).map(([roomName, roomPlannings]) => (
                  <View key={roomName} style={styles.roomSection}>
                    <Text style={styles.roomName}>{roomName}</Text>
                    {roomPlannings.map((planning, index) => (
                      <View key={index} style={styles.planning}>
                        <Text style={styles.volunteerName}>
                          {planning.volunteer.firstName} {planning.volunteer.lastName}
                        </Text>
                        {(planning.startTime && planning.endTime) && (
                          <Text style={styles.timeSlot}>
                            {planning.startTime} - {planning.endTime}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                ))}

                {planningsByRoom.size === 0 && (
                  <Text style={styles.emptyMessage}>Geen planning</Text>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>
          MEFEN Vrijwilligers Management Systeem • Gegenereerd op {format(new Date(), 'd MMMM yyyy', { locale: nl })}
        </Text>
      </Page>
    </Document>
  );
}