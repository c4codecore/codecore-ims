import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateReceiptPDF = (payment, enrollment) => {
    try {
        const doc = new jsPDF();

        // --- Header Section ---
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text("CODE CORE COMPUTER CENTER", 105, 15, { align: "center" });

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text("Power by E-Max India Branch Code: EMAX/FO97663", 105, 20, { align: "center" });
        doc.text("ISO 9001:2015 & ISO 29990:2010 & ISO 21001:2018 Certified Organization", 105, 24, { align: "center" });
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("Fee Receipt Summary", 105, 32, { align: "center" });
        doc.line(80, 33, 130, 33);

        // --- Student Info Table ---
        autoTable(doc, {
            startY: 38,
            body: [
                ["Name", enrollment.student_name || "N/A"],
                ["Enrollment No", enrollment.roll_no || "N/A"],
                ["Father's Name", enrollment.father_name || "N/A"],
                ["Mobile No.", enrollment.student_phone || "N/A"],
                ["Course", enrollment.course_name || "N/A"]
            ],
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', width: 40 } },
            margin: { left: 20, right: 20 }
        });

        // --- Fee Status Table ---
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 5,
            body: [
                ["Total Fees", enrollment.total_final_fee || "0"],
                ["Fees Paid (till date)", enrollment.total_collected || "0"],
                ["Balance", enrollment.total_pending || "0"]
            ],
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', width: 40 } },
            margin: { left: 20, right: 20 }
        });

        // --- Payment History ---
        doc.setFontSize(11);
        doc.text("Fee Payment History", 20, doc.lastAutoTable.finalY + 10);
        
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 12,
            head: [['Sr. No.', 'Date', 'Amount', 'Mode']],
            body: [
                ["1", payment.payment_date || "N/A", payment.amount || "0", (payment.payment_mode || "N/A").toUpperCase()]
            ],
            theme: 'grid',
            headStyles: { fillColor: [220, 220, 220], textColor: [0], fontStyle: 'bold' },
            styles: { fontSize: 9, halign: 'center' },
            margin: { left: 20, right: 20 }
        });

        // --- Receipt No & Date ---
        const currentY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.text(`Receipt No. ${payment.receipt_no || "N/A"}`, 20, currentY);
        doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 190, currentY, { align: "right" });

        // --- Payment Terms & Declaration ---
        const footerStartY = currentY + 15;
        doc.setFont(undefined, 'bold');
        doc.text("Payment Terms", 20, footerStartY);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text("1. Late fee will be charged from the student if the fee is not deposited on time.", 20, footerStartY + 5);
        doc.text("2. If the fee is not deposited on time, the student's admission can also be cancelled.", 20, footerStartY + 9);

        doc.setFont(undefined, 'bold');
        doc.text("Declaration", 20, footerStartY + 18);
        doc.setFont(undefined, 'normal');
        doc.text("We declare that this invoice shows the actual price of the Service described and that all particulars are true and correct.", 20, footerStartY + 23);
        
        // --- Footer ---
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("This is computer generated invoice no signature required", 105, 275, { align: "center" });
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text("Thank You", 105, 282, { align: "center" });
        doc.setFont(undefined, 'bold');
        doc.text("Code Core Computer Center, Gurugram", 105, 288, { align: "center" });

        doc.save(`Receipt_${payment.receipt_no}.pdf`);

    } catch (error) {
        console.error("PDF Logic Error:", error);
    }
};