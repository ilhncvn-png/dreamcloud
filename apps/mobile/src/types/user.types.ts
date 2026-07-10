// ── Dream identity & preferences stored in the user_profiles.preferences JSONB ──

export interface DreamPreferences {
  // Dream Identity
  dreamArchetype?: string;
  dreamMood?: string;
  dreamEnergy?: string;
  commonThemes?: string[];
  favoriteSymbol?: string;
  dreamFrequency?: string;
  lucidExperience?: string;

  // Privacy & Discovery
  allowDreamMatching?: boolean;
  allowDreamConnections?: boolean;
  allowSeenInDreams?: boolean;
  anonymousDiscovery?: boolean;

  // Social
  websiteUrl?: string;
  interests?: string[];
  dreamTags?: string[];
  personalStatement?: string;

  // Locale
  language?: string;
  timezone?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  createdAt: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  totalDreams: number;
}

export interface MyProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  isPublic: boolean;
  preferences: DreamPreferences;
  followerCount: number;
  followingCount: number;
}

export interface UpdateProfileDto {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  locationCity?: string;
  locationCountry?: string;
  isPublic?: boolean;
  preferences?: DreamPreferences;
}

export interface ToggleFollowResult {
  isFollowing: boolean;
  followerCount: number;
}
