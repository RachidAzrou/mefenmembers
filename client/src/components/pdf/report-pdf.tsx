import React from 'react';
import { 
  Document, Page, Text, View, StyleSheet, Image, Font, 
  Line, Circle, Svg 
} from '@react-pdf/renderer';

// Register font
Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf', fontWeight: 700 },
  ]
});

// Stijlen voor PDF document
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 30,
    fontFamily: 'Open Sans',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '1px solid #ddd',
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#963E56',
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 10,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    paddingLeft: 5,
    borderLeft: '3px solid #963E56',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  statBox: {
    width: '30%',
    margin: '0 1.5% 10px',
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  statTitle: {
    fontSize: 8,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 5,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#555',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableCell: {
    flex: 1,
  },
  tableSmallCell: {
    flex: 0.5,
  },
  chartContainer: {
    height: 150,
    marginVertical: 10,
    padding: 10,
    position: 'relative',
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  barChart: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barContainer: {
    alignItems: 'center',
  },
  bar: {
    width: 15,
    marginHorizontal: 3,
  },
  barLabel: {
    fontSize: 6,
    marginTop: 3,
    color: '#666',
    maxWidth: 25,
    textAlign: 'center',
  },
  pieLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 3,
  },
  legendColor: {
    width: 8,
    height: 8,
    marginRight: 3,
    borderRadius: 10,
  },
  legendLabel: {
    fontSize: 7,
    color: '#555',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 5,
  },
  chart: {
    width: '100%',
    height: 150,
    position: 'relative',
    marginTop: 10,
  },
  axisY: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 15,
    width: 20,
    flexDirection: 'column-reverse',
    justifyContent: 'space-between',
  },
  axisX: {
    position: 'absolute',
    left: 20,
    right: 0,
    bottom: 0,
    height: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    fontSize: 6,
    color: '#999',
  },
  chartContent: {
    position: 'absolute',
    left: 20,
    top: 0,
    right: 0,
    bottom: 15,
  },
  page1: {
    paddingBottom: 50,
  },
  page2: {
    paddingBottom: 50,
  },
  halfWidth: {
    width: '48%',
  },
  row2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  verticalBar: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: 120,
  }
});

// Hoofdcomponent voor het PDF document
const MyPdfDocument = ({ data }: { data: any }) => {
  // Helpers voor het berekenen van grafieken
  const getMaxValue = (arr: any[], key: string) => {
    if (!arr || arr.length === 0) return 10;
    const max = Math.max(...arr.map(item => item[key] || 0));
    return max === 0 ? 10 : max;
  };

  const getBarHeight = (value: number, maxValue: number, maxHeight: number) => {
    return (value / maxValue) * maxHeight;
  };

  // Mini BarChart component voor in de PDF
  const MiniBarChart = ({ 
    data, 
    dataKey, 
    nameKey = 'name', 
    color = '#963E56', 
    maxHeight = 120, 
    horizontal = false 
  }: { 
    data: any[]; 
    dataKey: string; 
    nameKey?: string; 
    color?: string;
    maxHeight?: number;
    horizontal?: boolean;
  }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = getMaxValue(data, dataKey);
    
    // Voor een horizontale barchart (items op Y-as, waarden op X-as)
    if (horizontal) {
      return (
        <View style={styles.verticalBar}>
          {data.map((item, index) => (
            <View key={index} style={[styles.row, { alignItems: 'center' }]}>
              <Text style={[styles.axisLabel, { width: 60 }]}>{item[nameKey]}</Text>
              <View style={{ flex: 1 }}>
                <View 
                  style={{ 
                    height: 10, 
                    width: `${(item[dataKey] / maxValue) * 100}%`, 
                    backgroundColor: item.color || color,
                    borderRadius: 2,
                  }}
                />
              </View>
              <Text style={[styles.axisLabel, { marginLeft: 5 }]}>{item[dataKey]}</Text>
            </View>
          ))}
        </View>
      );
    }
    
    // Standaard verticale barchart
    return (
      <View style={styles.barChart}>
        {data.map((item, index) => {
          const barHeight = getBarHeight(item[dataKey], maxValue, maxHeight);
          return (
            <View key={index} style={styles.barContainer}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: barHeight, 
                    backgroundColor: item.color || color,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                  }
                ]} 
              />
              <Text style={styles.barLabel}>{item[nameKey]}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  // Mini PieChart legenda component
  const PieChartLegend = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) return null;

    return (
      <View style={styles.pieLegend}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>
              {item.name}: {item.count || item.value || 0}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Render het PDF document
  return (
    <Document>
      {/* Pagina 1: Overzicht */}
      <Page size="A4" style={[styles.page, styles.page1]}>
        {/* Header sectie */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{data.title}</Text>
            <Text style={styles.subtitle}>Gegenereerd op {data.date}</Text>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.date}>Totaal leden: {data.totalMembers}</Text>
          </View>
        </View>
        
        {/* Ledenstatistieken sectie */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ledenstatistieken</Text>
          
          <View style={styles.row2}>
            {/* Leeftijdsgroepen */}
            <View style={styles.halfWidth}>
              <Text style={styles.chartTitle}>Leeftijdsgroepen</Text>
              <MiniBarChart 
                data={data.membersByAgeGroup} 
                dataKey="count" 
              />
              <PieChartLegend data={data.membersByAgeGroup} />
            </View>
            
            {/* Geslachtsverdeling */}
            <View style={styles.halfWidth}>
              <Text style={styles.chartTitle}>Geslachtsverdeling</Text>
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                {data.membersByGender.map((item: any, index: number) => (
                  <View key={index} style={[styles.row, { marginBottom: 10, alignItems: 'center' }]}>
                    <View 
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: 15,
                        backgroundColor: item.color,
                        marginRight: 8,
                      }}
                    />
                    <Text style={{ fontSize: 10 }}>{item.name}: {item.count} ({Math.round((item.count / data.totalMembers) * 100)}%)</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          
          <View style={[styles.row2, { marginTop: 30 }]}>
            {/* Lidmaatschapstypen */}
            <View style={styles.halfWidth}>
              <Text style={styles.chartTitle}>Lidmaatschapstypen</Text>
              <MiniBarChart 
                data={data.membersByMembershipType} 
                dataKey="count"
                horizontal={true}
              />
            </View>
            
            {/* Betaalstatus */}
            <View style={styles.halfWidth}>
              <Text style={styles.chartTitle}>Betaalstatus</Text>
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                {data.membersByPaymentStatus.map((item: any, index: number) => (
                  <View key={index} style={[styles.row, { marginBottom: 10, alignItems: 'center' }]}>
                    <View 
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: 15,
                        backgroundColor: item.color,
                        marginRight: 8,
                      }}
                    />
                    <Text style={{ fontSize: 10 }}>{item.name}: {item.value} ({Math.round((item.value / data.totalMembers) * 100)}%)</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
        
        {/* Nieuwe leden per maand */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ledengroei afgelopen 6 maanden</Text>
          <MiniBarChart 
            data={data.membershipGrowth.slice(-6)} 
            dataKey="nieuwe_leden"
            color="#3E5796"
          />
        </View>
        
        {/* Footer */}
        <Text style={styles.footer}>
          MEFEN Moskee Rapportage - Vertrouwelijk document - Pagina 1/2
        </Text>
      </Page>
      
      {/* Pagina 2: Financiën */}
      <Page size="A4" style={[styles.page, styles.page2]}>
        {/* Header sectie */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{data.title} - Financieel</Text>
            <Text style={styles.subtitle}>Gegenereerd op {data.date}</Text>
          </View>
        </View>
        
        {/* Inkomsten sectie */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financiële rapportage</Text>
          
          <Text style={styles.chartTitle}>Geschatte inkomsten afgelopen 6 maanden</Text>
          <MiniBarChart 
            data={data.monthlyRevenue.slice(-6)} 
            dataKey="inkomsten"
            color="#2ECC71"
          />
          <Text style={{ fontSize: 8, color: '#999', fontStyle: 'italic', marginTop: 5 }}>
            * Berekend op basis van lidmaatschapstype en betalingstermijn
          </Text>
        </View>
        
        {/* Betalingsmethoden en termijnen */}
        <View style={styles.row2}>
          {/* Betalingsmethodes */}
          <View style={styles.halfWidth}>
            <Text style={styles.chartTitle}>Betalingsmethodes</Text>
            <MiniBarChart 
              data={data.membersByPaymentMethod} 
              dataKey="count"
              horizontal={true}
            />
          </View>
          
          {/* Betalingstermijnen */}
          <View style={styles.halfWidth}>
            <Text style={styles.chartTitle}>Betalingstermijnen</Text>
            <MiniBarChart 
              data={data.membersByPaymentTerm} 
              dataKey="count"
              horizontal={true}
            />
          </View>
        </View>
        
        {/* Footer */}
        <Text style={styles.footer}>
          MEFEN Moskee Rapportage - Vertrouwelijk document - Pagina 2/2
        </Text>
      </Page>
    </Document>
  );
};

export default MyPdfDocument;