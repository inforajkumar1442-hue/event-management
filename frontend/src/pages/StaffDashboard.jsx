import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, Users, CheckCircle, Clock, MapPin, 
  Search, UserCheck, TrendingUp 
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [searchMode, setSearchMode] = useState(false);

  useEffect(() => {
    fetchTodayEvents();
    fetchStats();
  }, []);

  const fetchTodayEvents = async () => {
    try {
      const { data } = await api.get('/staff/today-events');
      setEvents(data.events);
      
      // Auto-select first event if available
      if (data.events.length > 0 && !selectedEvent) {
        setSelectedEvent(data.events[0]);
        fetchAttendees(data.events[0]._id);
      }
    } catch (err) {
      toast.error('Failed to load today\'s events');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/staff/stats');
      setStats(data.stats);
    } catch {
    }
  };

  const fetchAttendees = async (eventId) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/staff/events/${eventId}/attendees`);
      setAttendees(data.attendees);
    } catch (err) {
      toast.error('Failed to load attendees');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (registrationId) => {
    if (!selectedEvent) return;
    
    setCheckingIn(true);
    try {
      const { data } = await api.post(`/staff/events/${selectedEvent._id}/checkin/${registrationId}`);
      toast.success(data.message);
      
      // Refresh attendees list
      fetchAttendees(selectedEvent._id);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckInByTicket = async (e) => {
    e.preventDefault();
    if (!selectedEvent || !ticketNumber.trim()) return;
    
    setCheckingIn(true);
    try {
      const { data } = await api.post(`/staff/events/${selectedEvent._id}/checkin-by-ticket`, {
        ticketNumber: ticketNumber.trim()
      });
      toast.success(data.message);
      setTicketNumber('');
      fetchAttendees(selectedEvent._id);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid ticket number');
    } finally {
      setCheckingIn(false);
    }
  };

  const getCheckInStatus = () => {
    if (!stats) return null;
    const rate = stats.checkInRate;
    if (rate >= 80) return { color: 'text-green-600', bg: 'bg-green-100', text: 'Excellent' };
    if (rate >= 50) return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Good' };
    return { color: 'text-orange-600', bg: 'bg-orange-100', text: 'Needs Attention' };
  };

  const statusStyle = getCheckInStatus();

  if (loading && events.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
          </div>
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-slate-900">
          Staff Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          Welcome, {user?.name?.split(' ')[0]}! Today is {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* No Events Today */}
      {events.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="font-display font-bold text-2xl text-slate-700 mb-2">No Events Today</h2>
          <p className="text-slate-500 mb-6">
            There are no events scheduled for today.
            <br />
            Please check back tomorrow.
          </p>
          <div className="text-sm text-slate-400">
            <Clock className="w-4 h-4 inline mr-1" />
            Current time: {format(new Date(), 'h:mm a')}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {events.length > 0 && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Today's Events</span>
              <Calendar className="w-5 h-5 text-primary-500" />
            </div>
            <p className="text-3xl font-display font-bold text-slate-900">{stats.todayEventsCount}</p>
          </div>
          
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Total Attendees</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-display font-bold text-slate-900">{stats.totalAttendees}</p>
          </div>
          
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Checked In</span>
              <UserCheck className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-display font-bold text-slate-900">{stats.checkedInCount}</p>
            <p className="text-xs text-slate-500 mt-1">{stats.remainingToCheckIn} remaining</p>
          </div>
          
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Check-in Rate</span>
              <TrendingUp className={`w-5 h-5 ${statusStyle?.color || 'text-slate-500'}`} />
            </div>
            <p className={`text-3xl font-display font-bold ${statusStyle?.color || 'text-slate-900'}`}>
              {stats.checkInRate}%
            </p>
            {statusStyle && (
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${statusStyle.bg} ${statusStyle.color}`}>
                {statusStyle.text}
              </span>
            )}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <>
          {/* Event Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Event</label>
            <div className="flex flex-wrap gap-3">
              {events.map(event => (
                <button
                  key={event._id}
                  onClick={() => {
                    setSelectedEvent(event);
                    fetchAttendees(event._id);
                    setSearchMode(false);
                  }}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    selectedEvent?._id === event._id
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-primary-300'
                  }`}
                >
                  {event.title}
                  <span className="text-xs ml-2 opacity-75">
                    {event.startTime}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selectedEvent && (
            <>
              {/* Event Info */}
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl p-5 mb-6">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <h2 className="font-display font-bold text-xl text-slate-900">
                      {selectedEvent.title}
                    </h2>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {selectedEvent.startTime} - {selectedEvent.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedEvent.venue}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600">
                      {attendees.filter(a => a.checkedIn).length}/{attendees.length}
                    </div>
                    <div className="text-xs text-slate-500">Checked In</div>
                  </div>
                </div>
              </div>

              {/* Quick Check-in by Ticket Number */}
              <div className="card p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-lg">Quick Check-in</h3>
                  <button
                    onClick={() => setSearchMode(!searchMode)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {searchMode ? 'Cancel' : 'Scan Ticket'}
                  </button>
                </div>
                
                {searchMode ? (
                  <form onSubmit={handleCheckInByTicket} className="flex gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={ticketNumber}
                        onChange={(e) => setTicketNumber(e.target.value)}
                        placeholder="Enter ticket number (e.g., TKT-1234567890-ABC12)"
                        className="input pl-10"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={checkingIn || !ticketNumber.trim()}
                      className="btn-primary"
                    >
                      {checkingIn ? 'Checking...' : 'Check In'}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Click "Scan Ticket" to check in attendees by ticket number
                  </p>
                )}
              </div>

              {/* Attendees List */}
              <div className="card overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-display font-bold text-lg">Attendees</h3>
                  <p className="text-sm text-slate-500">
                    {attendees.filter(a => a.checkedIn).length} checked in of {attendees.length}
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticket #</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attendees.map(attendee => (
                        <tr key={attendee._id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            {attendee.checkedIn ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs">✓ In</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs">Pending</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                              {attendee.ticketNumber}
                            </code>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {attendee.user?.name}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {attendee.user?.email}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {attendee.user?.department || '—'}
                          </td>
                          <td className="py-3 px-4">
                            {!attendee.checkedIn ? (
                              <button
                                onClick={() => handleCheckIn(attendee._id)}
                                disabled={checkingIn}
                                className="btn-primary text-xs py-1.5 px-3"
                              >
                                Check In
                              </button>
                            ) : (
                              <span className="text-xs text-green-600">
                                {attendee.checkedInAt && format(new Date(attendee.checkedInAt), 'h:mm a')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {attendees.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No attendees registered for this event yet</p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}