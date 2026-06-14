export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  dreamCount: number;
  createdAt: string;
}

export interface UserProfile extends User {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isBlocked: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
