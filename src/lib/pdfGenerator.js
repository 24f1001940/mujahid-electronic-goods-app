// src/lib/pdfGenerator.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SHOP_CONFIG } from './db';

export function generateInvoicePDF(inv) {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, 210, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(SHOP_CONFIG.name, 105, 13, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('DAWAT (Made In India) - Original Electronics & Audio Systems', 105, 20, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(SHOP_CONFIG.address, 105, 27, { align: 'center' });
  doc.text(`Mob: ${SHOP_CONFIG.phones.join('  |  ')}`, 105, 33, { align: 'center' });

  // Customer & Invoice Info
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Bill / Cash Memo No: ${inv.invoiceNo}`, 14, 48);
  doc.text(`Date: ${inv.createdAt}`, 140, 48);

  doc.setFont('helvetica', 'normal');
  doc.text(`Customer Name: ${inv.customerName}`, 14, 55);
  doc.text(`Mobile: ${inv.customerPhone}`, 14, 61);
  doc.text(`Email: ${inv.customerEmail || 'N/A'}`, 140, 55);
  doc.text(`Payment Mode: ${inv.paymentMode} (${inv.qrUsed})`, 140, 61);

  // Items Table
  const tableRows = inv.items.map((item, index) => [
    index + 1,
    `${item.name} (${item.warranty || 'Standard'})`,
    item.qty,
    `Rs. ${item.displayPrice}`,
    `Rs. ${item.negotiatedPrice}`,
    `Rs. ${item.qty * item.negotiatedPrice}`
  ]);

  autoTable(doc, {
    startY: 67,
    head: [['#', 'Product & Warranty', 'Qty', 'Fixed Rate', 'Bargain Rate', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255 }
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // Totals & Udhaar Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Negotiated Subtotal: Rs. ${inv.negotiatedSubtotal}`, 130, finalY);
  if (inv.extraDiscount > 0) {
    doc.text(`Extra Bargain Discount: -Rs. ${inv.extraDiscount}`, 130, finalY + 6);
  }
  doc.setFontSize(13);
  doc.setTextColor(5, 150, 105);
  doc.text(`FINAL PAYABLE: Rs. ${inv.finalPayable}`, 130, finalY + 14);

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Amount Paid Now: Rs. ${inv.paidAmount}`, 130, finalY + 21);

  if (inv.udhaarAmount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text(`BALANCE UDHAAR (DUE): Rs. ${inv.udhaarAmount}`, 130, finalY + 28);
  } else {
    doc.setTextColor(5, 150, 105);
    doc.text(`STATUS: FULL PAID (Rs. 0 Due)`, 130, finalY + 28);
  }

  // Footer
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pay via UPI: ${inv.upiIdUsed} (${inv.qrUsed})`, 14, finalY + 14);
  doc.text('Thank you for shopping at Mujahid Electronic Goods, Kanhaiya Market, Hazrat Nizamuddin!', 105, 285, { align: 'center' });

  doc.save(`${inv.invoiceNo}_${inv.customerName.replace(/\s+/g, '_')}.pdf`);
}