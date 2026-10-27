// src/app/api/send-bill/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/auth';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isFiniteNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validateInvoice(invoice) {
  if (!invoice || typeof invoice !== 'object') return 'Invoice is required.';
  if (typeof invoice.invoiceNo !== 'string' || !invoice.invoiceNo.trim()) return 'Invoice number is required.';
  if (!Array.isArray(invoice.items) || invoice.items.length === 0 || invoice.items.length > 100) {
    return 'Invoice items are invalid.';
  }
  if (!invoice.items.every((item) =>
    item &&
    typeof item.name === 'string' &&
    Number.isInteger(item.qty) &&
    item.qty > 0 &&
    isFiniteNonNegativeNumber(item.negotiatedPrice)
  )) {
    return 'Invoice item values are invalid.';
  }
  if (!isFiniteNonNegativeNumber(invoice.finalPayable) ||
      !isFiniteNonNegativeNumber(invoice.paidAmount) ||
      !isFiniteNonNegativeNumber(invoice.udhaarAmount)) {
    return 'Invoice totals are invalid.';
  }
  if (!invoice.customerEmail || (
    typeof invoice.customerEmail !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoice.customerEmail)
  )) {
    return 'Customer email is invalid.';
  }
  return null;
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
      return NextResponse.json({ success: false, message: 'Admin authentication required.' }, { status: 401 });
    }
    const body = await request.json();
    const { invoice } = body;
    const validationError = validateInvoice(invoice);
    if (validationError) {
      return NextResponse.json({ success: false, message: validationError }, { status: 400 });
    }

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      return NextResponse.json(
        {
          success: false,
          fallback: true,
          message: 'GMAIL_APP_PASSWORD not set in .env.local yet. Using instant mail client fallback.'
        },
        { status: 200 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    const itemsRows = invoice.items
      .map(
        (item, idx) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${idx + 1}. ${escapeHtml(item.name)}<br/><small style="color:#64748b;">Warranty: ${escapeHtml(item.warranty || 'No Warranty')}</small></td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.qty}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">₹${item.negotiatedPrice}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;">₹${item.qty * item.negotiatedPrice}</td>
        </tr>`
      )
      .join('');

    const htmlContent = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;">
        <div style="background:#059669;color:white;padding:20px;text-align:center;">
          <h2 style="margin:0;">MUJAHID ELECTRONIC GOODS (Dawat دعوت)</h2>
          <p style="margin:4px 0 0;font-size:13px;">Shop No. 2, 165, Kanhaiya Market, Hazrat Nizamuddin, Delhi-13</p>
          <p style="margin:4px 0 0;font-size:12px;">📞 +91 9625035483 | +91 8802572514 | +91 8595431454</p>
        </div>
        <div style="padding:20px;">
          <p><strong>Bill No:</strong> ${escapeHtml(invoice.invoiceNo)} &nbsp;|&nbsp; <strong>Date:</strong> ${escapeHtml(invoice.createdAt)}</p>
          <p><strong>Customer:</strong> ${escapeHtml(invoice.customerName || 'Walk-in Customer')} (${escapeHtml(invoice.customerPhone || '')})</p>
          <table style="width:100%;border-collapse:collapse;margin-top:15px;font-size:14px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px;text-align:left;">Item</th>
                <th style="padding:8px;text-align:center;">Qty</th>
                <th style="padding:8px;text-align:right;">Rate</th>
                <th style="padding:8px;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <div style="margin-top:15px;text-align:right;font-size:14px;">
            <p style="margin:4px 0;">Final Bill Amount: <strong style="font-size:18px;color:#059669;">₹${invoice.finalPayable}</strong></p>
            <p style="margin:4px 0;">Paid Now (${invoice.paymentMode}): <strong>₹${invoice.paidAmount}</strong></p>
            <p style="margin:4px 0;color:${invoice.udhaarAmount > 0 ? '#dc2626' : '#64748b'};">
              Balance Udhaar / Due: <strong>₹${invoice.udhaarAmount}</strong>
            </p>
            <p style="margin:8px 0 0;font-size:12px;color:#475569;">UPI ID for Payment: <strong>${escapeHtml(invoice.upiIdUsed)}</strong> (${escapeHtml(invoice.qrUsed)})</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Mujahid Electronic Goods" <${user}>`,
      to: invoice.customerEmail,
      cc: user,
      subject: `Cash Memo ${invoice.invoiceNo} - Mujahid Electronic Goods (Dawat Mic)`,
      html: htmlContent
    });

    return NextResponse.json({ success: true, message: 'Email sent directly in background!' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}