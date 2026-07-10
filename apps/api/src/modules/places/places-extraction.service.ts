import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PlaceEntry, PLACE_DICTIONARY } from './place-dictionary';
import { DreamPlaceType } from './entities/dream-place.entity';

interface CompiledEntry {
  entry: PlaceEntry;
  patterns: RegExp[];
}

interface ExtractedPlace {
  name: string;
  type: DreamPlaceType;
  confidence: number;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
}

const BOUNDARY = `[\\s,;.!?()\\[\\]{}"'‘’“”«»\\-]`;

function buildPattern(normName: string): RegExp {
  const escaped = normName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?:^|${BOUNDARY})${escaped}(?:'[a-z]+)?(?=${BOUNDARY}|$)`,
    'i',
  );
}

// Pre-compile all patterns once at module load
const COMPILED: CompiledEntry[] = PLACE_DICTIONARY.map((entry) => ({
  entry,
  patterns: [entry.name, ...entry.aliases].map((name) =>
    buildPattern(normalize(name)),
  ),
}));

@Injectable()
export class PlacesExtractionService {
  private readonly logger = new Logger(PlacesExtractionService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  // ─── Public entry point ─────────────────────────────────────────────────────

  async extractAndSave(
    dreamId: string,
    userId: string,
    title: string | null,
    content: string,
    isUpdate = false,
  ): Promise<void> {
    try {
      const text = `${title ?? ''} ${content}`;
      const places = this.extract(text);

      if (isUpdate) {
        await this.ds.query(`DELETE FROM dream_places WHERE dream_id = $1`, [dreamId]);
      }

      if (places.length === 0) return;

      for (const p of places) {
        await this.ds.query(
          `
          INSERT INTO dream_places
            (dream_id, user_id, name, type, confidence, country, city, latitude, longitude)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (dream_id, name) DO UPDATE SET
            type       = EXCLUDED.type,
            confidence = EXCLUDED.confidence,
            country    = EXCLUDED.country,
            city       = EXCLUDED.city,
            latitude   = EXCLUDED.latitude,
            longitude  = EXCLUDED.longitude
          `,
          [
            dreamId,
            userId,
            p.name,
            p.type,
            p.confidence,
            p.country,
            p.city,
            p.latitude,
            p.longitude,
          ],
        );
      }

      this.logger.debug(`Extracted ${places.length} place(s) from dream ${dreamId}: ${places.map((p) => p.name).join(', ')}`);
    } catch (err) {
      this.logger.error(`Place extraction failed for dream ${dreamId}: ${String(err)}`);
    }
  }

  // ─── Extraction core ─────────────────────────────────────────────────────────

  extract(text: string): ExtractedPlace[] {
    const normalizedText = normalize(text);
    const found = new Map<string, ExtractedPlace>();

    for (const { entry, patterns } of COMPILED) {
      // Skip if already found (canonical name already matched)
      if (found.has(entry.name)) continue;

      for (const pattern of patterns) {
        if (pattern.test(normalizedText)) {
          found.set(entry.name, {
            name:       entry.name,
            type:       entry.type,
            confidence: entry.confidence,
            country:    entry.country ?? null,
            city:       entry.city ?? null,
            latitude:   entry.latitude ?? null,
            longitude:  entry.longitude ?? null,
          });
          break;
        }
      }
    }

    return Array.from(found.values());
  }

  // ─── Backfill: rerun extraction on all published dreams ──────────────────────

  async reextractAll(): Promise<{ dreamsProcessed: number; placesFound: number }> {
    const dreams: { id: string; user_id: string; title: string | null; content: string }[] =
      await this.ds.query(
        `SELECT id, user_id, title, content FROM dreams
         WHERE is_draft = FALSE AND deleted_at IS NULL
         ORDER BY created_at`,
      );

    let placesFound = 0;

    for (const dream of dreams) {
      const places = this.extract(`${dream.title ?? ''} ${dream.content}`);

      for (const p of places) {
        await this.ds.query(
          `
          INSERT INTO dream_places
            (dream_id, user_id, name, type, confidence, country, city, latitude, longitude)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (dream_id, name) DO NOTHING
          `,
          [dream.id, dream.user_id, p.name, p.type, p.confidence, p.country, p.city, p.latitude, p.longitude],
        );
        placesFound++;
      }
    }

    return { dreamsProcessed: dreams.length, placesFound };
  }
}
