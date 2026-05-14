import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─────────────────────────────────────────────────────────────────────────────
//  BRAND CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const B = {
  primary : [13,  71, 161],
  accent  : [198, 40,  40],
  gold    : [255, 179,  0],
  dark    : [15,  23,  42],
  muted   : [100, 116, 139],
  light   : [241, 245, 249],
  white   : [255, 255, 255],
  success : [22,  163,  74],
  danger  : [198,  40,  40],

  phone   : '+91-9013010909',
  email   : 'info@codecore.in',
  website : 'www.codecore.in',
  address : 'Code Core Computer Center, Gurugram, Haryana',
  tagline : 'Empowering Futures Through Technology',
  iso     : 'ISO 9001:2015  |  ISO 29990:2010  |  ISO 21001:2018  Certified Organization',
  powered : 'Powered by E-Max India  |  Branch Code: EMAX/FO97663',
};

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const setRGB    = (doc, [r,g,b]) => doc.setTextColor(r,g,b);
const setFill   = (doc, [r,g,b]) => doc.setFillColor(r,g,b);
const setStroke = (doc, [r,g,b]) => doc.setDrawColor(r,g,b);

const INR = (val) => {
  const n = Number(val) || 0;
  return 'Rs.' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
};

const fmtDate = (d) => {
  if (!d) return 'N/A';
  const parsed = new Date(d);
  if (isNaN(parsed)) return String(d);
  return parsed.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
};

const todayStr = () =>
  new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });

// ─────────────────────────────────────────────────────────────────────────────
//  WATERMARK
// ─────────────────────────────────────────────────────────────────────────────
function drawWatermark(doc) {
  doc.saveGraphicsState();
  try { doc.setGState(new doc.GState({ opacity: 0.04 })); } catch(_) {}
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(68);
  doc.setTextColor(13, 71, 161);
  doc.text('CODE CORE', 105, 155, { align: 'center', angle: 38 });
  doc.restoreGraphicsState();
}

// ─────────────────────────────────────────────────────────────────────────────
//  STAMP — actual stamp.png image, fully visible
// ─────────────────────────────────────────────────────────────────────────────
function drawStamp(doc, stampBase64) {
  const stampW = 38, stampH = 38;
  const stampX = 210 - stampW - 10;  // 10mm from right edge — fully on page
  const stampY = 202;                // comfortably above ad banner at 247

  if (stampBase64) {
    try {
      doc.addImage(stampBase64, 'PNG', stampX, stampY, stampW, stampH);
      return;
    } catch(e) {
      console.warn('Stamp image failed:', e);
    }
  }
  // Fallback
  const cx = stampX + stampW / 2, cy = stampY + stampH / 2;
  setStroke(doc, B.accent);
  doc.setLineWidth(0.8);
  doc.circle(cx, cy, 14, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setRGB(doc, B.accent);
  doc.text('EMAX/FO97663', cx, cy + 2, { align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOGO
// ─────────────────────────────────────────────────────────────────────────────
function drawLogo(doc, x, y, size, logoBase64) {
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', x, y, size, size); return; } catch(_) {}
  }
  // Fallback vector
  const cx = x + size / 2, cy = y + size / 2, r = size / 2;
  setFill(doc, B.accent);
  doc.circle(cx, cy, r, 'F');
  setFill(doc, B.white);
  doc.circle(cx, cy, r - 1.5, 'F');
  setFill(doc, B.accent);
  doc.circle(cx, cy, r - 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(r * 1.8);
  setRGB(doc, B.white);
  doc.text('CC', cx, cy + r * 0.45, { align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  HEADER
// ─────────────────────────────────────────────────────────────────────────────
function drawHeader(doc, logoBase64) {
  const PW = 210, H = 40;
  setFill(doc, B.primary);
  doc.rect(0, 0, PW, H, 'F');
  setFill(doc, B.gold);
  doc.rect(0, H, PW, 2.5, 'F');

  drawLogo(doc, 8, 5, 20, logoBase64);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  setRGB(doc, B.white);
  doc.text('CODE CORE COMPUTER CENTER', 105, 13, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  setRGB(doc, [255, 210, 210]);
  doc.text(B.tagline, 105, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setRGB(doc, [200, 215, 245]);
  doc.text(B.phone + '   |   ' + B.email + '   |   ' + B.website, 105, 27, { align: 'center' });

  doc.setFontSize(6.5);
  setRGB(doc, [170, 190, 230]);
  doc.text(B.iso, 105, 33, { align: 'center' });
  doc.text(B.powered, 105, 38, { align: 'center' });

  return H + 2.5;
}

// ─────────────────────────────────────────────────────────────────────────────
//  RECEIPT TITLE BAR — clean, centered, like original receipt style
// ─────────────────────────────────────────────────────────────────────────────
function drawReceiptTitleBar(doc, startY, receiptNo, date) {
  const PW = 210, H = 15;

  // Soft white-gray band — no red accent
  setFill(doc, [248, 249, 252]);
  doc.rect(0, startY, PW, H, 'F');

  // Thin gold lines top & bottom
  setFill(doc, B.gold);
  doc.rect(0, startY, PW, 0.7, 'F');
  doc.rect(0, startY + H - 0.7, PW, 0.7, 'F');

  // Centered title with underline — matching original receipt look
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setRGB(doc, B.primary);
  doc.text('Fee Receipt Summary', 105, startY + 10, { align: 'center' });

  const tw = doc.getTextWidth('Fee Receipt Summary');
  setStroke(doc, B.primary);
  doc.setLineWidth(0.4);
  doc.line(105 - tw / 2, startY + 11.5, 105 + tw / 2, startY + 11.5);

  // Receipt No. & Date — top right corner
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setRGB(doc, B.muted);
  doc.text('Receipt No.', 148, startY + 6);
  doc.text('Date', 148, startY + 12);

  doc.setFont('helvetica', 'bold');
  setRGB(doc, B.dark);
  doc.text(receiptNo || 'N/A', 168, startY + 6);
  doc.text(date, 168, startY + 12);

  return startY + H + 4;
}

// ─────────────────────────────────────────────────────────────────────────────
//  STUDENT INFO
// ─────────────────────────────────────────────────────────────────────────────
function drawPhotoPlaceholder(doc, x, y, w, h) {
  setFill(doc, B.light);
  setStroke(doc, [190, 200, 220]);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setRGB(doc, B.muted);
  doc.text('Photo', x + w / 2, y + h / 2 + 1, { align: 'center' });
}

function drawStudentInfo(doc, startY, enrollment, photoBase64) {
  const photoW = 28, photoH = 32;
  const cardH = photoH + 8;

  setFill(doc, [252, 252, 255]);
  setStroke(doc, [210, 220, 240]);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, startY, 182, cardH, 2, 2, 'FD');

  setFill(doc, B.primary);
  doc.roundedRect(14, startY, 52, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setRGB(doc, B.white);
  doc.text('STUDENT INFORMATION', 18, startY + 5);

  const photoX = 14 + 182 - photoW - 4;
  const photoY = startY + 9;
  if (photoBase64) {
    try {
      doc.addImage(photoBase64, 'JPEG', photoX, photoY, photoW, photoH - 2, '', 'FAST');
      setStroke(doc, B.primary);
      doc.setLineWidth(0.5);
      doc.rect(photoX, photoY, photoW, photoH - 2, 'S');
    } catch(_) {
      drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH - 2);
    }
  } 
  // else {
  //   drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH - 2);
  // }

  const fields = [
    ['Name',          enrollment.student_name  || 'N/A'],
    ['Enrollment No', enrollment.roll_no       || 'N/A'],
    ["Father's Name", enrollment.father_name   || 'N/A'],
    ['Mobile No.',    enrollment.student_phone || 'N/A'],
    ['Course',        enrollment.course_name   || 'N/A'],
    ['Joining Date',  fmtDate(enrollment.joining_date || enrollment.created_at)],
  ];

  const colBreak = 3;
  fields.forEach(([label, val], i) => {
    const col = i < colBreak ? 0 : 1;
    const fx  = 18 + col * 78;
    const fy  = startY + 13 + (i % colBreak) * 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setRGB(doc, B.muted);
    doc.text(label + ':', fx, fy);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setRGB(doc, B.dark);
    const safe = doc.splitTextToSize(String(val), 68)[0];
    doc.text(safe, fx, fy + 4.5);
  });

  return startY + cardH + 4;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FEE SUMMARY TILES
// ─────────────────────────────────────────────────────────────────────────────
function drawFeeSummary(doc, startY, enrollment) {
  const totalFee = Number(enrollment.total_fee || enrollment.total_final_fee || enrollment.total_fees || enrollment.totalFee) || 0;
  const discount = Number(enrollment.discount || enrollment.discount_amount) || 0;
  const paid     = Number(enrollment.total_paid || enrollment.total_collected || enrollment.fees_paid || enrollment.paidAmount) || 0;
  const balance  = Number(enrollment.balance || enrollment.total_pending || enrollment.balanceAmount)
                   || Math.max(0, totalFee - discount - paid);

  const tiles = [
    { label: 'TOTAL FEE',   val: INR(totalFee), bg: B.primary              },
    { label: 'DISCOUNT',    val: INR(discount), bg: [99, 102, 241]          },
    { label: 'AMOUNT PAID', val: INR(paid),     bg: B.success               },
    { label: 'BALANCE DUE', val: INR(balance),  bg: balance > 0 ? B.danger : B.success },
  ];

  const W = 43, H = 20, gap = 2, lx = 14;
  tiles.forEach(({ label, val, bg }, i) => {
    const tx = lx + i * (W + gap);
    setFill(doc, bg);
    doc.roundedRect(tx, startY, W, H, 2.5, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setRGB(doc, [220, 230, 250]);
    doc.text(label, tx + 4, startY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    setRGB(doc, B.white);
    doc.text(val, tx + 4, startY + 15.5);
  });

  return startY + H + 6;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PAYMENT HISTORY TABLE
// ─────────────────────────────────────────────────────────────────────────────
function drawPaymentHistory(doc, startY, payments) {
  setFill(doc, B.primary);
  doc.roundedRect(14, startY, 182, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setRGB(doc, B.white);
  doc.text('FEE PAYMENT HISTORY', 19, startY + 5.5);

  const rows = (Array.isArray(payments) ? payments : [payments]).map((p, i) => [
    String(i + 1),
    fmtDate(p.payment_date),
    INR(p.amount),
    (p.payment_mode || 'N/A').toUpperCase(),
    p.receipt_no || 'N/A',
  ]);

  autoTable(doc, {
    startY: startY + 8,
    head: [['#', 'Date', 'Amount', 'Mode', 'Receipt No.']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: B.accent,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      halign: 'center',
      textColor: B.dark,
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: [246, 248, 252] },
    columnStyles: {
      0: { cellWidth: 10  },
      1: { cellWidth: 35  },
      2: { cellWidth: 38, fontStyle: 'bold' },
      3: { cellWidth: 30  },
      4: { cellWidth: 69  },
    },
    margin: { left: 14, right: 14 },
    styles: { lineColor: [215, 225, 240], lineWidth: 0.3 },
    tableLineColor: [200, 215, 240],
    tableLineWidth: 0.4,
  });

  return doc.lastAutoTable.finalY + 6;
}

// ─────────────────────────────────────────────────────────────────────────────
//  TERMS + DECLARATION
// ─────────────────────────────────────────────────────────────────────────────
function drawTermsAndDeclaration(doc, startY) {
  const cardH = 32;
  setFill(doc, [250, 251, 254]);
  setStroke(doc, [215, 225, 240]);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, startY, 182, cardH, 2, 2, 'FD');

  setFill(doc, B.accent);
  doc.roundedRect(14, startY, 38, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setRGB(doc, B.white);
  doc.text('PAYMENT TERMS', 17, startY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setRGB(doc, B.muted);
  [
    '1. Late fee will be charged if not deposited on time.',
    '2. Non-payment may result in cancellation of admission.',
    '3. Fees are non-refundable as per institute policy.',
  ].forEach((t, i) => doc.text(t, 17, startY + 12 + i * 5.5));

  setStroke(doc, [215, 225, 240]);
  doc.setLineWidth(0.3);
  doc.line(105, startY + 3, 105, startY + cardH - 3);

  setFill(doc, B.primary);
  doc.roundedRect(108, startY, 32, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setRGB(doc, B.white);
  doc.text('DECLARATION', 111, startY + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  setRGB(doc, B.muted);
  const decl = doc.splitTextToSize(
    'We declare that this invoice shows the actual price of the service described and that all particulars are true and correct. This is a computer-generated receipt.',
    84
  );
  decl.forEach((line, i) => doc.text(line, 111, startY + 12 + i * 5));

  return startY + cardH + 5;
}

// ─────────────────────────────────────────────────────────────────────────────
//  AD BANNER
// ─────────────────────────────────────────────────────────────────────────────
function drawAdBanner(doc, startY) {
  const PW = 210, H = 24;
  setFill(doc, B.primary);
  doc.rect(0, startY, PW, H, 'F');
  setFill(doc, B.gold);
  doc.rect(0, startY, 4, H, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setRGB(doc, B.gold);
  doc.text('** ENROLL NOW IN OUR UPCOMING BATCHES! **', 20, startY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setRGB(doc, [195, 215, 245]);
  doc.text(
    'DCA  |  ADCA  |  Tally Prime  |  MS Office  |  Web Development  |  Python  |  Data Analytics',
    20, startY + 14.5
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  setRGB(doc, [170, 195, 235]);
  doc.text(
    'Govt. Recognized Certificates   |   100% Job Assistance   |   Full AC Classrooms   |   Wifi Facility',
    20, startY + 20
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setRGB(doc, B.gold);
  doc.text('Call: ' + B.phone, PW - 15, startY + 13, { align: 'right' });

  return startY + H;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function drawFooter(doc, startY) {
  const PW = 210;
  setStroke(doc, B.accent);
  doc.setLineWidth(0.8);
  doc.line(14, startY, PW - 14, startY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  setRGB(doc, B.muted);
  doc.text('This is a computer-generated receipt - no signature required.', 105, startY + 5, { align: 'center' });
  doc.text(B.address, 105, startY + 10, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setRGB(doc, B.primary);
  doc.text('Thank You for Choosing Code Core Computer Center', 105, startY + 17, { align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED INTERNAL BUILDER — returns a fully-rendered jsPDF instance
// ─────────────────────────────────────────────────────────────────────────────
function buildReceiptDoc(payment, enrollment, options = {}) {
  const { logoBase64, photoBase64, stampBase64 } = options;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  drawWatermark(doc);

  let y = drawHeader(doc, logoBase64);

  const latestPay = Array.isArray(payment) ? payment[payment.length - 1] : payment;
  y = drawReceiptTitleBar(doc, y, latestPay.receipt_no, todayStr());
  y = drawStudentInfo(doc, y, enrollment, photoBase64);
  y = drawFeeSummary(doc, y, enrollment);
  y = drawPaymentHistory(doc, y, payment);

  if (y + 40 < 244) {
    y = drawTermsAndDeclaration(doc, y);
  }

  drawStamp(doc, stampBase64);
  drawAdBanner(doc, 247);
  drawFooter(doc, 272);

  return { doc, latestPay };
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * generateReceiptPDF — builds and downloads the PDF directly.
 *
 * @param {Object|Object[]} payment    - single payment OR array of all past payments
 * @param {Object}          enrollment - student/enrollment record
 * @param {Object}          [options]  - logoBase64, photoBase64, stampBase64
 */
export const generateReceiptPDF = (payment, enrollment, options = {}) => {
  try {
    const { doc, latestPay } = buildReceiptDoc(payment, enrollment, options);
    doc.save(`Receipt_${latestPay.receipt_no || 'CC'}.pdf`);
  } catch (err) {
    console.error('[generateReceiptPDF] Error:', err);
    throw err;
  }
};

/**
 * generateReceiptPDFBase64 — builds the PDF and returns it as a base64 string.
 * Used for email sending (no file download triggered).
 *
 * @param {Object|Object[]} payment    - single payment OR array of all past payments
 * @param {Object}          enrollment - student/enrollment record
 * @param {Object}          [options]  - logoBase64, photoBase64, stampBase64
 * @returns {string} base64-encoded PDF (without data-URL prefix)
 */
export const generateReceiptPDFBase64 = (payment, enrollment, options = {}) => {
  try {
    const { doc } = buildReceiptDoc(payment, enrollment, options);
    // output('datauristring') returns "data:application/pdf;base64,<data>"
    const dataUri = doc.output('datauristring');
    return dataUri.split(',')[1]; // return only the raw base64 part
  } catch (err) {
    console.error('[generateReceiptPDFBase64] Error:', err);
    throw err;
  }
};