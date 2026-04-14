// ============================================
// BDCS - Service Certificate Generator
// Generate PDF service certificates for relieved/alumni users
// ============================================

import jsPDF from 'jspdf';
import { format } from 'date-fns';

/**
 * Generate a professional service certificate PDF
 * @param {Object} userData - User data including name, roles, dates, etc.
 * @returns {void} - Downloads the PDF certificate
 */
export const generateServiceCertificate = (userData) => {
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Certificate border
    pdf.setLineWidth(2);
    pdf.setDrawColor(153, 27, 27); // Biyani Red
    pdf.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

    pdf.setLineWidth(0.5);
    pdf.setDrawColor(153, 27, 27);
    pdf.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S');

    // Header
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(153, 27, 27);
    pdf.text('BIYANI GROUP OF COLLEGES', pageWidth / 2, 30, { align: 'center' });

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text('Jaipur, Rajasthan', pageWidth / 2, 38, { align: 'center' });

    // Certificate Title
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('SERVICE CERTIFICATE', pageWidth / 2, 55, { align: 'center' });

    // Underline
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(153, 27, 27);
    pdf.line(60, 58, pageWidth - 60, 58);

    // Certificate Number & Date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    const certNumber = `BDCS/SC/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`;
    pdf.text(`Certificate No: ${certNumber}`, 20, 70);
    pdf.text(`Issue Date: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - 20, 70, { align: 'right' });

    // Body
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40, 40, 40);

    const startY = 85;
    const lineHeight = 8;
    let currentY = startY;

    // Introduction
    pdf.text('This is to certify that', 20, currentY);
    currentY += lineHeight * 1.5;

    // Name
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(153, 27, 27);
    pdf.text(userData.name || 'N/A', pageWidth / 2, currentY, { align: 'center' });
    currentY += lineHeight * 1.5;

    // Employee/Student ID
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    const idText = userData.employeeId ? `Employee ID: ${userData.employeeId}` : userData.enrollmentNumber ? `Enrollment No: ${userData.enrollmentNumber}` : '';
    if (idText) {
        pdf.text(idText, pageWidth / 2, currentY, { align: 'center' });
        currentY += lineHeight * 1.5;
    }

    // Main content
    pdf.setFontSize(12);
    pdf.setTextColor(40, 40, 40);

    const roles = userData.lifecycleMetadata?.roles || [userData.role];
    const roleText = roles.map(r => r?.toUpperCase()).join(', ');

    const joiningDate = userData.joiningDate?.toDate ? userData.joiningDate.toDate() : new Date(userData.createdAt?.toDate?.() || Date.now());
    const relievingDate = userData.relievingDate?.toDate ? userData.relievingDate.toDate() : new Date();

    // Calculate years of service
    const years = relievingDate.getFullYear() - joiningDate.getFullYear();
    const months = relievingDate.getMonth() - joiningDate.getMonth();
    const totalMonths = years * 12 + months;
    const serviceYears = Math.floor(totalMonths / 12);
    const serviceMonths = totalMonths % 12;

    let serviceDuration = '';
    if (serviceYears > 0) {
        serviceDuration += `${serviceYears} year${serviceYears > 1 ? 's' : ''}`;
    }
    if (serviceMonths > 0) {
        if (serviceDuration) serviceDuration += ' and ';
        serviceDuration += `${serviceMonths} month${serviceMonths > 1 ? 's' : ''}`;
    }
    if (!serviceDuration) serviceDuration = 'less than a month';

    // Service details
    const serviceText = [
        `has served this institution with distinction as ${roleText}`,
        userData.collegeName ? `at ${userData.collegeName}` : '',
        userData.departmentName ? `in the ${userData.departmentName} Department` : '',
        `from ${format(joiningDate, 'dd MMM yyyy')} to ${format(relievingDate, 'dd MMM yyyy')},`,
        `a total duration of ${serviceDuration}.`
    ].filter(Boolean);

    serviceText.forEach(line => {
        const lines = pdf.splitTextToSize(line, pageWidth - 40);
        lines.forEach(splitLine => {
            pdf.text(splitLine, 20, currentY);
            currentY += lineHeight;
        });
    });

    currentY += lineHeight;

    // Performance note
    if (userData.lifecycleMetadata?.performanceNotes) {
        pdf.text(pdf.splitTextToSize(userData.lifecycleMetadata.performanceNotes, pageWidth - 40), 20, currentY);
        currentY += lineHeight * 2;
    } else {
        pdf.text('During their tenure, they have demonstrated professionalism, dedication, and', 20, currentY);
        currentY += lineHeight;
        pdf.text('commitment to excellence in their role.', 20, currentY);
        currentY += lineHeight * 1.5;
    }

    // Farewell
    pdf.text('We wish them all the best in their future endeavors.', 20, currentY);
    currentY += lineHeight * 2.5;

    // Signatures
    const signatureY = pageHeight - 60;

    // Left signature (HR/Admin)
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('_____________________', 30, signatureY);
    pdf.text('Authorized Signatory', 30, signatureY + 6);
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('HR Department', 30, signatureY + 11);

    // Right signature (Principal/Director)
    pdf.setFontSize(10);
    pdf.setTextColor(40, 40, 40);
    pdf.text('_____________________', pageWidth - 80, signatureY);
    pdf.text('Principal/Director', pageWidth - 80, signatureY + 6);
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(userData.collegeName || 'Biyani Group', pageWidth - 80, signatureY + 11);

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.setFont('helvetica', 'italic');
    const footerText = 'This is a computer-generated certificate and does not require a physical signature.';
    pdf.text(footerText, pageWidth / 2, pageHeight - 20, { align: 'center' });

    // Stamp placeholder
    pdf.setLineWidth(0.3);
    pdf.setDrawColor(153, 27, 27);
    pdf.circle(pageWidth / 2, signatureY - 10, 15, 'S');
    pdf.setFontSize(8);
    pdf.setTextColor(153, 27, 27);
    pdf.text('OFFICIAL', pageWidth / 2, signatureY - 12, { align: 'center' });
    pdf.text('SEAL', pageWidth / 2, signatureY - 6, { align: 'center' });

    // Save PDF
    const fileName = `Service_Certificate_${userData.name?.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`;
    pdf.save(fileName);
};

/**
 * Generate a simple relieved member ID card (bonus feature)
 * @param {Object} userData - User data
 */
export const generateAlumniCard = (userData) => {
    const pdf = new jsPDF('landscape', 'mm', [85.6, 53.98]); // Credit card size

    // Background
    pdf.setFillColor(153, 27, 27);
    pdf.rect(0, 0, 85.6, 53.98, 'F');

    // White content area
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(3, 3, 79.6, 47.98, 2, 2, 'F');

    // Header
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(153, 27, 27);
    pdf.text('BIYANI GROUP', 6, 8);

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(userData.status === 'relieved' ? 'ALUMNI CARD' : 'MEMBER CARD', 6, 12);

    // Name
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(userData.name || 'N/A', 6, 20);

    // Details
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Role: ${userData.role?.toUpperCase()}`, 6, 25);
    if (userData.employeeId) {
        pdf.text(`ID: ${userData.employeeId}`, 6, 29);
    }
    if (userData.collegeName) {
        pdf.text(userData.collegeName, 6, 33);
    }

    // Service period
    const joiningYear = userData.joiningDate?.toDate ? userData.joiningDate.toDate().getFullYear() : 'N/A';
    const relievingYear = userData.relievingDate?.toDate ? userData.relievingDate.toDate().getFullYear() : new Date().getFullYear();
    pdf.text(`${joiningYear} - ${relievingYear}`, 6, 37);

    // QR code placeholder
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(65, 15, 15, 15, 'S');
    pdf.setFontSize(5);
    pdf.setTextColor(150, 150, 150);
    pdf.text('QR', 70, 23, { align: 'center' });

    // Footer
    pdf.setFontSize(5);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Valid for alumni services and events', 6, 48);

    const fileName = `Alumni_Card_${userData.name?.replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
};
