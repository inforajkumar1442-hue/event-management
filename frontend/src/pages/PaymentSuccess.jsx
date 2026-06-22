import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Calendar, Download, Printer, MapPin, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { getFirstName } from '../utils/helpers';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const eventId = searchParams.get('event_id');
  
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [error, setError] = useState(null);

  const verifyPayment = async () => {
    try {
      const { data } = await api.get(`/payments/verify/${sessionId}?event_id=${eventId}`);
      
      if (data.success) {
        setSuccess(true);
        setRegistration(data.registration);
        toast.success('Payment successful! You are registered.');
      } else {
        setError(data.message || 'Payment verification failed');
        toast.error(data.message || 'Payment verification failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to verify payment. Please contact support.';
      setError(msg);
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handlePrintTicket = () => {
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

  useEffect(() => {
    if (sessionId && eventId) {
      verifyPayment();
    } else {
      setError('Missing payment information');
      setVerifying(false);
    }
  }, [sessionId, eventId]);

  if (verifying) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Verifying Your Payment</h2>
          <p className="text-slate-500 dark:text-slate-400">Please wait while we confirm your registration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 mb-3">Payment Issue</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">{error}</p>
          <div className="space-y-3">
            <Link to="/events" className="btn-primary block text-center">
              Browse Events
            </Link>
            <Link to="/dashboard" className="btn-secondary block text-center">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!success || !registration) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 mb-3">Registration Pending</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">Your registration is being processed. You will receive an email confirmation shortly.</p>
          <Link to="/dashboard" className="btn-primary inline-block">
            View My Registrations
          </Link>
        </div>
      </div>
    );
  }

  const event = registration.event;
  const eventDate = event?.startDate || event?.date;
  const attendeeName = registration.user?.name || 'Valued Attendee';
  const firstName = getFirstName(attendeeName);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="font-display font-bold text-3xl text-slate-900 dark:text-slate-100 mb-2">
          Thank You, {firstName}! 🎉
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Your registration for <strong>{event?.title}</strong> is confirmed. 
          A confirmation email has been sent to {registration.user?.email}.
        </p>
      </div>

      {/* Ticket Card */}
      <div className="card p-6 mb-6 print:shadow-none print:border" id="ticket">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left side - Event Info & Attendee */}
          <div className="flex-1">
            <div className="mb-4">
              <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">Event Ticket</span>
              <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 mt-1">{event?.title}</h2>
            </div>
            
            {/* Attendee Name Section */}
            <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Attendee</span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{attendeeName}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{registration.user?.email}</p>
            </div>
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-primary-500" />
                <span>
                  {eventDate ? new Date(eventDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Date TBA'}
                </span>
              </div>
              {event?.venue && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  <span>{event.venue}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Ticket Number</p>
              <p className="font-mono font-bold text-lg text-primary-600">{registration.ticketNumber}</p>
            </div>
          </div>

          {/* Right side - QR Code */}
          <div className="text-center border-l border-slate-100 dark:border-slate-700 pl-6">
            {registration.qrCode && (
              <>
                <img 
                  src={registration.qrCode} 
                  alt="QR Code" 
                  className="w-36 h-36 mx-auto rounded-xl border border-slate-200 dark:border-slate-700" 
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Scan this QR code at the entrance</p>
                <p className="text-xs font-medium text-primary-600 mt-1">{firstName}'s Ticket</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center no-print">
        <button onClick={handlePrintTicket} className="btn-secondary flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Print Ticket
        </button>
        <button onClick={handleDownloadQR} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download QR Code
        </button>
        <Link to="/dashboard" className="btn-primary flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          View My Events
        </Link>
      </div>

      {/* Email Notice */}
      <div className="text-center mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl no-print">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          📧 A confirmation email with your ticket has been sent to <strong>{registration.user?.email}</strong>
          <br />
          Please check your spam folder if you don't see it within a few minutes.
        </p>
      </div>
    </div>
  );
}