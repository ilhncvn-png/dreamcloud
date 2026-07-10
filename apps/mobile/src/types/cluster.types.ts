export interface DreamCluster {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primaryTheme: string | null;
  primarySymbol: string | null;
  primaryEmotion: string | null;
  primaryArchetype: string | null;
  memberCount: number;
  dreamCount: number;
  strengthScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClusterMembership {
  cluster: DreamCluster;
  membershipScore: number;
  matchedThemes: string[];
  matchedSymbols: string[];
  matchedEmotions: string[];
  matchedLocations: string[];
  matchedArchetypes: string[];
}

export interface ClusterTopMember {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  membershipScore: number;
}

export interface ClusterDetail {
  cluster: DreamCluster;
  topMembers: ClusterTopMember[];
  myMembership?: {
    membershipScore: number;
    matchedThemes: string[];
    matchedSymbols: string[];
  };
}

export interface SharedCluster {
  cluster: DreamCluster;
  scoreA: number;
  scoreB: number;
}
