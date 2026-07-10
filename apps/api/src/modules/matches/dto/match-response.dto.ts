import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DreamMatch } from '../entities/dream-match.entity';
import type { ConnectionSummary } from '../matching.service';

// ── Shared ────────────────────────────────────────────────────────────────────

export class DreamMatchDto {
  @ApiProperty() id: string;
  @ApiProperty() myDreamId: string;
  @ApiPropertyOptional() myDreamTitle: string | null;
  @ApiProperty() matchingDreamId: string;
  @ApiPropertyOptional() matchingDreamTitle: string | null;
  @ApiProperty() matchingDreamContent: string;
  @ApiProperty() matchingUserId: string;
  @ApiProperty() matchingUserUsername: string;
  @ApiPropertyOptional() matchingUserDisplayName: string | null;
  @ApiPropertyOptional() matchingUserAvatarUrl: string | null;
  @ApiProperty() matchScore: number;
  @ApiProperty() resonanceLevel: string;
  @ApiProperty() themeScore: number;
  @ApiProperty() emotionScore: number;
  @ApiProperty() symbolScore: number;
  @ApiProperty() locationScore: number;
  @ApiProperty() archetypeScore: number;
  @ApiProperty({ type: [String] }) sharedThemes: string[];
  @ApiProperty({ type: [String] }) sharedEmotions: string[];
  @ApiProperty({ type: [String] }) sharedSymbols: string[];
  @ApiProperty({ type: [String] }) sharedLocations: string[];
  @ApiProperty({ type: [String] }) sharedArchetypes: string[];
  @ApiProperty() calculatedAt: string;

  static from(match: DreamMatch, viewingUserId: string): DreamMatchDto {
    const dto     = new DreamMatchDto();
    const isA     = match.userIdA === viewingUserId;
    const myDream = isA ? match.dreamA : match.dreamB;
    const other   = isA ? match.dreamB : match.dreamA;
    const otherUser: any = isA ? match.dreamB?.user : match.dreamA?.user;

    dto.id                      = match.id;
    dto.myDreamId               = isA ? match.dreamIdA : match.dreamIdB;
    dto.myDreamTitle            = myDream?.title ?? null;
    dto.matchingDreamId         = isA ? match.dreamIdB : match.dreamIdA;
    dto.matchingDreamTitle      = other?.title ?? null;
    dto.matchingDreamContent    = other?.content ?? '';
    dto.matchingUserId          = isA ? match.userIdB : match.userIdA;
    dto.matchingUserUsername    = otherUser?.username ?? '';
    dto.matchingUserDisplayName = otherUser?.profile?.displayName ?? null;
    dto.matchingUserAvatarUrl   = otherUser?.profile?.avatarUrl ?? null;
    dto.matchScore              = match.matchScore;
    dto.resonanceLevel          = match.resonanceLevel;
    dto.themeScore              = match.themeScore;
    dto.emotionScore            = match.emotionScore;
    dto.symbolScore             = match.symbolScore;
    dto.locationScore           = match.locationScore;
    dto.archetypeScore          = match.archetypeScore ?? 0;
    dto.sharedThemes            = match.sharedThemes;
    dto.sharedEmotions          = match.sharedEmotions;
    dto.sharedSymbols           = match.sharedSymbols;
    dto.sharedLocations         = match.sharedLocations;
    dto.sharedArchetypes        = match.sharedArchetypes ?? [];
    dto.calculatedAt            = match.calculatedAt?.toISOString() ?? new Date().toISOString();
    return dto;
  }
}

export class PaginatedMatchesDto {
  @ApiProperty({ type: [DreamMatchDto] }) items: DreamMatchDto[];
  @ApiProperty() meta: { total: number; limit: number; offset: number };
}

export class ConnectionSummaryDto {
  @ApiProperty() userId: string;
  @ApiProperty() username: string;
  @ApiPropertyOptional() displayName: string | null;
  @ApiPropertyOptional() avatarUrl: string | null;
  @ApiProperty() topMatchScore: number;
  @ApiProperty() topResonanceLevel: string;
  @ApiProperty({ type: [String] }) sharedThemes: string[];
  @ApiProperty({ type: [String] }) sharedEmotions: string[];
  @ApiProperty() matchCount: number;

  static from(c: ConnectionSummary): ConnectionSummaryDto {
    const dto              = new ConnectionSummaryDto();
    dto.userId             = c.userId;
    dto.username           = c.username;
    dto.displayName        = c.displayName;
    dto.avatarUrl          = c.avatarUrl;
    dto.topMatchScore      = c.topMatchScore;
    dto.topResonanceLevel  = c.topResonanceLevel;
    dto.sharedThemes       = c.sharedThemes;
    dto.sharedEmotions     = c.sharedEmotions;
    dto.matchCount         = c.matchCount;
    return dto;
  }
}

// ── Detail ────────────────────────────────────────────────────────────────────

export class MatchDreamSnippetDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() title: string | null;
  @ApiProperty() content: string;
  @ApiProperty() userId: string;
  @ApiProperty() username: string;
  @ApiPropertyOptional() displayName: string | null;
  @ApiPropertyOptional() avatarUrl: string | null;
  @ApiProperty() isYou: boolean;
}

export class MatchDetailDto {
  @ApiProperty() id: string;
  @ApiProperty() matchScore: number;
  @ApiProperty() resonanceLevel: string;
  @ApiProperty() themeScore: number;
  @ApiProperty() emotionScore: number;
  @ApiProperty() symbolScore: number;
  @ApiProperty() locationScore: number;
  @ApiProperty({ type: MatchDreamSnippetDto }) myDream: MatchDreamSnippetDto;
  @ApiProperty({ type: MatchDreamSnippetDto }) matchingDream: MatchDreamSnippetDto;
  @ApiProperty({ type: [String] }) sharedThemes: string[];
  @ApiProperty({ type: [String] }) sharedEmotions: string[];
  @ApiProperty({ type: [String] }) sharedSymbols: string[];
  @ApiProperty({ type: [String] }) sharedLocations: string[];
  @ApiProperty({ type: [String] }) sharedArchetypes: string[];
  @ApiProperty() calculatedAt: string;

  static from(
    match: DreamMatch,
    viewingUserId: string,
    sharedArchetypes: string[],
  ): MatchDetailDto {
    const dto   = new MatchDetailDto();
    const isA   = match.userIdA === viewingUserId;
    const myDr  = isA ? match.dreamA : match.dreamB;
    const othDr = isA ? match.dreamB : match.dreamA;

    const myUser:  any = myDr?.user;
    const othUser: any = othDr?.user;

    dto.id             = match.id;
    dto.matchScore     = match.matchScore;
    dto.resonanceLevel = match.resonanceLevel;
    dto.themeScore     = match.themeScore;
    dto.emotionScore   = match.emotionScore;
    dto.symbolScore    = match.symbolScore;
    dto.locationScore  = match.locationScore;

    dto.myDream = {
      id:          isA ? match.dreamIdA : match.dreamIdB,
      title:       myDr?.title ?? null,
      content:     myDr?.content ?? '',
      userId:      isA ? match.userIdA : match.userIdB,
      username:    myUser?.username ?? '',
      displayName: myUser?.profile?.displayName ?? null,
      avatarUrl:   myUser?.profile?.avatarUrl ?? null,
      isYou:       true,
    };

    dto.matchingDream = {
      id:          isA ? match.dreamIdB : match.dreamIdA,
      title:       othDr?.title ?? null,
      content:     othDr?.content ?? '',
      userId:      isA ? match.userIdB : match.userIdA,
      username:    othUser?.username ?? '',
      displayName: othUser?.profile?.displayName ?? null,
      avatarUrl:   othUser?.profile?.avatarUrl ?? null,
      isYou:       false,
    };

    dto.sharedThemes    = match.sharedThemes;
    dto.sharedEmotions  = match.sharedEmotions;
    dto.sharedSymbols   = match.sharedSymbols;
    dto.sharedLocations = match.sharedLocations;
    dto.sharedArchetypes = sharedArchetypes;
    dto.calculatedAt    = match.calculatedAt?.toISOString() ?? new Date().toISOString();
    return dto;
  }
}
