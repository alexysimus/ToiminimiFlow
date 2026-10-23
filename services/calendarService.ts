import { TaxDeadline, TaxSettings } from '../types';

/**
 * Service to generate RFC 5545 standard .ics (iCalendar) files for Finnish tax deadlines.
 * Works seamlessly across Google Calendar, Apple Calendar, Outlook, and mobile calendars.
 */
export const calendarService = {
  /**
   * Generates and triggers download of an .ics file containing sole trader tax deadlines.
   */
  exportTaxCalendar: (deadlines: TaxDeadline[], financialYear: number = 2026): void => {
    const eventsIcs = deadlines.map(dl => {
      // Due dates are in YYYY-MM-DD format
      const [year, month, day] = dl.dueDate.split('-');
      const dateStr = `${year}${month}${day}`;
      
      // End date in iCal for an all-day event is non-inclusive (next day)
      const nextDay = new Date(parseInt(year), parseInt(month) - 1, parseInt(day) + 1);
      const endYear = nextDay.getFullYear();
      const endMonth = String(nextDay.getMonth() + 1).padStart(2, '0');
      const endDay = String(nextDay.getDate()).padStart(2, '0');
      const endDateStr = `${endYear}${endMonth}${endDay}`;

      const summary = `Tax Deadline: ${dl.title}`;
      const description = `${dl.description}\\n\\nEstimated tax: ${dl.estimatedAmount ? dl.estimatedAmount.toFixed(2) + ' EUR' : 'Check in MyTax'}\\nOfficial guide: ${dl.veroUrl}\\nMyTax (OmaVero): https://www.vero.fi/omavero/`;

      return [
        'BEGIN:VEVENT',
        `UID:flow-tax-${dl.id}-${financialYear}@toiminimi.fi`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `DTEND;VALUE=DATE:${endDateStr}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        'STATUS:CONFIRMED',
        // Reminder 7 days before
        'BEGIN:VALARM',
        'TRIGGER:-P7D',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: 7 days until tax deadline (${dl.title})`,
        'END:VALARM',
        // Reminder 2 days before
        'BEGIN:VALARM',
        'TRIGGER:-P2D',
        'ACTION:DISPLAY',
        `DESCRIPTION:Urgent: 2 days until tax deadline (${dl.title})`,
        'END:VALARM',
        'END:VEVENT'
      ].join('\r\n');
    }).join('\r\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Flow Toiminimi//Finnish Tax Calendar 2026//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Sole Trader Tax Calendar ' + financialYear,
      'X-WR-TIMEZONE:Europe/Helsinki',
      eventsIcs,
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Tax_Calendar_${financialYear}_Flow_Toiminimi.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
