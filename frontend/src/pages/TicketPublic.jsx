import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, User, CheckCircle, AlertCircle, Printer, Download } from 'lucide-react';
import api from '../api/axios';
import { getFirstName } from '../utils/helpers';

export default function TicketPublic() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const { data } = await api.get(`/registrations/public/${id}`);
      setRegistration(data.registration);
    } catch (err) {
      setError(err.response?.data?.message || 'Ticket not found');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (registration?.qrCode) {
      const link = document.createElement('a');
      link.href = registration.qrCode;
      link.download = `ticket-${registration.ticketNumber}.png`;
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Loading Ticket</h2>
          <p className="text-slate-500 dark:text-slate-400">Please wait...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 mb-3">Invalid Ticket</h1>
          <p className="text-slate-600 dark:text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  const event = registration.event;
  const eventDate = event?.startDate || event?.date;
  const attendeeName = registration.user?.name || 'Attendee';
  const firstName = getFirstName(attendeeName);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Ticket Header */}
        <div className="text-center mb-6 no-print">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100">
            {firstName}&apos;s Ticket
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Scan this ticket at the event entrance
          </p>
        </div>

        {/* Ticket Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden print:shadow-none print:border-2 print:border-slate-200">
          {/* Top accent bar */}
          <div className="h-2 bg-gradient-to-r from-primary-500 to-primary-400" />

          <div className="p-6 sm:p-8">
            {/* Event Title */}
            <div className="text-center mb-6">
              <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold uppercase tracking-wider">Event Ticket</span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 mt-1">
                {event?.title}
              </h2>
            </div>

            <div className="border-t border-b border-slate-200 dark:border-slate-700 py-5 my-5">
              {/* Attendee */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Attendee</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{attendeeName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{registration.user?.email}</p>
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-primary-500 shrink-0" />
                  <span>
                    {eventDate ? new Date(eventDate).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    }) : 'Date TBA'}
                  </span>
                </div>
                {event?.startTime && (
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <Calendar className="w-4 h-4 text-primary-500 shrink-0" />
                    <span>
                      {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}
                    </span>
                  </div>
                )}
                {event?.venue && (
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                    <span>{event.venue}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom section: Ticket Number + QR */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Ticket Number</p>
                <p className="font-mono font-bold text-xl text-primary-600">{registration.ticketNumber}</p>
                {registration.ticketTypeName && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    {registration.ticketTypeName}
                  </p>
                )}
              </div>

              {registration.qrCode && (
                <div className="text-center shrink-0">
                  <img
                    src={registration.qrCode}
                    alt="QR Code"
                    className="w-28 h-28 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Scan for entry</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center mt-6 no-print">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Print Ticket
          </button>
          <button onClick={handleDownloadQR} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download QR
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 no-print">
          Presented at the event entrance for verification
        </p>
      </div>
    </div>
  );
}