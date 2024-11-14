import PDFDocument from 'pdfkit';
import fs from 'fs';

const generateFireNOC = async (user) => {
  const pdfPath = `./FireNOC_${user.email}.pdf`;
  const doc = new PDFDocument();

  doc.pipe(fs.createWriteStream(pdfPath));
  doc.fontSize(20).text("Fire NOC Certificate", { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`This is to certify that the Fire Safety measures for the property owned by ${user.name} (Email: ${user.email}) have been approved.`);
  doc.text("All necessary safety requirements have been met as per the guidelines.");
  doc.text("Congratulations on receiving your Fire NOC!", { align: 'center' });
  doc.end();

  return pdfPath;
};


const approvalEmailBody = (user) => `
  <p>Congratulations ${user.name}! Your Fire NOC has been approved.</p>
  <p>Please find the attached Fire NOC certificate for your records.</p>
  <p>Thank you for ensuring compliance with all fire safety requirements.</p>
`;

const pendingChecklistEmailBody = (user, missingItems) => `
  <p>Dear ${user.name},</p>
  <p>Your application is pending approval due to the following incomplete checklist items:</p>
  <ul>
    ${missingItems.map(item => `<li><strong>${item}</strong></li>`).join('')}
  </ul>
  <p>Please address these items at your earliest convenience to proceed with your application.</p>
`;

const genericNotificationEmailBody = (user) => `
  <p>Dear ${user.name},</p>
  <p>Your application status is currently pending. Please check back for updates or contact our support team if you have any questions.</p>
`;

export {generateFireNOC, approvalEmailBody, pendingChecklistEmailBody, genericNotificationEmailBody};
