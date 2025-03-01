import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { format, addDays, isWithinInterval, isSameDay, parseISO } from "date-fns";
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
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 15,
  },
  logo: {
    width: 80,
    marginRight: 20,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    color: '#963E56',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  roomSection: {
    marginBottom: 30,
  },
  roomHeader: {
    backgroundColor: '#963E56',
    padding: 10,
    marginBottom: 15,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  channelInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelText: {
    color: 'white',
    fontSize: 10,
  },
  weekGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  dayCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayHeader: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  dayName: {
    fontSize: 14,
    color: '#963E56',
    fontWeight: 'bold',
  },
  dayDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  planningCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  volunteerName: {
    fontSize: 12,
    color: '#111827',
    fontWeight: 'bold',
  },
  noPlanning: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 15,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    fontSize: 10,
    color: '#6B7280',
  },
});

type Planning = {
  room: { 
    name: string;
    channel?: string; 
  };
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

  // Group plannings by room
  const roomPlannings = plannings.reduce((acc, planning) => {
    const roomName = planning.room.name;
    if (!acc[roomName]) {
      acc[roomName] = {
        name: roomName,
        channel: planning.room.channel,
        plannings: []
      };
    }
    acc[roomName].plannings.push(planning);
    return acc;
  }, {} as Record<string, { name: string; channel?: string; plannings: Planning[] }>);

  // Split rooms into groups of 3 for better readability
  const roomsPerPage = 3;
  const roomGroups = Object.values(roomPlannings).reduce((acc: any[], room, i) => {
    const groupIndex = Math.floor(i / roomsPerPage);
    if (!acc[groupIndex]) acc[groupIndex] = [];
    acc[groupIndex].push(room);
    return acc;
  }, []);

  const Header = ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => (
    <View style={styles.header}>
      {logoUrl && <Image src={logoUrl} style={styles.logo} />}
      <View style={styles.headerContent}>
        <Text style={styles.title}>
          Weekplanning
        </Text>
        <Text style={styles.subtitle}>
          Week van {format(weekStart, 'd MMMM yyyy', { locale: nl })}
          {totalPages > 1 ? ` (Pagina ${pageNumber} van ${totalPages})` : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <Document>
      {roomGroups.map((roomGroup, pageIndex) => (
        <Page 
          key={pageIndex} 
          size="A4" 
          orientation="landscape" 
          style={styles.page}
        >
          <Header pageNumber={pageIndex + 1} totalPages={roomGroups.length} />

          {roomGroup.map((room) => (
            <View key={room.name} style={styles.roomSection}>
              <View style={styles.roomHeader}>
                <Text style={styles.roomName}>
                  {room.name}
                </Text>
                {room.channel && (
                  <View style={styles.channelInfo}>
                    <Text style={styles.channelText}>KANAAL {room.channel}</Text>
                  </View>
                )}
              </View>

              <View style={styles.weekGrid}>
                {weekDays.map((day) => {
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const dayPlannings = room.plannings.filter(p => 
                    format(p.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                  );

                  return (
                    <View key={day.toISOString()} style={[
                      styles.dayCard,
                      isToday && { borderColor: '#963E56', borderWidth: 2 }
                    ]}>
                      <View style={styles.dayHeader}>
                        <Text style={[
                          styles.dayName,
                          isToday && { color: '#963E56' }
                        ]}>
                          {format(day, 'EEEE', { locale: nl })}
                        </Text>
                        <Text style={styles.dayDate}>
                          {format(day, 'd MMMM', { locale: nl })}
                        </Text>
                      </View>

                      {dayPlannings.map((planning, index) => (
                        <View key={index} style={styles.planningCard}>
                          <Text style={styles.volunteerName}>
                            {`${planning.volunteer.firstName} ${planning.volunteer.lastName[0]}.`}
                          </Text>
                        </View>
                      ))}

                      {dayPlannings.length === 0 && (
                        <Text style={styles.noPlanning}>Geen toewijzingen</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          <Text style={styles.footer}>
            MEFEN Vrijwilligers Management Systeem • Gegenereerd op {format(new Date(), 'd MMMM yyyy', { locale: nl })}
          </Text>
        </Page>
      ))}
    </Document>
  );
}