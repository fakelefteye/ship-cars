// Génération de contenu iCal (RFC 5545)

/** Formate une Date UTC en YYYYMMDDTHHMMSSZ */
export function fmtIcalUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Formate un timestamp ISO stocké en BDD en YYYYMMDDTHHMMSS heure de Paris */
export function fmtIcalLocal(s: string): string {
  const d = new Date(s);
  const local = d.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }); // 'YYYY-MM-DD HH:MM:SS'
  const [date, time] = local.split(' ');
  return date.replace(/-/g, '') + 'T' + time.replace(/:/g, '');
}

/** Échappe les caractères spéciaux iCal dans un texte */
export function escapeIcal(s: string): string {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Découpe une ligne iCal à 75 caractères (RFC 5545 §3.1) */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let out = '';
  while (line.length > 75) {
    out += line.slice(0, 75) + '\r\n ';
    line = line.slice(75);
  }
  return out + line;
}

export interface VEventParams {
  uid: string;
  dtstart: string; // ISO timestamp stocké en BDD
  dtend: string;
  summary: string;
  description?: string;
  now?: Date;
}

export function buildVEvent(p: VEventParams): string {
  const now = p.now ?? new Date();
  const lines = [
    'BEGIN:VEVENT',
    `UID:${p.uid}`,
    `DTSTAMP:${fmtIcalUtc(now)}`,
    `DTSTART;TZID=Europe/Paris:${fmtIcalLocal(p.dtstart)}`,
    `DTEND;TZID=Europe/Paris:${fmtIcalLocal(p.dtend)}`,
    foldLine(`SUMMARY:${escapeIcal(p.summary)}`),
    'STATUS:CONFIRMED',
  ];
  if (p.description) lines.push(foldLine(`DESCRIPTION:${escapeIcal(p.description)}`));
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

const VCALENDAR_HEADER = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Ship Cars//Reservations//FR',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'X-WR-TIMEZONE:Europe/Paris',
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Paris',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
  'END:STANDARD',
  'END:VTIMEZONE',
].join('\r\n');

export function buildCalendar(events: string[], calName = 'Ship Cars'): string {
  const nameHeader = `X-WR-CALNAME:${calName}`;
  return (
    VCALENDAR_HEADER.replace(
      'BEGIN:VTIMEZONE',
      nameHeader + '\r\nBEGIN:VTIMEZONE',
    ) +
    '\r\n' +
    events.join('\r\n') +
    '\r\nEND:VCALENDAR\r\n'
  );
}
