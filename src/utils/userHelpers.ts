/**
 * Gets display name from user profile
 */
export const getUserName = (profile: any): string => {
  if (!profile) return 'Unknown';
  
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }
  
  return profile.email || 'Unknown';
};

/**
 * Gets initials from user profile
 */
export const getUserInitials = (profile: any): string => {
  if (!profile) return 'U';
  
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
  }
  
  return profile.email?.[0]?.toUpperCase() || 'U';
};
