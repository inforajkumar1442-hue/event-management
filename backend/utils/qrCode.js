import QRCode from 'qrcode';

export const generateQRCode = async (data) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const qrUrl = `${frontendUrl}/ticket/${data.registrationId}`;

    const qrDataURL = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#6366f1', light: '#ffffff' },
    });
    return qrDataURL;
  } catch (error) {
    return null;
  }
};
