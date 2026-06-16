/**
 * Validates a person's name with proper constraints
 * @param {string} name - The name to validate
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
export const validateName = (name) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();
  
  // Empty check
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Name cannot be only spaces' };
  }

  // Length checks
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Name cannot exceed 50 characters' };
  }

  // Must contain at least one letter
  if (!/[A-Za-z]/.test(trimmed)) {
    return { isValid: false, error: 'Name must contain letters' };
  }

  // Check for repeated characters (aaaa, bbbb, etc.)
  const withoutSpaces = trimmed.replace(/\s/g, '');
  const repeatedCharPattern = /^(.)\1+$/i;
  if (repeatedCharPattern.test(withoutSpaces)) {
    return { isValid: false, error: 'Please enter a valid name (not just repeated characters)' };
  }

  // Check for at least 2 unique letters (prevents "aa" or "AbAb")
  const letters = trimmed.toLowerCase().match(/[a-z]/g) || [];
  const uniqueLetters = new Set(letters);
  if (uniqueLetters.size < 2 && letters.length > 1) {
    return { isValid: false, error: 'Please enter a valid name with different letters' };
  }

  // Check letter-to-space ratio (prevents "a a a a a")
  const letterCount = (trimmed.match(/[A-Za-z]/g) || []).length;
  const spaceCount = (trimmed.match(/\s/g) || []).length;
  if (spaceCount > letterCount) {
    return { isValid: false, error: 'Name has too many spaces' };
  }

  // Allow only letters, spaces, hyphens, apostrophes, and periods
  if (!/^[A-Za-z\s\-'.]+$/.test(trimmed)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods' };
  }

  // Optional: Check for minimum meaningful content
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1 && words[0].length < 2) {
    return { isValid: false, error: 'Please enter a full name (first and last name recommended)' };
  }

  return { isValid: true, error: null };
};

/**
 * Gets a formatted display name
 * @param {string} name - The raw name
 * @returns {string} - Formatted name (capitalized properly)
 */
export const formatName = (name) => {
  if (!name) return '';
  
  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return '';
      // Handle special cases like "McDonald" -> "McDonald"
      if (word.toLowerCase() === 'mac' && word.length === 3) return word;
      if (word.match(/^mc/i)) {
        return word.charAt(0).toUpperCase() + word.charAt(1).toUpperCase() + word.slice(2).toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Gets initials from a name
 * @param {string} name - The full name
 * @returns {string} - Initials (max 2 characters)
 */
export const getInitials = (name) => {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};