export type DreamConnectionLevel = 'signal' | 'resonance' | 'strong' | 'deep' | 'mirror';

export interface DreamConnection {
  id: string;
  otherUserId: string;
  otherUsername: string;
  otherDisplayName: string | null;
  otherAvatarUrl: string | null;
  connectionScore: number;
  mutualDreams: number;
  level: DreamConnectionLevel;
  firstSeenAt: string;
  lastSeenAt: string;
  iDreamedAboutThem: number;
  theyDreamedAboutMe: number;
}

export interface ConnectionTimeline {
  mentionId: string;
  dreamId: string;
  dreamTitle: string | null;
  dreamerUserId: string;
  dreamerUsername: string;
  matchedName: string;
  confidenceScore: number;
  createdAt: string;
}

export interface DreamConnectionDetail extends DreamConnection {
  timeline: ConnectionTimeline[];
}

export interface DreamConnectionsResult {
  items: DreamConnection[];
  total: number;
}
