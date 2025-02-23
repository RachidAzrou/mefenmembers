import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 20,
  },
  dayColumn: {
    flex: 1,
    margin: 5,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  dayDate: {
    fontSize: 10,
    color: "#666",
    marginBottom: 10,
  },
  planning: {
    marginBottom: 8,
    padding: 6,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  roomName: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#963E56",
  },
  volunteerName: {
    fontSize: 9,
    color: "#444",
  },
});

type CalendarPDFProps = {
  weekStart: Date;
  plannings: Array<{
    room: { name: string };
    volunteer: { firstName: string; lastName: string };
  }>;
};

export function CalendarPDF({ weekStart, plannings }: CalendarPDFProps) {
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {weekDays.map((day) => (
          <View key={day.toISOString()} style={styles.dayColumn}>
            <Text style={styles.dayHeader}>
              {format(day, "EEEE", { locale: nl })}
            </Text>
            <Text style={styles.dayDate}>
              {format(day, "d MMM", { locale: nl })}
            </Text>
            {plannings.map((planning, i) => (
              <View key={i} style={styles.planning}>
                <Text style={styles.roomName}>{planning.room.name}</Text>
                <Text style={styles.volunteerName}>
                  {`${planning.volunteer.firstName} ${planning.volunteer.lastName}`}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}