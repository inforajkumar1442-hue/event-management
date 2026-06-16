import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Tag, Share2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { loadStripe } from '@stripe/stripe-js'; // ← ADD THIS IMPORT
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Initialize Stripe (add this after imports)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false); // ← ADD THIS

  useEffect(() => {
    fetchEvent();
    if (user) checkRegistration();
  }, [id, user]);

  const fetchEvent = async () => {
    try {
      const { data } = await api.get(`/events/${id}`);
      setEvent(data.event);
    } catch {
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const checkRegistration = async () => {
    try {
      const { data } = await api.get(`/registrations/check/${id}`);
      setRegistration(data.registration);
    } catch { }
  };

  // Handle FREE event registration (existing code)
  const handleRegister = async () => {
    if (!user) return navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
    setRegistering(true);
    try {
      const { data } = await api.post(`/registrations/${id}`);
      setRegistration(data.registration);
      toast.success(data.message);
      fetchEvent(); // Refresh count
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  // Handle PAID event registration (NEW FUNCTION)
  // const handlePaidRegistration = async () => {
  //   if (!user) return navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
    
  //   setProcessingPayment(true);
  //   try {
  //     // Create Stripe checkout session
  //     const { data } = await api.post(`/payments/create-checkout-session/${id}`);
      
  //     // Load Stripe and redirect to checkout
  //     const stripe = await stripePromise;
  //     await stripe.redirectToCheckout({ sessionId: data.sessionId });
  //   } catch (err) {
  //     toast.error(err.response?.data?.message || 'Failed to initiate payment');
  //     setProcessingPayment(false);
  //   }
  // };

  const handlePaidRegistration = async () => {
  if (!user) {
    return navigate('/login', {
      state: { from: { pathname: `/events/${id}` } }
    });
  }

  setProcessingPayment(true);

  try {
    const { data } = await api.post(`/payments/create-checkout-session/${id}`);

    // ✅ SIMPLE REDIRECT (recommended)
    window.location.href = data.sessionUrl;

  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to initiate payment');
    setProcessingPayment(false);
  }
};

  const handleCancel = async () => {
    if (!confirm('Cancel your registration?')) return;
    setRegistering(true);
    try {
      await api.delete(`/registrations/${id}`);
      setRegistration(null);
      toast.success('Registration cancelled');
      fetchEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-64 bg-slate-200 rounded-2xl mb-6" />
      <div className="h-8 bg-slate-200 rounded w-2/3 mb-4" />
      <div className="h-4 bg-slate-200 rounded w-full mb-2" />
      <div className="h-4 bg-slate-200 rounded w-5/6" />
    </div>
  );

  if (!event) return null;

  const imageUrl = event.imageUrl?.startsWith('http')
    ? event.imageUrl
    : import.meta.env.PROD
      ? `https://event-management-a7l9.onrender.com${event.imageUrl}`
      : event.imageUrl;

  const spotsLeft = event.capacity - (event.registeredCount || 0);
  const isFull = spotsLeft <= 0;
  const isRegistered = registration && ['confirmed', 'waitlisted', 'attended'].includes(registration.status);
  const canRegister = !isRegistered && event.status !== 'cancelled' && event.status !== 'completed';
  const isPaidEvent = !event.isFree && event.price > 0; // ← ADD THIS

  // Format dates correctly
  const startDate = event.startDate;
  const endDate = event.endDate;
  const displayTime = event.endTime ? `${event.startTime} - ${event.endTime}` : event.startTime;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Image */}
          <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-100 to-primary-50">
            {event.imageUrl ? (
              <img src={imageUrl} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="w-24 h-24 text-primary-200" />
              </div>
            )}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="badge bg-white/90 text-primary-700 shadow">{event.category}</span>
              <span className={`badge ${event.status === 'upcoming' ? 'bg-emerald-500 text-white' : event.status === 'cancelled' ? 'bg-red-500 text-white' : 'bg-slate-700 text-white'}`}>
                {event.status}
              </span>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="font-display font-bold text-3xl text-slate-900">{event.title}</h1>
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
                className="btn-secondary p-2.5 shrink-0"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600 leading-relaxed text-lg">{event.description}</p>
          </div>

          {/* Tags */}
          {event.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 badge bg-primary-50 text-primary-700">
                  <Tag className="w-3 h-3" />{tag}
                </span>
              ))}
            </div>
          )}

          {/* Speakers */}
          {event.speakers?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-bold text-xl mb-4">Speakers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {event.speakers.map((sp, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                      {sp.name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{sp.name}</p>
                      <p className="text-xs text-primary-600">{sp.designation}</p>
                      {sp.bio && <p className="text-xs text-slate-500 mt-1">{sp.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agenda */}
          {event.agenda?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-bold text-xl mb-4">Agenda</h2>
              <div className="space-y-3">
                {event.agenda.map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <span className="text-sm font-semibold text-primary-600 w-16 shrink-0">{item.time}</span>
                    <span className="text-slate-700">{item.activity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Event Info Card */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display font-bold text-lg">Event Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-primary-500 shrink-0" />
                <div>
                  <span className="text-slate-700">
                    {startDate ? format(new Date(startDate), 'EEEE, MMMM d, yyyy') : 'Date TBA'}
                    {endDate && new Date(endDate).toDateString() !== new Date(startDate).toDateString() &&
                      ` - ${format(new Date(endDate), 'EEEE, MMMM d, yyyy')}`
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary-500 shrink-0" />
                <span className="text-slate-700">{displayTime || 'Time TBA'}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                <span className="text-slate-700">{event.venue}</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-primary-500 shrink-0" />
                <div>
                  <span className="text-slate-700">
                    {event.registeredCount || 0} / {event.capacity} registered
                  </span>
                </div>
              </div>
            </div>

            {/* Capacity bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{spotsLeft > 0 ? `${spotsLeft} spots left` : 'Event Full'}</span>
                <span>{Math.round(((event.registeredCount || 0) / event.capacity) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isFull ? 'bg-red-400' : spotsLeft <= 10 ? 'bg-amber-400' : 'bg-primary-500'}`}
                  style={{ width: `${Math.min(((event.registeredCount || 0) / event.capacity) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-1">
              <div className="text-2xl font-display font-bold text-slate-900 mb-3">
                {event.isFree ? <span className="text-emerald-600">Free</span> : <span>₹{event.price}</span>}
              </div>

              {/* Registration Status/Button */}
              {registration?.status === 'confirmed' && (
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 mb-3">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">You're registered!</p>
                      <p className="text-xs">Ticket: {registration.ticketNumber}</p>
                    </div>
                  </div>
                  {registration.qrCode && (
                    <div className="text-center mb-3">
                      <img src={registration.qrCode} alt="QR Code" className="w-32 h-32 mx-auto rounded-xl" />
                      <p className="text-xs text-slate-500 mt-1">Show at entry</p>
                    </div>
                  )}
                  <button onClick={handleCancel} disabled={registering} className="btn-danger w-full text-sm">
                    Cancel Registration
                  </button>
                </div>
              )}

              {registration?.status === 'waitlisted' && (
                <div>
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-3 mb-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">On Waitlist</p>
                      <p className="text-xs">We'll notify if a spot opens</p>
                    </div>
                  </div>
                  <button onClick={handleCancel} disabled={registering} className="btn-secondary w-full text-sm">
                    Leave Waitlist
                  </button>
                </div>
              )}

              {registration?.status === 'attended' && (
                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 rounded-xl px-4 py-3">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-semibold text-sm">Attended ✓</span>
                </div>
              )}

              {/* 🔥 UPDATED BUTTON - Shows different button for free vs paid events */}
              {!registration && canRegister && (
                isPaidEvent ? (
                  <button 
                    onClick={handlePaidRegistration} 
                    disabled={processingPayment} 
                    className="btn-primary w-full py-3"
                  >
                    {processingPayment ? 'Redirecting to Payment...' : `Pay ₹${event.price} & Register`}
                  </button>
                ) : (
                  <button 
                    onClick={handleRegister} 
                    disabled={registering} 
                    className="btn-primary w-full py-3"
                  >
                    {registering ? 'Processing...' : isFull ? 'Join Waitlist' : 'Register Now'}
                  </button>
                )
              )}

              {event.status === 'cancelled' && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3">
                  <XCircle className="w-4 h-4" />
                  <span className="font-semibold text-sm">Event Cancelled</span>
                </div>
              )}

              {event.status === 'completed' && !isRegistered && (
                <div className="flex items-center gap-2 text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-semibold text-sm">Event Ended</span>
                </div>
              )}

              {!user && canRegister && (
                <p className="text-xs text-center text-slate-500 mt-2">
                  Please <a href="/login" className="text-primary-600 font-medium">sign in</a> to register
                </p>
              )}
            </div>
          </div>

          {/* Organizer */}
          {event.createdBy && (
            <div className="card p-4">
              <p className="text-xs text-slate-500 mb-1">Organized by</p>
              <p className="font-semibold text-slate-800">{event.createdBy.name}</p>
              <p className="text-sm text-slate-500">{event.createdBy.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}