export enum DreamVisibility {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE = 'private',
}

export enum DreamCategory {
  ADVENTURE = 'adventure',
  NIGHTMARE = 'nightmare',
  LUCID = 'lucid',
  RECURRING = 'recurring',
  PROPHETIC = 'prophetic',
  FANTASY = 'fantasy',
  MUNDANE = 'mundane',
  SURREAL = 'surreal',
}

export enum DreamMood {
  JOYFUL = 'joyful',
  FEARFUL = 'fearful',
  CONFUSED = 'confused',
  PEACEFUL = 'peaceful',
  ANXIOUS = 'anxious',
  MELANCHOLIC = 'melancholic',
  EXCITED = 'excited',
  NEUTRAL = 'neutral',
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

export enum NotificationType {
  DREAM_MATCH = 'dream_match',
  NEW_FOLLOWER = 'new_follower',
  DREAM_LIKE = 'dream_like',
  DREAM_COMMENT = 'dream_comment',
  MENTION = 'mention',
  SYSTEM = 'system',
}

export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  HARASSMENT = 'harassment',
  MISINFORMATION = 'misinformation',
  OTHER = 'other',
}
