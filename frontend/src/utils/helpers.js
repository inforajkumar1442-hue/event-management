import { format } from 'date-fns';

// Shared utility functions
export const getFirstName = (fullName) => {
  if (!fullName) return 'Attendee';
  return fullName.split(' ')[0];
};

export const formatDate = (date, formatStr = 'PPP') => {
  if (!date) return 'Date TBA';
  try {
    return format(new Date(date), formatStr);
  } catch {
    return 'Invalid Date';
  }
};

export const formatTime = (time) => {
  if (!time) return 'Time TBA';
  return time;
};

export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};