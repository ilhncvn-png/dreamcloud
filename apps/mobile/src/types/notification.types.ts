export type NotificationType =
  | 'like'
  | 'save'
  | 'comment'
  | 'follow'
  | 'dream_mention'
  | 'dream_match'
  | 'dream_connection'
  | 'shared_symbol'
  | 'shared_location'
  | 'high_resonance'
  | 'signal_trending'
  | 'dream_milestone'
  | 'interpretation'
  | 'system';

export interface NotificationActor {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  dreamId: string | null;
  commentId: string | null;
  matchId: string | null;
  actor: NotificationActor | null;
  createdAt: string;
}

export interface NotificationsPage {
  items: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface NotificationPreferences {
  dreamMatch: boolean;
  dreamConnection: boolean;
  sharedSymbol: boolean;
  highResonance: boolean;
  signalTrending: boolean;
  dreamMilestone: boolean;
  dreamMention: boolean;
  social: boolean;
}
