export interface DreamMention {
  id: string;
  dreamId: string;
  dreamerUserId: string;
  dreamerUsername: string;
  dreamerDisplayName: string | null;
  dreamerAvatarUrl: string | null;
  dreamTitle: string | null;
  matchedName: string;
  confidenceScore: number;
  createdAt: string;
}

export interface MentionsPage {
  items: DreamMention[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface TopDreamer {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  count: number;
}

export interface MentionStats {
  totalMentions: number;
  uniqueDreamers: number;
  topDreamers: TopDreamer[];
}
