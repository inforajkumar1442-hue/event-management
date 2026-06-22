import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Tag, Share2, CheckCircle, XCircle, AlertCircle, ExternalLink, Download, X, MessageCircle, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import CouponInput from '../components/CouponInput';
import { googleCalendarUrl, downloadIcs } from '../utils/calendar';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentCancelled, setPaymentCancelled] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [couponCode, setCouponCode] = useState(null);
  const [selectedTicketType, setSelectedTicketType] = useState(null);
  const [cancelCooldown, setCancelCooldown] = useState(0);
  const [shareModal, setShareModal] = useState(false);

  useEffect(() => {
    if (cancelCooldown <= 0) return;
    const timer = setInterval(() => setCancelCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cancelCooldown]);

  useEffect(() => {
    if (searchParams.get('payment_cancelled') === 'true') {
      setPaymentCancelled(true);
      toast.error('Payment was cancelled. Please try again.');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchEvent();
    if (user) checkRegistration();
  }, [id, user]); // eslint-disable-line react-hooks/exhaustive-deps

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

    if (event?.ticketTypes?.length > 0 && !selectedTicketType) {
      toast.error('Please select a ticket type');
      return;
    }

    setRegistering(true);
    try {
      const { data } = await api.post(`/registrations/${id}`, { ticketTypeName: selectedTicketType });
      setRegistration(data.registration);
      toast.success(data.message);
      fetchEvent(); // Refresh count
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handlePaidRegistration = async () => {
  if (!user) {
    return navigate('/login', {
      state: { from: { pathname: `/events/${id}` } }
    });
  }

  if (event?.ticketTypes?.length > 0 && !selectedTicketType) {
    toast.error('Please select a ticket type');
    setProcessingPayment(false);
    return;
  }

  setProcessingPayment(true);

  try {
    const { data } = await api.post(`/payments/create-checkout-session/${id}`, { couponCode, ticketTypeName: selectedTicketType });

    window.location.href = data.sessionUrl;

  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to initiate payment');
    setProcessingPayment(false);
  }
};

  const handleCancel = async () => {
    setCancelCooldown(10);
    setRegistering(true);
    setShowCancelModal(false);
    try {
      await api.delete(`/registrations/${id}`);
      setRegistration(null);
      toast.success('Registration cancelled');
      fetchEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
      setCancelCooldown(0);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl mb-6" />
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-4" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
    </div>
  );

  if (!event) return null;

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const imageUrl = event.imageUrl?.startsWith('http')
    ? event.imageUrl
    : event.imageUrl
      ? `${BASE_URL}${event.imageUrl.startsWith('/') ? '' : '/'}${event.imageUrl}`
      : null;

  const hasTicketTypes = event.ticketTypes?.length > 0;
  const totalCapacity = hasTicketTypes
    ? event.ticketTypes.reduce((s, t) => s + t.capacity, 0)
    : (event.capacity || 0);
  const totalRegistered = hasTicketTypes
    ? event.ticketTypes.reduce((s, t) => s + (t.registeredCount || 0), 0)
    : (event.registeredCount || 0);
  const spotsLeft = totalCapacity - totalRegistered;
  const isFull = spotsLeft <= 0;
  const isRegistered = registration && ['confirmed', 'waitlisted', 'attended'].includes(registration.status);
  const canRegister = !isRegistered && event.status !== 'cancelled' && event.status !== 'completed';
  const selectedTicketTypeObj = selectedTicketType && event.ticketTypes?.length > 0
    ? event.ticketTypes.find(t => t.name === selectedTicketType)
    : null;
  const isPaidEvent = selectedTicketTypeObj
    ? !selectedTicketTypeObj.isFree && selectedTicketTypeObj.price > 0
    : !event.isFree && event.price > 0;

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
              <h1 className="font-display font-bold text-3xl text-slate-900 dark:text-slate-100">{event.title}</h1>
              <button
                onClick={() => setShareModal(true)}
                className="btn-secondary p-2.5 shrink-0"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">{event.description}</p>
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
                  <div key={i} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                      {sp.name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{sp.name}</p>
                      <p className="text-xs text-primary-600">{sp.designation}</p>
                      {sp.bio && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sp.bio}</p>}
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
                    <span className="text-slate-700 dark:text-slate-300">{item.activity}</span>
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
                  <span className="text-slate-700 dark:text-slate-300">
                    {startDate ? format(new Date(startDate), 'EEEE, MMMM d, yyyy') : 'Date TBA'}
                    {endDate && new Date(endDate).toDateString() !== new Date(startDate).toDateString() &&
                      ` - ${format(new Date(endDate), 'EEEE, MMMM d, yyyy')}`
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{displayTime || 'Time TBA'}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{event.venue}</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-primary-500 shrink-0" />
                <div>
                  <span className="text-slate-700 dark:text-slate-300">
                    {totalRegistered} / {totalCapacity} registered
                  </span>
                </div>
              </div>
            </div>

            {/* Capacity bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>{spotsLeft > 0 ? `${spotsLeft} spots left` : 'Event Full'}</span>
                <span>{totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isFull ? 'bg-red-400' : spotsLeft <= 10 ? 'bg-amber-400' : 'bg-primary-500'}`}
                  style={{ width: `${totalCapacity > 0 ? Math.min((totalRegistered / totalCapacity) * 100, 100) : 0}%` }}
                />
              </div>
            </div>

            <div className="pt-1">
              {/* Ticket Type Selection */}
              {event.ticketTypes?.length > 0 && !isRegistered && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Select Ticket Type</p>
                  {event.ticketTypes.filter(t => t.isActive !== false).map(tt => {
                    const ttSpots = tt.capacity - (tt.registeredCount || 0);
                    const ttFull = ttSpots <= 0;
                    return (
                      <label
                        key={tt.name}
                        className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedTicketType === tt.name ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'}`}
                      >
                        <input
                          type="radio"
                          name="ticketType"
                          value={tt.name}
                          checked={selectedTicketType === tt.name}
                          onChange={() => setSelectedTicketType(tt.name)}
                          className="sr-only"
                          disabled={ttFull}
                        />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{tt.name}</p>
                            {tt.description && <p className="text-xs text-slate-500 dark:text-slate-400">{tt.description}</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900 dark:text-slate-100">{tt.isFree ? 'Free' : `₹${tt.price}`}</p>
                            <p className={`text-xs ${ttFull ? 'text-red-500' : 'text-slate-400'}`}>
                              {ttFull ? 'Full' : `${ttSpots} left`}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 mb-3">
                {event.ticketTypes?.length > 0 && selectedTicketType
                  ? (() => {
                      const tt = event.ticketTypes.find(t => t.name === selectedTicketType);
                      return tt ? (tt.isFree ? <span className="text-emerald-600">Free</span> : <span>₹{tt.price}</span>) : (event.isFree ? <span className="text-emerald-600">Free</span> : <span>₹{event.price}</span>);
                    })()
                  : event.isFree ? <span className="text-emerald-600">Free</span> : <span>₹{event.price}</span>
                }
              </div>

              {isPaidEvent && !isRegistered && (
                <div className="mb-3">
                  <CouponInput
                    eventId={id}
                    onCouponApplied={(data) => setCouponCode(data.coupon.code)}
                    onCouponRemoved={() => setCouponCode(null)}
                  />
                </div>
              )}

              {/* Payment Cancelled Banner */}
              {paymentCancelled && (
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-3">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <p className="text-sm font-medium">Payment was cancelled. You can try again.</p>
                </div>
              )}

              {/* Registration Status/Button */}
              {registration?.status === 'confirmed' && (
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3 mb-3">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">You're registered!</p>
                      <p className="text-xs">Ticket: {registration.ticketNumber}</p>
                    </div>
                  </div>
                  {registration.qrCode && (
                    <div className="text-center mb-3">
                      <img src={registration.qrCode} alt="QR Code" className="w-32 h-32 mx-auto rounded-xl" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Show at entry</p>
                    </div>
                  )}
                  <div className="flex gap-2 mb-3">
                    <a
                      href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/registrations/${registration._id}/ticket-pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center justify-center gap-1.5 text-sm py-2 flex-1"
                    >
                      <Download className="w-4 h-4" /> PDF Ticket
                    </a>
                  </div>
                  <button onClick={() => setShowCancelModal(true)} disabled={registering || cancelCooldown > 0} className="btn-danger w-full text-sm">
                    {cancelCooldown > 0 ? `Wait ${cancelCooldown}s` : 'Cancel Registration'}
                  </button>
                </div>
              )}

              {registration?.status === 'waitlisted' && (
                <div>
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3 mb-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">On Waitlist</p>
                      <p className="text-xs">We'll notify if a spot opens</p>
                    </div>
                  </div>
                  <button onClick={() => setShowCancelModal(true)} disabled={registering || cancelCooldown > 0} className="btn-secondary w-full text-sm">
                    {cancelCooldown > 0 ? `Wait ${cancelCooldown}s` : 'Leave Waitlist'}
                  </button>
                </div>
              )}

              {registration?.status === 'attended' && (
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3">
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
                    {processingPayment ? 'Redirecting to Payment...' : `Pay ₹${selectedTicketTypeObj ? selectedTicketTypeObj.price : event.price} & Register`}
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
                <div className="flex items-center gap-2 text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
                  <XCircle className="w-4 h-4" />
                  <span className="font-semibold text-sm">Event Cancelled</span>
                </div>
              )}

              {event.status === 'completed' && !isRegistered && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-semibold text-sm">Event Ended</span>
                </div>
              )}

              {!user && canRegister && (
                <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">
                  Please <Link to="/login" className="text-primary-600 font-medium">sign in</Link> to register
                </p>
              )}
            </div>
          </div>

          {/* Add to Calendar */}
          {event.status !== 'cancelled' && event.startDate && (
            <div className="card p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-semibold uppercase tracking-wider">Add to Calendar</p>
              <div className="flex gap-2">
                <a
                  href={googleCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 btn-secondary text-xs py-2 px-3"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Google
                </a>
                <button
                  onClick={() => downloadIcs(event)}
                  className="flex items-center gap-1.5 btn-secondary text-xs py-2 px-3"
                >
                  <Download className="w-3.5 h-3.5" /> iCal
                </button>
              </div>
            </div>
          )}

          {/* Organizer */}
          {event.createdBy && (
            <div className="card p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Organized by</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{event.createdBy.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{event.createdBy.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShareModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 mb-4">Share this Event</h2>
            <div className="grid grid-cols-3 gap-4">
              {/* WhatsApp */}
              <button
                onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(event.title + ' ' + window.location.href)}`, '_blank'); setShareModal(false); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">WhatsApp</span>
              </button>

              {/* Facebook */}
              <button
                onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank'); setShareModal(false); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">f</span>
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Facebook</span>
              </button>

              {/* X (Twitter) */}
              <button
                onClick={() => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title + ' ' + window.location.href)}`, '_blank'); setShareModal(false); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">X (Twitter)</span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={() => { window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank'); setShareModal(false); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-400">in</span>
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">LinkedIn</span>
              </button>

              {/* Telegram */}
              <button
                onClick={() => { window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(event.title)}`, '_blank'); setShareModal(false); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Telegram</span>
              </button>

              {/* Copy Link */}
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); setShareModal(false); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Copy Link</span>
              </button>

              {/* Web Share (mobile) */}
              {navigator.share && (
                <button
                  onClick={() => { navigator.share({ title: event.title, url: window.location.href }); setShareModal(false); }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">More...</span>
                </button>
              )}
            </div>
            <button onClick={() => setShareModal(false)} className="btn-secondary w-full mt-4 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showCancelModal}
        title="Cancel Registration?"
        message="Are you sure you want to cancel your registration for this event?"
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
        confirmLabel="Yes, Cancel"
      />
    </div>
  );
}