import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Upload, X, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const schema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  category: z.enum(['Workshop','Seminar','Conference','Cultural','Sports','Technical','Other']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  venue: z.string().min(1, 'Venue is required'),
  capacity: z.coerce.number().min(1),
  price: z.coerce.number().min(0).optional(),
  tags: z.string().optional(),
  status: z.enum(['upcoming','ongoing','completed','cancelled']).optional(),
});

const categories = ['Workshop','Seminar','Conference','Cultural','Sports','Technical','Other'];

export default function EventForm({ event, onSuccess, onCancel }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(event?.imageUrl || null);
  const [speakers, setSpeakers] = useState(event?.speakers || []);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: event ? {
      ...event,
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      tags: event.tags?.join(', ') || '',
    } : { 
      category: 'Workshop', 
      status: 'upcoming', 
      price: 0,
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
    },
  });

  const watchStartDate = watch('startDate');

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const addSpeaker = () => setSpeakers([...speakers, { name: '', designation: '', bio: '' }]);
  const removeSpeaker = (i) => setSpeakers(speakers.filter((_, idx) => idx !== i));
  const updateSpeaker = (i, field, value) => {
    const updated = [...speakers];
    updated[i][field] = value;
    setSpeakers(updated);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => { 
        if (v !== undefined && v !== '') formData.append(k, v); 
      });
      if (imageFile) formData.append('image', imageFile);
      if (speakers.length > 0) formData.append('speakers', JSON.stringify(speakers));

      let response;
      if (event?._id) {
        response = await api.put(`/events/${event._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Event updated!');
      } else {
        response = await api.post('/events', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Event created!');
      }
      onSuccess?.(response.data.event);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, error, children }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="Event Title" error={errors.title?.message}>
            <input {...register('title')} className="input" placeholder="Enter event title" />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label="Description" error={errors.description?.message}>
            <textarea {...register('description')} className="input h-32 resize-none" placeholder="Describe your event..." />
          </Field>
        </div>

        <Field label="Category" error={errors.category?.message}>
          <select {...register('category')} className="input">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Status" error={errors.status?.message}>
          <select {...register('status')} className="input">
            {['upcoming','ongoing','completed','cancelled'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </Field>

        {/* Start Date & Time */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">Event Start</label>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date" error={errors.startDate?.message}>
              <input {...register('startDate')} type="date" className="input" />
            </Field>
            <Field label="Start Time" error={errors.startTime?.message}>
              <input {...register('startTime')} type="time" className="input" />
            </Field>
          </div>
        </div>

        {/* End Date & Time */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">Event End</label>
          <div className="grid grid-cols-2 gap-4">
            <Field label="End Date" error={errors.endDate?.message}>
              <input 
                {...register('endDate', {
                  validate: (value) => {
                    if (watchStartDate && value && new Date(value) < new Date(watchStartDate)) {
                      return "End date cannot be before start date";
                    }
                    return true;
                  }
                })} 
                type="date" 
                className="input" 
              />
            </Field>
            <Field label="End Time" error={errors.endTime?.message}>
              <input {...register('endTime')} type="time" className="input" />
            </Field>
          </div>
          {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
        </div>

        <div className="md:col-span-2">
          <Field label="Venue" error={errors.venue?.message}>
            <input {...register('venue')} className="input" placeholder="Enter venue address" />
          </Field>
        </div>

        <Field label="Capacity" error={errors.capacity?.message}>
          <input {...register('capacity')} type="number" className="input" placeholder="Max attendees" />
        </Field>

        <Field label="Price (₹ — leave 0 for free)" error={errors.price?.message}>
          <input {...register('price')} type="number" step="0.01" className="input" placeholder="0" />
        </Field>

        <div className="md:col-span-2">
          <Field label="Tags (comma-separated)" error={errors.tags?.message}>
            <input {...register('tags')} className="input" placeholder="e.g., react, nodejs, webdev" />
          </Field>
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Event Image</label>
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-primary-400 transition-colors relative">
          {imagePreview ? (
            <div className="relative inline-block">
              <img src={imagePreview} alt="preview" className="max-h-40 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Click to upload or drag & drop</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
            </>
          )}
          <input type="file" accept="image/*" onChange={handleImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
      </div>

      {/* Speakers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-700">Speakers</label>
          <button type="button" onClick={addSpeaker} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
            <Plus className="w-4 h-4" /> Add Speaker
          </button>
        </div>
        {speakers.map((sp, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-4 mb-3 relative">
            <button type="button" onClick={() => removeSpeaker(i)} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-2 gap-3">
              <input value={sp.name} onChange={e => updateSpeaker(i,'name',e.target.value)} className="input text-sm" placeholder="Speaker name" />
              <input value={sp.designation} onChange={e => updateSpeaker(i,'designation',e.target.value)} className="input text-sm" placeholder="Designation" />
              <div className="col-span-2">
                <input value={sp.bio} onChange={e => updateSpeaker(i,'bio',e.target.value)} className="input text-sm" placeholder="Short bio" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary px-6">Cancel</button>
        )}
      </div>
    </form>
  );
}