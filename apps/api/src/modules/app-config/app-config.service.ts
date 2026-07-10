import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppConfigService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async getPublicConfig(): Promise<Record<string, unknown>> {
    const [configs, flags] = await Promise.all([
      this.db.query<Array<{ key: string; value: unknown }>>(
        `SELECT key, value FROM app_config ORDER BY key`,
      ),
      this.db.query<Array<{ key: string; enabled: boolean; rollout_percentage: number; target_audience: string }>>(
        `SELECT key, enabled, rollout_percentage, target_audience FROM feature_flags ORDER BY key`,
      ),
    ]);

    const cfg: Record<string, unknown> = {};
    for (const row of configs) cfg[row.key] = row.value;

    const featureFlags: Record<string, unknown> = {};
    for (const f of flags) {
      featureFlags[f.key] = {
        enabled:           f.enabled,
        rolloutPercentage: f.rollout_percentage,
        targetAudience:    f.target_audience,
      };
    }

    return {
      maintenanceMode:          cfg['maintenance_mode']            ?? false,
      registrationOpen:         cfg['registration_open']           ?? true,
      dreamPostingEnabled:      cfg['dream_posting_enabled']       ?? true,
      commentsEnabled:          cfg['comments_enabled']            ?? true,
      likesSavesEnabled:        cfg['likes_saves_enabled']         ?? true,
      dreamMatchingEnabled:     cfg['dream_matching_enabled']      ?? true,
      dreamConnectionsEnabled:  cfg['dream_connections_enabled']   ?? true,
      seenInDreamsEnabled:      cfg['seen_in_dreams_enabled']      ?? true,
      aiAnalysisEnabled:        cfg['ai_analysis_enabled']         ?? true,
      publicFeedEnabled:        cfg['public_feed_enabled']         ?? true,
      emergencyReadOnly:        cfg['emergency_read_only']         ?? false,
      featureFlags,
      minAppVersion:            '1.0.0',
      fetchedAt:                new Date().toISOString(),
    };
  }
}
