/**
 * TypeScript mirrors of the PostgreSQL enum types defined in the initial migration.
 * Values must match the database exactly — do not rename without a migration.
 */

export enum DreamCategory {
  LUCID = 'lucid',
  BEAUTIFUL = 'beautiful',
  NIGHTMARE = 'nightmare',
  NORMAL = 'normal',
}

export enum DreamVisibility {
  PRIVATE = 'private',
  FOLLOWERS = 'followers',
  PUBLIC = 'public',
}

export enum NotificationType {
  DREAM_MATCH      = 'dream_match',
  DREAM_CONNECTION = 'dream_connection',
  SHARED_SYMBOL    = 'shared_symbol',
  SHARED_LOCATION  = 'shared_location',
  HIGH_RESONANCE   = 'high_resonance',
  SIGNAL_TRENDING  = 'signal_trending',
  DREAM_MILESTONE  = 'dream_milestone',
  DREAM_MENTION    = 'dream_mention',
  LIKE             = 'like',
  SAVE             = 'save',
  COMMENT          = 'comment',
  FOLLOW           = 'follow',
  INTERPRETATION   = 'interpretation',
  SYSTEM           = 'system',
}

export enum ReportReason {
  INAPPROPRIATE = 'inappropriate',
  HATE_SPEECH = 'hate_speech',
  FAKE_CONTENT = 'fake_content',
  SPAM = 'spam',
  OTHER = 'other',
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
}

export enum OAuthProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

export enum TagType {
  PLACE = 'place',
  PERSON = 'person',
  OBJECT = 'object',
  EMOTION = 'emotion',
  BRAND = 'brand',
  OTHER = 'other',
}

export enum AnalysisStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}
