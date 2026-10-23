import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '../types';
import { formatFinnishCurrency, formatFinnishDate, formatFinnishPercent, formatFinnishNumber } from './formatUtils';

export const generateInvoicePDF = (invoice: Invoice) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const rightEdge = pageWidth - margin;
  
  // --- Fonts & Styles ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("LASKU / INVOICE", margin, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);

  // --- Header Details (Right side) ---
  const labelX = 125; 
  const valueX = rightEdge;
  let currentY = 25;

  const addHeaderRow = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, labelX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(value, valueX, currentY, { align: 'right' }); 
    currentY += 6;
  };
  
  addHeaderRow("Laskunumero / No:", invoice.invoiceNumber);
  addHeaderRow("Laskun päiväys / Date:", formatFinnishDate(invoice.invoiceDate));
  addHeaderRow("Maksuehto / Terms:", `${invoice.paymentDuration} pv / days`);
  addHeaderRow("Eräpäivä / Due Date:", formatFinnishDate(invoice.dueDate));
  addHeaderRow("Viitenumero / Ref:", invoice.referenceNumber);

  // --- Receiver (Left side) ---
  doc.setFont("helvetica", "bold");
  doc.text("Vastaanottaja / Recipient", margin, 38);
  doc.setFont("helvetica", "normal");
  
  let receiverTextY = 45;
  // 1. Name
  doc.text(invoice.recipientName, margin, receiverTextY);
  receiverTextY += 5;

  // 2. Email
  if (invoice.recipientEmail) {
    doc.text(invoice.recipientEmail, margin, receiverTextY);
    receiverTextY += 5;
  }

  // 3. Y-tunnus
  if (invoice.recipientBusinessId) {
    doc.text(`Y-tunnus: ${invoice.recipientBusinessId}`, margin, receiverTextY);
    receiverTextY += 5;
  }

  // 4. Address
  if (invoice.recipientAddress) {
    const receiverAddrLines = doc.splitTextToSize(invoice.recipientAddress, 80);
    doc.text(receiverAddrLines, margin, receiverTextY);
    receiverTextY += (receiverAddrLines.length * 5);
  }

  // --- Sender (Left side, below receiver) ---
  const senderY = Math.max(75, receiverTextY + 8);
  doc.setFont("helvetica", "bold");
  doc.text("Myyjä / Sender", margin, senderY);
  doc.setFont("helvetica", "normal");
  
  let senderTextY = senderY + 7;
  doc.text(`${invoice.senderName}`, margin, senderTextY); senderTextY += 5;
  if(invoice.senderEmail) { doc.text(invoice.senderEmail, margin, senderTextY); senderTextY += 5; }
  if(invoice.senderPhone) { doc.text(invoice.senderPhone, margin, senderTextY); senderTextY += 5; }
  if(invoice.senderBusinessId) { doc.text(`Y-tunnus: ${invoice.senderBusinessId}`, margin, senderTextY); senderTextY += 5; }
  
  const senderAddr = doc.splitTextToSize(invoice.senderAddress, 80);
  doc.text(senderAddr, margin, senderTextY);
  senderTextY += (senderAddr.length * 5);

  // --- Items Table with Finnish numbers ---
  const tableData = invoice.items.map(item => {
    const totalRow = item.quantity * item.unitPrice;
    return [
      item.description,
      formatFinnishDate(item.dateOfWork),
      formatFinnishNumber(item.quantity, 0, 2),
      formatFinnishCurrency(item.unitPrice, false),
      formatFinnishPercent(item.vatRate, 1),
      formatFinnishCurrency(totalRow, false)
    ];
  });

  autoTable(doc, {
    startY: Math.max(120, senderTextY + 10),
    head: [['Kuvaus / Description', 'Pvm / Date', 'Määrä / Qty', 'À-hinta (€)', 'ALV %', 'Yhteensä (€)']],
    body: tableData,
    theme: 'plain',
    styles: { 
      fontSize: 8.5, 
      cellPadding: 3,
      lineColor: [225, 230, 238],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: 20,
      fontStyle: 'bold',
      lineWidth: 0.1,
      lineColor: [200, 210, 225]
    },
    columnStyles: {
      5: { halign: 'right' },
      4: { halign: 'right' },
      3: { halign: 'right' },
      2: { halign: 'center' }
    }
  });

  // --- Totals ---
  let finalY = (doc as any).lastAutoTable.finalY + 8;
  
  let totalExclVat = 0;
  let totalVat = 0;
  
  invoice.items.forEach(item => {
    const totalIncVat = item.quantity * item.unitPrice;
    const vatAmount = totalIncVat - (totalIncVat / (1 + item.vatRate / 100));
    const netAmount = totalIncVat - vatAmount;
    
    totalExclVat += netAmount;
    totalVat += vatAmount;
  });

  const totalPayable = totalExclVat + totalVat;

  const addTotalRow = (label: string, value: string) => {
    doc.text(label, 130, finalY);
    doc.text(value, rightEdge, finalY, { align: 'right' });
    finalY += 5.5;
  };

  addTotalRow("Total excl. VAT / Net (ALV 0 %):", formatFinnishCurrency(totalExclVat));
  addTotalRow("VAT / ALV:", formatFinnishCurrency(totalVat));
  doc.setFont("helvetica", "bold");
  addTotalRow("Total Payable / Maksettava:", formatFinnishCurrency(totalPayable));
  doc.setFont("helvetica", "normal");

  // --- Payment Slip at Bottom ---
  const pageHeight = doc.internal.pageSize.getHeight();
  const slipY = pageHeight - 85;

  doc.setDrawColor(210, 215, 225);
  doc.line(margin, slipY, rightEdge, slipY);

  doc.setFontSize(8.5);
  
  doc.setFont("helvetica", "bold");
  doc.text("Saajan tilinumero / IBAN", margin, slipY + 10);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.senderIban, 65, slipY + 10);

  doc.setFont("helvetica", "bold");
  doc.text("BIC / SWIFT", margin, slipY + 16);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.senderBic, 65, slipY + 16);

  doc.setFont("helvetica", "bold");
  doc.text("Saaja / Beneficiary", margin, slipY + 22);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.senderName, 65, slipY + 22);

  doc.setFont("helvetica", "bold");
  doc.text("Viitenumero / Reference", margin, slipY + 28);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.referenceNumber, 65, slipY + 28);

  doc.setFont("helvetica", "bold");
  doc.text("Eräpäivä / Due Date", margin, slipY + 34);
  doc.setFont("helvetica", "normal");
  doc.text(formatFinnishDate(invoice.dueDate), 65, slipY + 34);

  doc.setFont("helvetica", "bold");
  doc.text("Maksettava summa / Amount", margin, slipY + 40);
  doc.setFont("helvetica", "bold");
  doc.text(formatFinnishCurrency(totalPayable), 65, slipY + 40);

  // Footer note
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.text("Kiitos yhteistyöstä! / Thank you for your business!", margin, pageHeight - 10);

  // Save / Download
  doc.save(`Lasku_${invoice.invoiceNumber}.pdf`);
};
