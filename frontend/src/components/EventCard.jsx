import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const categoryColors = {
  Workshop: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  Seminar: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  Conference: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  Cultural: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  Sports: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  Technical: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  Other: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
};

const statusColors = {
  upcoming: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  ongoing: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  completed: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

export default function EventCard({ event, hoverClassName = '', onMouseEnter, onMouseLeave }) {
  const hasTicketTypes = event.ticketTypes?.length > 0;
  const totalCapacity = hasTicketTypes ? event.ticketTypes.reduce((s, t) => s + t.capacity, 0) : (event.capacity || 0);
  const totalRegistered = hasTicketTypes ? event.ticketTypes.reduce((s, t) => s + (t.registeredCount || 0), 0) : (event.registeredCount || 0);
  const spotsLeft = totalCapacity - totalRegistered;
  const isFull = spotsLeft <= 0;
  const isLow = spotsLeft > 0 && spotsLeft <= 10;
  const minPrice = hasTicketTypes ? Math.min(...event.ticketTypes.filter(t => t.isActive !== false).map(t => t.price)) : event.price;

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const imageUrl = event.imageUrl
    ? event.imageUrl.startsWith('http')
      ? event.imageUrl
      : `${BASE_URL}${event.imageUrl.startsWith('/') ? '' : '/'}${event.imageUrl}`
    : null;

  // Handle date formatting
  const startDate = event.startDate || event.date;
  const endDate = event.endDate;
  const displayTime = event.endTime ? `${event.startTime} - ${event.endTime}` : event.startTime || event.time;

  return (
    <Link to={`/events/${event._id}`} className={`card group hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex flex-col ${hoverClassName}`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-primary-100 to-primary-50 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="w-16 h-16 text-primary-300" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`badge ${categoryColors[event.category] || categoryColors.Other}`}>
            {event.category}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const url = `${window.location.origin}/events/${event._id}`;
              if (navigator.share) {
                navigator.share({ title: event.title, url });
              } else {
                navigator.clipboard.writeText(url);
                toast.success('Link copied!');
              }
            }}
            className="w-7 h-7 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors"
            aria-label="Share event"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          </button>
          <span className={`badge ${statusColors[event.status]}`}>
            {event.status}
          </span>
        </div>
        {hasTicketTypes ? (
          <div className="absolute bottom-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            {minPrice === 0 ? 'Free' : `From ₹${minPrice}`}
          </div>
        ) : event.isFree ? (
          <div className="absolute bottom-3 right-3 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            FREE
          </div>
        ) : event.price > 0 ? (
          <div className="absolute bottom-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            ₹{event.price}
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {event.title}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2 flex-1">{event.description}</p>

        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-500 shrink-0" />
            <span>
              {startDate ? format(new Date(startDate), 'EEE, MMM d, yyyy') : 'Date TBA'}
              {endDate && new Date(endDate).toDateString() !== new Date(startDate).toDateString() &&
                ` - ${format(new Date(endDate), 'MMM d')}`
              }
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-500 shrink-0" />
            <span>{displayTime || 'Time TBA'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
            <span className="line-clamp-1">{event.venue}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-500 shrink-0" />
            {isFull ? (
              <span className="text-red-500 font-semibold">Event Full — Waitlist Available</span>
            ) : isLow ? (
              <span className="text-amber-600 font-semibold">Only {spotsLeft} spots left!</span>
            ) : (
              <span>{spotsLeft} of {totalCapacity} spots available</span>
            )}
          </div>
        </div>

        {/* Capacity bar */}
        <div className="mt-4">
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFull ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-primary-500'}`}
              style={{ width: `${Math.min((totalRegistered / totalCapacity) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}