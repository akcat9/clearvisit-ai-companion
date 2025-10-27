import { format } from 'date-fns';

/**
 * Formats a time string (HH:mm:ss) to 12-hour format (h:mm a)
 */
export const formatTime = (timeString: string): string => {
  try {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return format(date, 'h:mm a');
  } catch (error) {
    return timeString;
  }
};

/**
 * Formats a date to readable format
 */
export const formatDate = (date: Date | string): string => {
  try {
    return format(new Date(date), 'MMM d, h:mm a');
  } catch (error) {
    return String(date);
  }
};

/**
 * Formats recording duration from seconds to mm:ss
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
