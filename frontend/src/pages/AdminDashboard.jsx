import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Calendar, CheckSquare, TrendingUp,
  Plus, Edit2, Trash2, Download, Mail, Eye,
  ToggleLeft, ToggleRight, X, Search, UserPlus, Tag, Bell, Loader2, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/axios';
import EventForm from '../components/EventForm';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#64748b'];

/** Download the CSV for an event using the Authorization header (not a query param). */
const downloadCSV = async (eventId, eventTitle) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/admin/events/${eventId}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventTitle || 'event'}-registrations.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Failed to export CSV');
  }
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventRegistrations, setEventRegistrations] = useState([]);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    phone: ''
  });
  const [confirmModal, setConfirmModal] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponFormData, setCouponFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    maxUses: '',
    expiryDate: ''
  });
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'staff') fetchStaff();
    if (activeTab === 'coupons') fetchCoupons();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, eventsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/events', { params: { limit: 50, sort: '-createdAt' } }),
      ]);
      setStats(statsRes.data);
      setEvents(eventsRes.data.events);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users', { params: { search: userSearch } });
      setUsers(data.users);
    } catch { /* silent */ }
  };

  const fetchStaff = async () => {
    try {
      const { data } = await api.get('/admin/users/staff');
      setStaff(data.staff);
    } catch (err) {
      toast.error('Failed to load staff members');
    }
  };

  const createStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users/staff', staffFormData);
      toast.success('Staff member created successfully');
      setShowStaffForm(false);
      setStaffFormData({ name: '', email: '', password: '', department: '', phone: '' });
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create staff');
    }
  };

  const deleteStaff = (id) => {
    setConfirmModal({ type: "staff", id, title: "Are you sure to delete this staff member?" });
  };
  const toggleStaffStatus = async (id) => {
    try {
      const { data } = await api.put(`/admin/users/staff/${id}/toggle`);
      toast.success(data.message);
      fetchStaff(); // Refresh the staff list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle staff status');
    }
  };

  const deleteEvent = async (id) => {
    setConfirmModal({ type: 'event', id, title: 'Delete this event and all its registrations?' });
  };

  const toggleUser = async (id) => {
    try {
      const { data } = await api.put(`/admin/users/${id}/toggle`);
      toast.success(data.message);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const deleteUser = async (id) => {
    setConfirmModal({ type: 'user', id, title: 'Delete this user and all their registrations?' });
  };

  const handleConfirm = async () => {
    if (!confirmModal) return;
    try {
      if (confirmModal.type === 'event') {
        await api.delete(`/events/${confirmModal.id}`);
        toast.success('Event deleted');
        fetchData();
      } else if (confirmModal.type === 'user') {
        await api.delete(`/admin/users/${confirmModal.id}`);
        toast.success('User deleted');
        fetchUsers();
      } else if (confirmModal.type == "staff") {
        await api.delete(`/admin/users/staff/${confirmModal.id}`);
        toast.success('Staff member deleted');
        fetchStaff();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setConfirmModal(null);
    }
  };

  const viewRegistrations = async (eventId) => {
    try {
      const { data } = await api.get(`/admin/events/${eventId}/registrations`);
      setEventRegistrations(data.registrations);
      setSelectedEvent(events.find(e => e._id === eventId));
      setActiveTab('registrations');
    } catch { /* silent */ }
  };

  const sendReminder = async (eventId) => {
    try {
      const { data } = await api.post(`/admin/events/${eventId}/send-reminder`);
      toast.success(data.message);
    } catch {
      toast.error('Failed to send reminders');
    }
  };

  const sendReminders = async () => {
    setSendingReminders(true);
    try {
      const { data } = await api.post('/admin/trigger-reminders');
      toast.success(`${data.count} notifications sent!`);
    } catch {
      toast.error('Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const { data } = await api.get('/coupons');
      setCoupons(data.coupons || data);
    } catch { /* silent */ }
  };

  const createCoupon = async (e) => {
    e.preventDefault();
    try {
      await api.post('/coupons', { ...couponFormData, discountValue: Number(couponFormData.discountValue), maxUses: couponFormData.maxUses ? Number(couponFormData.maxUses) : undefined });
      toast.success('Coupon created successfully');
      setShowCouponForm(false);
      setCouponFormData({ code: '', discountType: 'percentage', discountValue: '', maxUses: '', expiryDate: '' });
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create coupon');
    }
  };

  const toggleCouponStatus = async (id) => {
    try {
      const { data } = await api.patch(`/coupons/${id}`);
      toast.success(data.message || 'Coupon status updated');
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update coupon');
    }
  };

  const deleteCoupon = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete coupon');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const statCards = [
    { label: 'Total Users', value: stats?.stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Events', value: stats?.stats.totalEvents, icon: Calendar, color: 'bg-purple-50 text-purple-600' },
    { label: 'Registrations', value: stats?.stats.totalRegistrations, icon: CheckSquare, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Upcoming Events', value: stats?.stats.upcomingEvents, icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
  ];

  const tabs = ['overview', 'events', 'users', 'staff', 'coupons', 'registrations'];

  /** Safe date formatter — returns '—' instead of throwing on bad input. */
  const safeFormat = (dateVal, fmt) => {
    if (!dateVal) return '—';
    try {
      const date = new Date(dateVal);
      if (isNaN(date.getTime())) return '—';
      return format(date, fmt);
    }
    catch { return '—'; }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your events and users</p>
        </div>
        <button
          onClick={() => { setEditingEvent(null); setShowEventForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{s.label}</span>
              <div className={`p-2 rounded-xl ${s.color.split(' ')[0]}`}>
                <s.icon className={`w-4 h-4 ${s.color.split(' ')[1]}`} />
              </div>
            </div>
            <p className={`text-3xl font-display font-bold ${s.color.split(' ')[1]}`}>{s.value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6 w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Send Reminders Button */}
          <div className="flex justify-end">
            <button
              onClick={sendReminders}
              disabled={sendingReminders}
              className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
            >
              {sendingReminders ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              {sendingReminders ? 'Sending...' : 'Send Event Reminders'}
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Registrations */}
            <div className="card p-6">
              <h2 className="font-display font-bold text-lg mb-4">Monthly Registrations</h2>
              {stats?.monthlyRegistrations?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.monthlyRegistrations.map(d => ({ month: d._id, count: d.count }))}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[220px] text-slate-400 dark:text-slate-500">
                  <Calendar className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium">No registration data yet</p>
                </div>
              )}
            </div>

            {/* Events by Category */}
            <div className="card p-6">
              <h2 className="font-display font-bold text-lg mb-4">Events by Category</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats?.eventsByCategory?.map(d => ({ name: d._id, value: d.count })) || []}
                    cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stats?.eventsByCategory?.map((d, i) => (
                      <Cell key={d._id || i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Registrations */}
          <div className="card p-6">
            <h2 className="font-display font-bold text-lg mb-4">Recent Registrations</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    {['User', 'Event', 'Date', 'Status'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentRegistrations?.map(reg => (
                    <tr key={reg._id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="py-3 px-3 font-medium">{reg.user?.name}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{reg.event?.title}</td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {safeFormat(reg.event?.startDate || reg.event?.date, 'MMM d')}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`badge text-xs ${reg.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {reg.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!stats?.recentRegistrations || stats.recentRegistrations.length === 0) && (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-500 dark:text-slate-400">
                        There are no registrations right now
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Events Tab ── */}
      {activeTab === 'events' && (
        <div className="animate-fade-in">
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {['Event', 'Category', 'Date', 'Capacity', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {events.map(event => (
                  <tr key={event._id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="py-3 px-4">
                      <Link to={`/events/${event._id}`} className="font-medium text-slate-900 dark:text-slate-100 hover:text-primary-600 line-clamp-1">
                        {event.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs">{event.category}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {safeFormat(event.startDate, 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {(() => {
                        const hasTt = event.ticketTypes?.length > 0;
                        const reg = hasTt ? event.ticketTypes.reduce((s, t) => s + (t.registeredCount || 0), 0) : (event.registeredCount || 0);
                        const cap = hasTt ? event.ticketTypes.reduce((s, t) => s + t.capacity, 0) : (event.capacity || 0);
                        return `${reg}/${cap}`;
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge text-xs ${event.status === 'upcoming' ? 'bg-emerald-100 text-emerald-700' :
                        event.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                          'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => viewRegistrations(event._id)} title="View Registrations" className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => sendReminder(event._id)} title="Send Reminder" className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors">
                          <Mail className="w-4 h-4" />
                        </button>
                        <button onClick={() => downloadCSV(event._id, event.title)} title="Export CSV" className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingEvent(event); setShowEventForm(true); }} title="Edit" className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteEvent(event._id)} title="Delete" className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <div className="animate-fade-in">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="input pl-10 max-w-xs"
                placeholder="Search users..."
              />
            </div>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {['User', 'Email', 'Department', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{u.email}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{u.department || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge text-xs ${u.role === 'admin' ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : u.role === 'staff' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge text-xs ${u.isActive ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{safeFormat(u.createdAt, 'MMM d, yyyy')}</td>
                    <td className="py-3 px-4">
                      {u.role !== 'admin' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleUser(u._id)}
                            title={u.isActive ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-lg transition-colors ${u.isActive ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'}`}
                          >
                            {u.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => deleteUser(u._id)} className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Staff Tab ── */}
      {activeTab === 'staff' && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-xl">Staff Members</h2>
            <button
              onClick={() => setShowStaffForm(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <UserPlus className="w-4 h-4" /> Add Staff
            </button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {['Name', 'Email', 'Department', 'Phone', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {staff.map(s => (
                  <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="py-3 px-4 font-medium">{s.name}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{s.email}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{s.department || '—'}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{s.phone || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge text-xs ${s.isActive ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{safeFormat(s.createdAt, 'MMM d, yyyy')}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {/* Toggle Active/Inactive Button */}
                        <button
                          onClick={() => toggleStaffStatus(s._id)}
                          title={s.isActive ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition-colors ${s.isActive
                            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                            }`}
                        >
                          {s.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={() => deleteStaff(s._id)}
                          className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No staff members found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Coupons Tab ── */}
      {activeTab === 'coupons' && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-xl dark:text-slate-100">Coupons</h2>
            <button
              onClick={() => setShowCouponForm(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Tag className="w-4 h-4" /> Create Coupon
            </button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {['Code', 'Discount', 'Event', 'Used', 'Expires', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {coupons.map(c => (
                  <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="py-3 px-4 font-mono text-xs font-medium text-slate-900 dark:text-slate-100">{c.code}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{c.event?.title || 'All'}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{c.usedCount ?? 0}{c.maxUses ? `/${c.maxUses}` : ''}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{safeFormat(c.expiryDate, 'MMM d, yyyy')}</td>
                    <td className="py-3 px-4">
                      <span className={`badge text-xs ${c.isActive ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleCouponStatus(c._id)}
                          title={c.isActive ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition-colors ${c.isActive
                            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                            }`}
                        >
                          {c.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteCoupon(c._id)}
                          className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No coupons found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Registrations Tab ── */}
      {activeTab === 'registrations' && (
        <div className="animate-fade-in">
          {selectedEvent ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-xl">{selectedEvent.title} — Registrations</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadCSV(selectedEvent._id, selectedEvent.title)}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                  <button onClick={() => setSelectedEvent(null)} className="btn-secondary p-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      {['Ticket', 'Name', 'Email', 'Department', 'Status', 'Checked In'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {eventRegistrations.map(reg => (
                      <tr key={reg._id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="py-3 px-4 font-mono text-xs">{reg.ticketNumber}</td>
                        <td className="py-3 px-4 font-medium">{reg.user?.name}</td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{reg.user?.email}</td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{reg.user?.department || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`badge text-xs ${reg.status === 'confirmed' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' :
                            reg.status === 'attended' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                              'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                            {reg.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {reg.checkedIn ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                              ✓ {reg.checkedInAt ? safeFormat(reg.checkedInAt, 'HH:mm') : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-xs">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-500 dark:text-slate-400 mb-4">Select an event from the Events tab to view registrations</p>
              <button onClick={() => setActiveTab('events')} className="btn-primary">Go to Events</button>
            </div>
          )}
        </div>
      )}

      {/* Staff Form Modal */}
      {showStaffForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-display font-bold text-xl">Add Staff Member</h2>
              <button onClick={() => setShowStaffForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={createStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffFormData.name}
                  onChange={e => setStaffFormData({ ...staffFormData, name: e.target.value })}
                  className="input"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={staffFormData.email}
                  onChange={e => setStaffFormData({ ...staffFormData, email: e.target.value })}
                  className="input"
                  placeholder="staff@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={staffFormData.password}
                  onChange={e => setStaffFormData({ ...staffFormData, password: e.target.value })}
                  className="input"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department *</label>
                <input
                  type="text"
                  required
                  value={staffFormData.department}
                  onChange={e => setStaffFormData({ ...staffFormData, department: e.target.value })}
                  className="input"
                  placeholder="e.g., Operations"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={staffFormData.phone}
                  onChange={e => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                  className="input"
                  placeholder="9876543210"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Create Staff</button>
                <button type="button" onClick={() => setShowStaffForm(false)} className="btn-secondary px-6">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Form Modal */}
      {showCouponForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-display font-bold text-xl dark:text-slate-100">Create Coupon</h2>
              <button onClick={() => setShowCouponForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={createCoupon} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={couponFormData.code}
                  onChange={e => setCouponFormData({ ...couponFormData, code: e.target.value })}
                  className="input"
                  placeholder="e.g., SUMMER20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Discount Type *</label>
                <select
                  required
                  value={couponFormData.discountType}
                  onChange={e => setCouponFormData({ ...couponFormData, discountType: e.target.value })}
                  className="input"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Discount Value * {couponFormData.discountType === 'percentage' ? '(%)' : '(₹)'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={couponFormData.discountValue}
                  onChange={e => setCouponFormData({ ...couponFormData, discountValue: e.target.value })}
                  className="input"
                  placeholder={couponFormData.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 500'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max Uses</label>
                <input
                  type="number"
                  min="1"
                  value={couponFormData.maxUses}
                  onChange={e => setCouponFormData({ ...couponFormData, maxUses: e.target.value })}
                  className="input"
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={couponFormData.expiryDate}
                  onChange={e => setCouponFormData({ ...couponFormData, expiryDate: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Create Coupon</button>
                <button type="button" onClick={() => setShowCouponForm(false)} className="btn-secondary px-6">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h2 className="font-display font-bold text-xl">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button onClick={() => setShowEventForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <EventForm
                event={editingEvent}
                onSuccess={() => { setShowEventForm(false); fetchData(); }}
                onCancel={() => setShowEventForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">Are you sure?</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">{confirmModal.title}</p>
            <div className="flex gap-3">
              <button onClick={handleConfirm} className="btn-danger flex-1">Yes, Delete</button>
              <button onClick={() => setConfirmModal(null)} className="btn-secondary flex-1">No, Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}