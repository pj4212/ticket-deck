import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarPlus } from 'lucide-react';

function normalizeDate(str) {
  let s = str;
  if (!/Z|[+-]\d{2}:\d{2}$/.test(s)) s = s + 'Z';
  return new Date(s);
}

function formatICSDate(str, tz) {
  const d = normalizeDate(str);
  const p = {};
  new Intl.DateTimeFormat('en-AU', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(d).forEach(({ type, value }) => { p[type] = value; });
  return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`;
}

export default function AddToCalendar({ occurrence, ticket }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const ev = occurrence; // works with both old `occurrence` and new `event` naming

  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  if (!ev?.start_datetime || !ev?.end_datetime) return null;

  const tz = ev.timezone || 'Australia/Brisbane';
  const desc = ev.description || '';
  const loc = ev.venue_details || (ev.event_mode === 'online_stream' ? 'Online' : '');

  const googleUrl = () => {
    const start = normalizeDate(ev.start_datetime);
    const end = normalizeDate(ev.end_datetime);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: ev.name, dates: `${fmt(start)}/${fmt(end)}`, details: desc, location: loc, ctz: tz }).toString()}`;
  };

  const outlookUrl = () => {
    const start = normalizeDate(ev.start_datetime).toISOString();
    const end = normalizeDate(ev.end_datetime).toISOString();
    return `https://outlook.live.com/calendar/0/action/compose?${new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: ev.name, startdt: start, enddt: end, body: desc, location: loc }).toString()}`;
  };

  const downloadIcs = () => {
    const start = formatICSDate(ev.start_datetime, tz);
    const end = formatICSDate(ev.end_datetime, tz);
    const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SessionPass//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`DTSTART;TZID=${tz}:${start}`,`DTEND;TZID=${tz}:${end}`,`SUMMARY:${ev.name}`,`DESCRIPTION:${desc.replace(/\n/g,'\\n')}`,`LOCATION:${loc}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `${ev.name.replace(/\s+/g,'_')}.ics` }).click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const options = [
    { label: 'Google Calendar', icon: '📅', onClick: () => { window.open(googleUrl(), '_blank'); setOpen(false); } },
    { label: 'Outlook', icon: '📧', onClick: () => { window.open(outlookUrl(), '_blank'); setOpen(false); } },
    { label: 'Apple / ICS', icon: '🍎', onClick: downloadIcs },
  ];

  return (
    <div className="relative inline-block" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <CalendarPlus className="h-4 w-4 mr-1.5" />Add to Calendar
      </Button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
          {options.map(opt => (
            <button key={opt.label} onClick={opt.onClick} className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-2">
              <span>{opt.icon}</span><span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}