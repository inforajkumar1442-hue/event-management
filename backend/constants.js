export const EVENT_CATEGORIES = ['Workshop', 'Seminar', 'Conference', 'Cultural', 'Sports', 'Technical', 'Other'];

export const MAX_PAGINATION_LIMIT = 100;

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
