import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalysisStatus } from '../../../common/enums/database.enums';
import type { DreamAnalysis } from '../entities/dream-analysis.entity';

export class AnalysisSummaryDto {
  @ApiProperty({ enum: AnalysisStatus }) status: AnalysisStatus;
  @ApiPropertyOptional() primaryTheme: string | null;
  @ApiPropertyOptional() primaryEmotion: string | null;
  @ApiPropertyOptional() emotionalIntensity: string | null;
}

export class ThemeDto {
  @ApiProperty() theme: string;
  @ApiPropertyOptional() themeFamily: string | null;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() confidence: number;
}

export class EmotionDto {
  @ApiProperty() emotion: string;
  @ApiProperty() intensity: string;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() isResidual: boolean;
  @ApiPropertyOptional() arcPosition: string | null;
}

export class FigureDto {
  @ApiProperty() figureType: string;
  @ApiProperty() isKnown: boolean;
  @ApiPropertyOptional() relationshipType: string | null;
  @ApiPropertyOptional() archetypeCandidate: string | null;
  @ApiPropertyOptional() archetypeConfidence: number | null;
  @ApiProperty({ type: [String] }) qualityDescriptors: string[];
  @ApiPropertyOptional() narrativeRole: string | null;
}

export class LocationDto {
  @ApiProperty() locationTier: number;
  @ApiPropertyOptional() name: string | null;
  @ApiPropertyOptional() locationType: string | null;
  @ApiPropertyOptional() archetypeType: string | null;
  @ApiPropertyOptional() emotionalTone: string | null;
  @ApiProperty() isDistorted: boolean;
  @ApiPropertyOptional() geographicHint: string | null;
}

export class SymbolDto {
  @ApiProperty() symbolCategory: string;
  @ApiPropertyOptional() manifestation: string | null;
  @ApiPropertyOptional() emotionalContext: string | null;
  @ApiPropertyOptional() narrativeFunction: string | null;
  @ApiProperty() isUniversal: boolean;
  @ApiProperty() confidence: number;
}

export class ObjectDto {
  @ApiPropertyOptional() objectName: string | null;
  @ApiPropertyOptional() objectType: string | null;
  @ApiPropertyOptional() symbolicCategory: string | null;
  @ApiPropertyOptional() narrativeFunction: string | null;
  @ApiPropertyOptional() emotionalContext: string | null;
  @ApiProperty() isImpossible: boolean;
}

export class DreamAnalysisResponseDto {
  @ApiProperty() dreamId: string;
  @ApiProperty({ enum: AnalysisStatus }) status: AnalysisStatus;
  @ApiPropertyOptional() modelVersion: string | null;
  @ApiPropertyOptional() analyzedAt: Date | null;
  @ApiPropertyOptional() primaryTheme: string | null;
  @ApiPropertyOptional() primaryEmotion: string | null;
  @ApiPropertyOptional() emotionalIntensity: string | null;
  @ApiPropertyOptional() emotionalArc: { from: string; to: string } | null;
  @ApiPropertyOptional() residualEmotion: string | null;
  @ApiProperty({ type: [ThemeDto] }) themes: ThemeDto[];
  @ApiProperty({ type: [EmotionDto] }) emotions: EmotionDto[];
  @ApiProperty({ type: [FigureDto] }) figures: FigureDto[];
  @ApiProperty({ type: [LocationDto] }) locations: LocationDto[];
  @ApiProperty({ type: [SymbolDto] }) symbols: SymbolDto[];
  @ApiProperty({ type: [ObjectDto] }) objects: ObjectDto[];

  static from(a: DreamAnalysis): DreamAnalysisResponseDto {
    const dto = new DreamAnalysisResponseDto();
    dto.dreamId           = a.dreamId;
    dto.status            = a.status;
    dto.modelVersion      = a.modelVersion;
    dto.analyzedAt        = a.analyzedAt;
    dto.primaryTheme      = a.primaryTheme;
    dto.primaryEmotion    = a.primaryEmotion;
    dto.emotionalIntensity = a.emotionalIntensity;
    dto.emotionalArc      = a.emotionalArc;
    dto.residualEmotion   = a.residualEmotion;
    dto.themes     = (a.themes    ?? []).map((t) => ({ theme: t.theme, themeFamily: t.themeFamily, isPrimary: t.isPrimary, confidence: t.confidence }));
    dto.emotions   = (a.emotions  ?? []).map((e) => ({ emotion: e.emotion, intensity: e.intensity, isPrimary: e.isPrimary, isResidual: e.isResidual, arcPosition: e.arcPosition }));
    dto.figures    = (a.figures   ?? []).map((f) => ({ figureType: f.figureType, isKnown: f.isKnown, relationshipType: f.relationshipType, archetypeCandidate: f.archetypeCandidate, archetypeConfidence: f.archetypeConfidence, qualityDescriptors: f.qualityDescriptors, narrativeRole: f.narrativeRole }));
    dto.locations  = (a.locations ?? []).map((l) => ({ locationTier: l.locationTier, name: l.name, locationType: l.locationType, archetypeType: l.archetypeType, emotionalTone: l.emotionalTone, isDistorted: l.isDistorted, geographicHint: l.geographicHint }));
    dto.symbols    = (a.symbols   ?? []).map((s) => ({ symbolCategory: s.symbolCategory, manifestation: s.manifestation, emotionalContext: s.emotionalContext, narrativeFunction: s.narrativeFunction, isUniversal: s.isUniversal, confidence: s.confidence }));
    dto.objects    = (a.objects   ?? []).map((o) => ({ objectName: o.objectName, objectType: o.objectType, symbolicCategory: o.symbolicCategory, narrativeFunction: o.narrativeFunction, emotionalContext: o.emotionalContext, isImpossible: o.isImpossible }));
    return dto;
  }
}
