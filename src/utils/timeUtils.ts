import { format } from 'date-fns';

export const formatTime = (timeString: string): string => {
  try {
    // Parse the time string (e.g., "22:35:00" or "14:30:00")
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // Format to 12-hour format
    return format(date, 'h:mm a');
  } catch (error) {
    return timeString; // Return original if parsing fails
  }
};