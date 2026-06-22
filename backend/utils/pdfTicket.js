import PDFDocument from 'pdfkit';

export async function generateTicketPDF({ event, registration, user, qrCodeBuffer }) {
  const doc = new PDFDocument({ size: [400, 600], margin: 20 });

  const buffers = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const primary = '#6366f1';
    const lightBg = '#f8f9ff';

    // Background
    doc.rect(0, 0, 400, 600).fill('#ffffff');

    // Top accent bar
    doc.rect(0, 0, 400, 8).fill(primary);

    // Header
    doc.rect(20, 30, 360, 60).fill(lightBg);
    doc.font('Helvetica-Bold').fontSize(18).fillColor(primary)
      .text('Event Ticket', 40, 42);
    doc.font('Helvetica').fontSize(10).fillColor('#64748b')
      .text('Digital Entry Pass', 40, 66);

    // Event title
    const title = event.title || 'Event';
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e293b')
      .text(title, 40, 110, { width: 320, align: 'left' });

    // Divider
    doc.moveTo(40, 140).lineTo(360, 140).stroke('#e2e8f0');

    // Details
    const details = [
      ['Attendee', user.name || 'N/A'],
      ['Ticket #', registration.ticketNumber || 'N/A'],
      ['Date', event.startDate ? new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'TBA'],
      ['Time', event.startTime ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}` : 'TBA'],
      ['Venue', event.venue || 'TBA'],
    ];

    let y = 158;
    details.forEach(([label, value]) => {
      doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text(label, 40, y);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text(value, 40, y + 10, { width: 280 });
      y += 34;
    });

    // Status badge
    doc.roundedRect(280, 110, 80, 22, 4).fill('#dcfce7');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#16a34a')
      .text('CONFIRMED', 285, 114, { width: 70, align: 'center' });

    // Divider
    doc.moveTo(40, y + 4).lineTo(360, y + 4).stroke('#e2e8f0');

    // QR Code
    if (qrCodeBuffer) {
      doc.image(qrCodeBuffer, 140, y + 20, { width: 120, height: 120 });
    }

    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
      .text('Scan this QR code at entry', 100, y + 148, { width: 200, align: 'center' });

    // Footer
    doc.rect(0, 540, 400, 60).fill(primary);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
      .text('EventGather', 40, 555);
    doc.font('Helvetica').fontSize(8).fillColor('#c7d2fe')
      .text('Powered by EventGather', 40, 573);

    // Barcode lines at bottom
    const bcY = 502;
    for (let i = 0; i < 50; i++) {
      const bw = Math.random() > 0.5 ? 3 : 1.5;
      doc.rect(40 + i * 6.4, bcY, bw, 28).fill('#1e293b');
    }

    doc.end();
  });
}
