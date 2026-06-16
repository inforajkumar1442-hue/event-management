// frontend/src/pages/Events.jsx - Complete updated version

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import EventCard from '../components/EventCard';
import api from '../api/axios';
import toast from 'react-hot-toast';

const categories = ['All', 'Workshop', 'Seminar', 'Conference', 'Cultural', 'Sports', 'Technical', 'Other'];
const statuses = ['All', 'upcoming', 'ongoing', 'completed'];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [hoveredEvent, setHoveredEvent] = useState(null);

  // Fetch events function - wrapped in useCallback
  const fetchEvents = useCallback(async (search, cat, stat, pageNum) => {
    setLoading(true);
    try {
      const params = { 
        page: pageNum, 
        limit: 12,
      };
      
      if (search && search.trim()) {
        params.search = search.trim();
      }
      if (cat && cat !== 'All') {
        params.category = cat;
      }
      if (stat && stat !== 'All') {
        params.status = stat;
      }

      console.log('📤 API Request:', { url: '/events', params });

      const { data } = await api.get('/events', { params });
      
      console.log('📥 API Response:', {
        eventsCount: data.events?.length,
        total: data.pagination?.total,
      });
      
      setEvents(data.events || []);
      setPagination(data.pagination);
      
      if (data.events?.length === 0 && search) {
        toast(`No events found matching "${search}"`, { icon: '🔍' });
      }
    } catch (err) {
      console.error('❌ API Error:', err);
      toast.error('Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when any filter changes
  useEffect(() => {
    fetchEvents(searchTerm, category, status, 1);
    setPage(1);
  }, [searchTerm, category, status, fetchEvents]);

  // Fetch when page changes (but not when filters change)
  useEffect(() => {
    if (page > 1) {
      fetchEvents(searchTerm, category, status, page);
    }
  }, [page]);

  const handleSearch = (e) => {
    const value = e.target.value;
    console.log('🔍 Search input:', value);
    setSearchTerm(value);
  };

  const handleCategoryChange = (newCategory) => {
    console.log('📂 Category changed:', newCategory);
    setCategory(newCategory);
  };

  const handleStatusChange = (newStatus) => {
    console.log('🏷️ Status changed:', newStatus);
    setStatus(newStatus);
  };

  const resetFilters = () => {
    console.log('🔄 Resetting all filters');
    setSearchTerm('');
    setCategory('All');
    setStatus('upcoming');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-slate-900 mb-2">
          {searchTerm ? `Search: "${searchTerm}"` : 
           status === 'upcoming' ? 'Upcoming Events' : 
           status === 'ongoing' ? 'Ongoing Events' : 'Events'}
        </h1>
        <p className="text-slate-500">Discover and register for events happening around you</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search events by title, description, or tags..."
            className="input pl-10"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filters */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => handleCategoryChange(c)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                category === c ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filters */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
        <div className="flex flex-wrap gap-2">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                status === s ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'All' ? 'All Events' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      {(searchTerm || category !== 'All' || status !== 'upcoming') && (
        <button onClick={resetFilters} className="text-sm text-red-500 hover:text-red-700 mb-6">
          Reset all filters
        </button>
      )}

      {/* Results count */}
      {!loading && events.length > 0 && (
        <p className="text-sm text-slate-500 mb-4">
          Found {pagination.total} event{pagination.total !== 1 ? 's' : ''}
          {searchTerm && ` matching "${searchTerm}"`}
        </p>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-44 bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results State */}
      {!loading && events.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-display font-bold text-xl text-slate-700 mb-2">No events found</h3>
          <p className="text-slate-500">
            {searchTerm 
              ? `No events matching "${searchTerm}"`
              : 'No events available at the moment'}
          </p>
          {(searchTerm || category !== 'All' || status !== 'upcoming') && (
            <button onClick={resetFilters} className="btn-primary mt-6">Clear all filters</button>
          )}
        </div>
      )}

      {/* Events Grid */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map(event => (
            <EventCard
              key={event._id}
              event={event}
              hoverClassName={`transition-all duration-300 ${
                hoveredEvent === event._id
                  ? 'scale-105 -translate-y-2 shadow-xl z-10 relative'
                  : hoveredEvent !== null
                    ? 'opacity-50 scale-95'
                    : ''
              }`}
              onMouseEnter={() => setHoveredEvent(event._id)}
              onMouseLeave={() => setHoveredEvent(null)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))} 
            disabled={page <= 1} 
            className="btn-secondary px-4 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-slate-600">
            Page {page} of {pagination.pages}
          </span>
          <button 
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} 
            disabled={page >= pagination.pages} 
            className="btn-secondary px-4 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}