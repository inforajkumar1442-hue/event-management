export function googleCalendarUrl(event) {
  const start = new Date(event.startDate);
  if (event.startTime) {
    const [h, m] = event.startTime.split(':');
    start.setHours(parseInt(h), parseInt(m));
  }

  let end = new Date(event.endDate || event.startDate);
  if (event.endTime) {
    const [h, m] = event.endTime.split(':');
    end.setHours(parseInt(h), parseInt(m));
  } else if (event.startTime) {
    end.setHours(end.getHours() + 2);
  } else {
    end.setDate(end.getDate() + 1);
  }

  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: event.description?.substring(0, 1000) || '',
    location: event.venue || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsFileContent(event) {
  const start = new Date(event.startDate);
  if (event.startTime) {
    const [h, m] = event.startTime.split(':');
    start.setHours(parseInt(h), parseInt(m));
  }

  let end = new Date(event.endDate || event.startDate);
  if (event.endTime) {
    const [h, m] = event.endTime.split(':');
    end.setHours(parseInt(h), parseInt(m));
  } else if (event.startTime) {
    end.setHours(end.getHours() + 2);
  } else {
    end.setDate(end.getDate() + 1);
  }

  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventGather//Event//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.venue || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(event) {
  const blob = new Blob([icsFileContent(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
