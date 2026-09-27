export interface BuildBookingIcsParams {
  bookingId: string;
  startAt: Date;
  endAt: Date;
  mentorName: string;
  mentorEmail: string;
  studentEmail: string;
  joinUrl: string;
}

function formatIcsDate(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

/** Builds a minimal RFC 5545 VEVENT — plain text, no external service needed. */
export function buildBookingIcs(params: BuildBookingIcsParams): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Courses Platform//Booking//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${params.bookingId}@courses.local`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(params.startAt)}`,
    `DTEND:${formatIcsDate(params.endAt)}`,
    `SUMMARY:${escapeIcsText(`Consultation with ${params.mentorName}`)}`,
    `DESCRIPTION:${escapeIcsText(`Join the call: ${params.joinUrl}`)}`,
    `ORGANIZER;CN=${escapeIcsText(params.mentorName)}:mailto:${params.mentorEmail}`,
    `ATTENDEE;CN=${escapeIcsText(params.mentorName)};ROLE=CHAIR:mailto:${params.mentorEmail}`,
    `ATTENDEE:mailto:${params.studentEmail}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}
