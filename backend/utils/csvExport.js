import { Parser } from 'json2csv';

export const exportRegistrationsToCSV = (registrations) => {
  const fields = [
    { label: 'Ticket Number',  value: 'ticketNumber' },
    { label: 'User Name',      value: 'user.name' },
    { label: 'User Email',     value: 'user.email' },
    { label: 'Department',     value: 'user.department' },
    { label: 'Phone',          value: 'user.phone' },
    { label: 'Event',          value: 'event.title' },
    {
      label: 'Event Date',
      value: row => {
        const d = row.event?.startDate || row.event?.date;
        return d ? new Date(d).toLocaleDateString() : 'N/A';
      },
    },
    { label: 'Venue',          value: 'event.venue' },
    { label: 'Status',         value: 'status' },
    { label: 'Checked In',     value: row => (row.checkedIn ? 'Yes' : 'No') },
    { label: 'Registered At',  value: row => new Date(row.createdAt).toLocaleString() },
    { label: 'Rating',         value: 'feedback.rating' },
    { label: 'Feedback',       value: 'feedback.comment' },
  ];

  const parser = new Parser({ fields });
  return parser.parse(registrations);
};
