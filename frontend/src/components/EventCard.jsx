import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Tag } from 'lucide-react';
import { format } from 'date-fns';

const categoryColors = {
  Workshop: 'bg-blue-100 text-blue-700',
  Seminar: 'bg-purple-100 text-purple-700',
  Conference: 'bg-indigo-100 text-indigo-700',
  Cultural: 'bg-pink-100 text-pink-700',
  Sports: 'bg-green-100 text-green-700',
  Technical: 'bg-amber-100 text-amber-700',
  Other: 'bg-slate-100 text-slate-700',
};

const statusColors = {
  upcoming: 'bg-emerald-100 text-emerald-700',
  ongoing: 'bg-blue-100 text-blue-700',
  completed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-700',
};

export default function EventCard({ event, hoverClassName = '', onMouseEnter, onMouseLeave }) {
  const spotsLeft = event.capacity - (event.registeredCount || 0);
  const isFull = spotsLeft <= 0;
  const isLow = spotsLeft > 0 && spotsLeft <= 10;

  // Handle date formatting
  const startDate = event.startDate || event.date;
  const endDate = event.endDate;
  const displayTime = event.endTime ? `${event.startTime} - ${event.endTime}` : event.startTime || event.time;

  return (
    <Link to={`/events/${event._id}`} className={`card group hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex flex-col ${hoverClassName}`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-primary-100 to-primary-50 overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
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
        <div className="absolute top-3 right-3">
          <span className={`badge ${statusColors[event.status]}`}>
            {event.status}
          </span>
        </div>
        {event.isFree ? (
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
        <h3 className="font-display font-bold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {event.title}
        </h3>
        <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">{event.description}</p>

        <div className="space-y-2 text-sm text-slate-600">
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
              <span>{spotsLeft} of {event.capacity} spots available</span>
            )}
          </div>
        </div>

        {/* Capacity bar */}
        <div className="mt-4">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFull ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-primary-500'}`}
              style={{ width: `${Math.min(((event.registeredCount || 0) / event.capacity) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}