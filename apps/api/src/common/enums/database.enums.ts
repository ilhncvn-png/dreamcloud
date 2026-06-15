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
  DREAM_MATCH = 'dream_match',
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  INTERPRETATION = 'interpretation',
  SYSTEM = 'system',
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
