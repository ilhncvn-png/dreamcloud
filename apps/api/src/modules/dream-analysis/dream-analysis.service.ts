import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DreamAnalysisResult {
  dreamId:          string;
  symbolCount:      number;
  emotionCount:     number;
  figureCount:      number;
  themeCount:       number;
  primaryEmotion:   string | null;
  primarySymbol:    string | null;
  primaryArchetype: string | null;
  dreamScore:       number;
  resonanceScore:   number;
  processedAt:      Date;
}

@Injectable()
export class DreamAnalysisService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // ── Analyse a single dream and upsert the result ────────────────────────

  async analyzeDream(dreamId: string): Promise<DreamAnalysisResult> {
    // Ensure dream exists
    const dreamRows = await this.db.query<Array<{ id: string }>>(
      `SELECT id FROM dreams WHERE id = $1 AND deleted_at IS NULL`, [dreamId],
    );
    if (!dreamRows.length) throw new NotFoundException(`Dream ${dreamId} not found`);

    // Fetch existing analysis data from related tables
    const [symbolRows, emotionRows, figureRows, themeRows] = await Promise.all([
      this.db.query<Array<{ manifestation: string; symbol_category: string }>>(
        `SELECT manifestation, symbol_category FROM dream_symbols WHERE dream_id = $1`, [dreamId],
      ),
      this.db.query<Array<{ emotion: string; is_primary: boolean }>>(
        `SELECT emotion, is_primary FROM dream_emotions WHERE dream_id = $1`, [dreamId],
      ),
      this.db.query<Array<{ archetype_candidate: string | null }>>(
        `SELECT archetype_candidate FROM dream_figures WHERE dream_id = $1`, [dreamId],
      ),
      this.db.query<Array<{ theme: string; is_primary: boolean }>>(
        `SELECT theme, is_primary FROM dream_themes WHERE dream_id = $1`, [dreamId],
      ),
    ]);

    // Derive primary values
    const primaryEmotionRow = emotionRows.find(e => e.is_primary) ?? emotionRows[0] ?? null;
    const primarySymbol     = symbolRows[0]?.manifestation ?? null;
    const primaryArchetype  = figureRows.find(f => f.archetype_candidate)?.archetype_candidate ?? null;

    const symbolCount  = symbolRows.length;
    const emotionCount = emotionRows.length;
    const figureCount  = figureRows.length;
    const themeCount   = themeRows.length;

    // Dream score — richness-based
    const dreamScore = Math.min(100, Math.max(10,
      20 +
      (symbolCount  * 8) +
      (emotionCount * 6) +
      (themeCount   * 5) +
      (figureCount  * 4),
    ));

    // Resonance score — compare symbols against platform top-25
    let resonanceScore = 50;
    if (symbolCount > 0) {
      const topSymbolRows = await this.db.query<Array<{ manifestation: string }>>(
        `SELECT manifestation FROM dream_symbols
         GROUP BY manifestation ORDER BY COUNT(*) DESC LIMIT 25`,
      );
      const topSet    = new Set(topSymbolRows.map(r => r.manifestation));
      const matching  = symbolRows.filter(s => topSet.has(s.manifestation)).length;
      resonanceScore  = Math.min(100, Math.round((matching / symbolCount) * 100));
    }

    // Upsert into dream_analysis
    const rows = await this.db.query<Array<DreamAnalysisResult>>(
      `INSERT INTO dream_analysis (
         dream_id, symbol_count, emotion_count, figure_count, theme_count,
         primary_emotion, primary_symbol, primary_archetype,
         dream_score, resonance_score, processed_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
       ON CONFLICT (dream_id) DO UPDATE SET
         symbol_count      = EXCLUDED.symbol_count,
         emotion_count     = EXCLUDED.emotion_count,
         figure_count      = EXCLUDED.figure_count,
         theme_count       = EXCLUDED.theme_count,
         primary_emotion   = EXCLUDED.primary_emotion,
         primary_symbol    = EXCLUDED.primary_symbol,
         primary_archetype = EXCLUDED.primary_archetype,
         dream_score       = EXCLUDED.dream_score,
         resonance_score   = EXCLUDED.resonance_score,
         processed_at      = NOW()
       RETURNING *`,
      [
        dreamId, symbolCount, emotionCount, figureCount, themeCount,
        primaryEmotionRow?.emotion ?? null, primarySymbol, primaryArchetype,
        dreamScore, resonanceScore,
      ],
    );

    const row = rows[0] as unknown as Record<string, unknown>;
    return this.mapRow(row);
  }

  // ── Bulk analyse unprocessed dreams (up to batchSize) ───────────────────

  async bulkAnalyzeUnprocessed(batchSize = 100): Promise<number> {
    const dreamIds = await this.db.query<Array<{ id: string }>>(
      `SELECT d.id FROM dreams d
       LEFT JOIN dream_analysis da ON da.dream_id = d.id
       WHERE d.deleted_at IS NULL AND d.is_draft = FALSE AND da.dream_id IS NULL
       ORDER BY d.created_at DESC
       LIMIT $1`,
      [batchSize],
    );

    let processed = 0;
    for (const { id } of dreamIds) {
      try {
        await this.analyzeDream(id);
        processed++;
      } catch {
        // Skip dreams with missing related data
      }
    }
    return processed;
  }

  // ── Retrieve stored analysis ─────────────────────────────────────────────

  async getDreamAnalysis(dreamId: string): Promise<DreamAnalysisResult | null> {
    const rows = await this.db.query<Array<Record<string, unknown>>>(
      `SELECT * FROM dream_analysis WHERE dream_id = $1`, [dreamId],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  // ── Platform-wide stats from dream_analysis ──────────────────────────────

  async getPlatformAnalysisStats(): Promise<{
    totalAnalyzed:       number;
    avgDreamScore:       number;
    avgResonanceScore:   number;
    topPrimaryEmotions:  Array<{ emotion: string; count: number }>;
    topPrimarySymbols:   Array<{ symbol: string; count: number }>;
    topArchetypes:       Array<{ archetype: string; count: number }>;
  }> {
    const [stats, emotions, symbols, archetypes] = await Promise.all([
      this.db.query<Array<{ total: string; avg_dream: string; avg_resonance: string }>>(
        `SELECT COUNT(*) AS total,
                ROUND(AVG(dream_score), 1) AS avg_dream,
                ROUND(AVG(resonance_score), 1) AS avg_resonance
         FROM dream_analysis`,
      ),
      this.db.query<Array<{ primary_emotion: string; count: string }>>(
        `SELECT primary_emotion, COUNT(*) AS count
         FROM dream_analysis WHERE primary_emotion IS NOT NULL
         GROUP BY primary_emotion ORDER BY count DESC LIMIT 8`,
      ),
      this.db.query<Array<{ primary_symbol: string; count: string }>>(
        `SELECT primary_symbol, COUNT(*) AS count
         FROM dream_analysis WHERE primary_symbol IS NOT NULL
         GROUP BY primary_symbol ORDER BY count DESC LIMIT 8`,
      ),
      this.db.query<Array<{ primary_archetype: string; count: string }>>(
        `SELECT primary_archetype, COUNT(*) AS count
         FROM dream_analysis WHERE primary_archetype IS NOT NULL
         GROUP BY primary_archetype ORDER BY count DESC LIMIT 8`,
      ),
    ]);

    const s = stats[0] as Record<string, unknown>;
    return {
      totalAnalyzed:      parseInt(String(s?.['total'] ?? '0')),
      avgDreamScore:      parseFloat(String(s?.['avg_dream'] ?? '0')),
      avgResonanceScore:  parseFloat(String(s?.['avg_resonance'] ?? '0')),
      topPrimaryEmotions: emotions.map(r => ({ emotion: r.primary_emotion, count: parseInt(r.count) })),
      topPrimarySymbols:  symbols.map(r => ({ symbol: r.primary_symbol, count: parseInt(r.count) })),
      topArchetypes:      archetypes.map(r => ({ archetype: r.primary_archetype, count: parseInt(r.count) })),
    };
  }

  private mapRow(row: Record<string, unknown>): DreamAnalysisResult {
    return {
      dreamId:          String(row['dream_id']),
      symbolCount:      Number(row['symbol_count']),
      emotionCount:     Number(row['emotion_count']),
      figureCount:      Number(row['figure_count']),
      themeCount:       Number(row['theme_count']),
      primaryEmotion:   row['primary_emotion'] as string | null,
      primarySymbol:    row['primary_symbol']  as string | null,
      primaryArchetype: row['primary_archetype'] as string | null,
      dreamScore:       Number(row['dream_score']),
      resonanceScore:   Number(row['resonance_score']),
      processedAt:      new Date(String(row['processed_at'])),
    };
  }
}
