import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Function to export a single chart as JPG using html2canvas
export const exportChartAsJPG = async (chartRef: React.RefObject<HTMLDivElement>, filename: string) => {
  if (!chartRef.current) return;
  
  try {
    const canvas = await html2canvas(chartRef.current, {
      scale: 2, // Higher scale for better quality
      backgroundColor: '#ffffff',
      logging: false
    });
    
    // Convert canvas to JPG
    const jpgUrl = canvas.toDataURL('image/jpeg', 1.0);
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = jpgUrl;
    downloadLink.download = `${filename}.jpg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  } catch (error) {
    console.error('Error exporting chart as JPG:', error);
  }
};

// Function to export all charts to a single PDF document
export const exportAllChartsToPDF = async (chartRefs: Record<string, React.RefObject<HTMLDivElement>>, filename: string) => {
  if (!chartRefs || Object.keys(chartRefs).length === 0) return;
  
  try {
    // Initialize PDF document (A4 size in portrait orientation)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15; // mm
    const contentWidth = pageWidth - (2 * margin);
    const titleHeight = 12; // mm
    
    let yPosition = margin + 10;
    
    // Add title to PDF
    pdf.setFontSize(18);
    pdf.setTextColor('#963E56');
    pdf.text('MEFEN Moskee Ledenrapportage', margin, yPosition);
    
    yPosition += 10;
    
    // Add subtitle with date
    pdf.setFontSize(10);
    pdf.setTextColor('#666666');
    const today = new Date();
    const dateStr = today.toLocaleDateString('nl-NL', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    pdf.text(`Gegenereerd op ${dateStr}`, margin, yPosition);
    
    yPosition += 15;
    
    // Process each chart
    let chartCount = 0;
    for (const [chartName, chartRef] of Object.entries(chartRefs)) {
      if (!chartRef.current) continue;
      
      // Check if we need a new page
      if (yPosition > (pageHeight - margin - 40)) {
        pdf.addPage();
        yPosition = margin + 10;
      }
      
      // Add chart title
      pdf.setFontSize(12);
      pdf.setTextColor('#333333');
      pdf.text(chartName, margin, yPosition);
      
      yPosition += 5;
      
      // Convert chart to canvas
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // Get canvas dimensions
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if image will fit on current page
      if (yPosition + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      
      // Add image to PDF
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      pdf.addImage(imgData, 'JPEG', margin, yPosition, imgWidth, imgHeight);
      
      yPosition += imgHeight + 15;
      chartCount++;
    }
    
    // Save PDF if we have at least one chart
    if (chartCount > 0) {
      pdf.save(`${filename}.pdf`);
    }
  } catch (error) {
    console.error('Error exporting charts to PDF:', error);
  }
};