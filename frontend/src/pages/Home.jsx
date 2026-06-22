import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Zap, Shield, ArrowRight, Star, Phone } from 'lucide-react';
import EventCard from '../components/EventCard';
import AnimatedCounter from '../components/AnimatedCounter';
import FontSwitcher from '../components/FontSwitcher';
import api from '../api/axios';
import { SiGmail } from "react-icons/si";
import { useAuth } from '../context/AuthContext';

const contactPhone = import.meta.env.VITE_CONTACT_PHONE || '+917986971443';
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || 'inforajkumar1442@gmail.com';

const features = [
  { icon: Calendar, title: 'Discover Events', desc: 'Browse hundreds of workshops, seminars, conferences, and more.' },
  { icon: Zap, title: 'Instant Registration', desc: 'One-click registration with automatic QR ticket generation.' },
  { icon: Users, title: 'Community First', desc: 'Connect with like-minded people through shared experiences.' },
  { icon: Shield, title: 'Secure & Reliable', desc: 'Your data is safe with JWT auth and encrypted storage.' },
];

const stats = [
  { value: '500+', label: 'Events Hosted' },
  { value: '10K+', label: 'Happy Attendees' },
  { value: '50+', label: 'Categories' },
  { value: '99%', label: 'Satisfaction Rate' },
];

export default function Home() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [ctaVisible, setCtaVisible] = useState(false);
  const ctaRef = useRef(null);

  useEffect(() => {
    if (!ctaRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCtaVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ctaRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    api.get('/events', { params: { limit: 4, status: 'upcoming', sort: '-startDate' } })
      .then(r => setEvents(r.data.events))
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <Star className="w-3.5 h-3.5 text-amber-300" />
            <span>The #1 Event Management Platform</span>
          </div>
          <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl mb-6 leading-tight">
            Discover & Attend<br />
            <FontSwitcher text="Amazing Events" />
          </h1>
          <p className="text-primary-100 text-xl max-w-2xl mx-auto mb-10">
            From tech workshops to cultural fests — find, register, and experience events that matter to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/events" className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 hover:bg-primary-50 font-bold px-8 py-3.5 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">
              Browse Events <ArrowRight className="w-4 h-4" />
            </Link>
            {!user && (
              <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 font-semibold px-8 py-3.5 rounded-2xl transition-all duration-300 backdrop-blur-sm hover:scale-105 hover:shadow-xl hover:shadow-white/20">
                Create Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {stats.map(s => (
              <div key={s.label}>
                <div className="font-display font-bold text-3xl text-primary-600"><AnimatedCounter value={s.value} /></div>
                <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-4xl text-slate-900 dark:text-slate-100 mb-3">Everything you need</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg">A complete platform for discovering and managing events</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <div
              key={f.title}
              className={`card p-6 text-center transition-all duration-300 cursor-pointer ${
                hoveredFeature === f.title
                  ? 'scale-105 -translate-y-2 shadow-xl'
                  : hoveredFeature !== null
                    ? 'opacity-50 scale-95'
                    : ''
              }`}
              onMouseEnter={() => setHoveredFeature(f.title)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <f.icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">{f.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      {events.length > 0 && (
        <section className="bg-slate-50 dark:bg-slate-900 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display font-bold text-4xl text-slate-900 dark:text-slate-100 mb-2">Upcoming Events</h2>
                <p className="text-slate-500 dark:text-slate-400">Don't miss out — register today</p>
              </div>
              <Link to="/events" className="btn-secondary hidden sm:flex items-center gap-2">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className="text-center mt-8 sm:hidden">
              <Link to="/events" className="btn-primary inline-flex items-center gap-2">
                View all events <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section ref={ctaRef} className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div
          className={`bg-gradient-to-br from-primary-600 to-primary-800 rounded-3xl text-white text-center px-8 py-16 transition-all duration-700 ease-out ${
            ctaVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-4'
          }`}
        >
          <h2 className="font-display font-bold text-4xl mb-4">Ready to get started?</h2>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">Join thousands of attendees discovering amazing events every day.</p>
          {!user ? (
            <Link to="/register" className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-3.5 rounded-2xl hover:bg-primary-50 hover:scale-105 hover:shadow-xl transition-all duration-300 shadow-lg">
              Create free account <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link to="/dashboard" className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-3.5 rounded-2xl hover:bg-primary-50 hover:scale-105 hover:shadow-xl transition-all duration-300 shadow-lg">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Logo - click to go to top */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center justify-center gap-2 mb-6 mx-auto hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 bg-primary-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-3 h-3 text-white" />
            </div>
            <span className="font-display font-bold text-white text-base">
              EventGather
            </span>
          </button>

          {/* Contact Icons and Info */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
            {/* Phone */}
            <a
              href={`tel:${contactPhone}`}
              className="flex items-center gap-2 text-slate-400 hover:text-primary-400 transition-colors duration-300 group"
              aria-label="Call us"
            >
              <Phone className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>{contactPhone}</span>
            </a>

            {/* Email */}
            <a
              href={`mailto:${contactEmail}`}
              className="flex items-center gap-2 text-slate-400 hover:text-[#D44638] transition-colors duration-300 group"
              aria-label="Send Email"
            >
              <SiGmail size={20} className="group-hover:scale-110 transition-transform" />
              <span>{contactEmail}</span>
            </a>
          </div>

          {/* Copyright */}
          <p className="text-center text-sm">
            © {new Date().getFullYear()} EventGather. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}