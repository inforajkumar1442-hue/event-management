import QRCode from 'qrcode';

export const generateQRCode = async (data) => {
  try {
    // Enhanced QR data with attendee name
    const qrData = {
      ticketType: data.ticketType || 'event',
      attendeeName: data.attendeeName || data.userName || 'Attendee',
      userId: data.userId,
      eventId: data.eventId,
      eventTitle: data.eventTitle,
      registrationId: data.registrationId,
      ticketNumber: data.ticketNumber,
      timestamp: new Date().toISOString(),
    };
    
    const qrDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: { dark: '#6366f1', light: '#ffffff' },
    });
    return qrDataURL;
  } catch (error) {
    console.error('QR code generation error:', error);
    return null;
  }
};
