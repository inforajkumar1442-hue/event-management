import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle, XCircle, Star } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getFirstName } from '../utils/helpers';

// ✅ statusConfig stays at the top (outside component)
const statusConfig = {
  confirmed:  { icon: CheckCircle,  color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Confirmed'  },
  waitlisted: { icon: AlertCircle,  color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Waitlisted' },
  attended:   { icon: CheckCircle,  color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Attended'   },
  cancelled:  { icon: XCircle,      color: 'text-slate-500',   bg: 'bg-slate-50',   label: 'Cancelled'  },
};

// ✅ Helper functions stay at the top
const getDisplayTime = (event) => {
  if (event.startTime && event.endTime) return `${event.startTime} - ${event.endTime}`;
  if (event.startTime) return event.startTime;
  if (event.time) return event.time;
  return 'Time TBA';
};

const safeFormat = (dateVal, fmt, fallback = 'Date TBA') => {
  if (!dateVal) return fallback;
  try { return format(new Date(dateVal), fmt); }
  catch { return fallback; }
};

export default function UserDashboard() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackData, setFeedbackData] = useState({ rating: 5, comment: '' });

  useEffect(() => { fetchRegistrations(); }, []);

  const fetchRegistrations = async () => {
    try {
      const { data } = await api.get('/registrations/my');
      setRegistrations(data.registrations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (eventId) => {
    if (!confirm('Cancel this registration?')) return;
    try {
      await api.delete(`/registrations/${eventId}`);
      toast.success('Registration cancelled');
      fetchRegistrations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const submitFeedback = async () => {
    try {
      await api.post(`/registrations/${feedbackModal}/feedback`, feedbackData);
      toast.success('Feedback submitted!');
      setFeedbackModal(null);
      fetchRegistrations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const now = new Date();

  const filtered = {
    upcoming: registrations.filter(r =>
      ['confirmed', 'waitlisted'].includes(r.status) &&
      r.event &&
      new Date(r.event.startDate || r.event.date) >= now,
    ),
    past: registrations.filter(r =>
      r.status === 'attended' ||
      (r.event && new Date(r.event.startDate || r.event.date) < now && r.status !== 'cancelled'),
    ),
    cancelled: registrations.filter(r => r.status === 'cancelled'),
  };

  const stats = [
    { label: 'Total Registrations', value: registrations.filter(r => r.status !== 'cancelled').length, color: 'text-primary-600 bg-primary-50' },
    { label: 'Upcoming Events',     value: filtered.upcoming.length,                                     color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Attended',            value: registrations.filter(r => r.status === 'attended').length,    color: 'text-blue-600 bg-blue-50'       },
  ];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
          </div>
          <div className="h-10 bg-slate-100 rounded-xl w-48" />
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-slate-900">
          Welcome, {getFirstName(user?.name)}! 👋
        </h1>
        <p className="text-slate-500 mt-1">Manage your event registrations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="card p-5 text-center">
            <div className={`text-3xl font-display font-bold mb-1 ${s.color.split(' ')[0]}`}>{s.value}</div>
            <div className="text-xs text-slate-500 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        {[['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled']].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            {filtered[tab].length > 0 && (
              <span className="ml-1 text-xs bg-primary-100 text-primary-700 rounded-full px-1.5">
                {filtered[tab].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Registration List */}
      {filtered[activeTab].length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No {activeTab} registrations</p>
          <Link to="/events" className="btn-primary mt-4 inline-block text-sm">Browse Events</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered[activeTab].map(reg => {
            if (!reg.event) return null;
            const cfg = statusConfig[reg.status] || statusConfig.confirmed;
            const Icon = cfg.icon;
            const eventDate = reg.event.startDate || reg.event.date;
            const displayTime = getDisplayTime(reg.event);
            const attendeeName = reg.user?.name || user?.name || 'You';

            return (
              <div key={reg._id} className="card p-5 flex flex-col sm:flex-row gap-4 animate-fade-in">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2">
                    <div className={`p-1.5 rounded-lg ${cfg.bg} shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div>
                      <Link
                        to={`/events/${reg.event._id}`}
                        className="font-display font-bold text-slate-900 hover:text-primary-600 transition-colors"
                      >
                        {reg.event.title}
                      </Link>
                      <span className={`ml-2 badge ${cfg.bg} ${cfg.color} text-xs`}>{cfg.label}</span>
                    </div>
                  </div>
                  
                  {/* ✅ Attendee Name */}
                  <div className="ml-9 mb-2 text-sm">
                    <span className="text-slate-500">Attendee: </span>
                    <span className="font-medium text-slate-700">{attendeeName}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500 ml-9">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {safeFormat(eventDate, 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {displayTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {reg.event.venue}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 ml-9">Ticket: {reg.ticketNumber}</p>
                </div>

                <div className="flex flex-row sm:flex-col gap-2 sm:items-end justify-end">
                  {reg.qrCode && reg.status === 'confirmed' && (
                    <img 
                      src={reg.qrCode} 
                      alt="QR Code" 
                      className="w-16 h-16 rounded-lg border border-slate-100"
                      title={`Ticket for ${getFirstName(attendeeName)}`}
                    />
                  )}
                  {reg.status === 'attended' && !reg.feedback?.rating && (
                    <button
                      onClick={() => setFeedbackModal(reg._id)}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      <Star className="w-3 h-3 inline mr-1" />Rate Event
                    </button>
                  )}
                  {reg.status === 'attended' && reg.feedback?.rating && (
                    <div className="flex items-center gap-1 text-amber-500 text-sm" title={`Rating: ${reg.feedback.rating}/5`}>
                      {'★'.repeat(reg.feedback.rating)}{'☆'.repeat(5 - reg.feedback.rating)}
                    </div>
                  )}
                  {['confirmed', 'waitlisted'].includes(reg.status) && (
                    <button
                      onClick={() => handleCancel(reg.event._id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <h3 className="font-display font-bold text-xl mb-4">Rate this Event</h3>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setFeedbackData(f => ({ ...f, rating: n }))}
                  className={`text-2xl transition-transform hover:scale-110 ${n <= feedbackData.rating ? 'text-amber-400' : 'text-slate-200'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={feedbackData.comment}
              onChange={e => setFeedbackData(f => ({ ...f, comment: e.target.value }))}
              className="input h-24 resize-none mb-4"
              placeholder="Share your experience (optional)"
            />
            <div className="flex gap-3">
              <button onClick={submitFeedback} className="btn-primary flex-1">Submit</button>
              <button onClick={() => setFeedbackModal(null)} className="btn-secondary px-6">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}