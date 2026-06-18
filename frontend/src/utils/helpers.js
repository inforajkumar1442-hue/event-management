export const getFirstName = (fullName) => {
  if (!fullName) return 'Attendee';
  return fullName.split(' ')[0];
};