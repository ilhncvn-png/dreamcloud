import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Admin – Waitlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/waitlist')
export class WaitlistAdminController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Paginated early-access waitlist' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getWaitlist(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<Record<string, unknown>> {
    const p = page ? parseInt(page) : 1;
    const l = limit ? parseInt(limit) : 50;
    const offset = (p - 1) * l;
    const where = search ? `WHERE email ILIKE '%' || $3 || '%'` : '';
    const params: unknown[] = [l, offset];
    if (search) params.push(search);

    interface Row {
      id: string;
      email: string;
      is_contacted: boolean;
      contacted_at: string | null;
      notes: string | null;
      created_at: string;
    }
    interface CountRow {
      count: string;
    }

    const [rows, countRes] = await Promise.all([
      this.db.query<Row[]>(
        `SELECT id, email, is_contacted, contacted_at, notes, created_at
         FROM waitlist_entries ${where}
         ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        params,
      ),
      this.db.query<CountRow[]>(
        `SELECT COUNT(*) AS count FROM waitlist_entries ${where}`,
        search ? [search] : [],
      ),
    ]);

    const total = parseInt(countRes[0]?.count ?? '0');
    return {
      items: rows.map((r) => ({
        id: r.id,
        email: r.email,
        isContacted: r.is_contacted,
        contactedAt: r.contacted_at,
        notes: r.notes,
        createdAt: r.created_at,
      })),
      total,
      page: p,
      pages: Math.ceil(total / l),
    };
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv')
  @ApiOperation({ summary: 'Export waitlist as CSV' })
  async exportWaitlistCsv(@Res() res: Response): Promise<void> {
    interface Row {
      email: string;
      is_contacted: boolean;
      contacted_at: string | null;
      notes: string | null;
      created_at: string;
    }
    const rows = await this.db.query<Row[]>(
      `SELECT email, is_contacted, contacted_at, notes, created_at
       FROM waitlist_entries ORDER BY created_at DESC`,
    );
    const header = 'email,is_contacted,contacted_at,notes,created_at';
    const lines = rows.map((r) =>
      [
        r.email,
        r.is_contacted,
        r.contacted_at ?? '',
        (r.notes ?? '').replace(/,/g, ';'),
        r.created_at,
      ].join(','),
    );
    const csv = [header, ...lines].join('\n');
    res.setHeader('Content-Disposition', 'attachment; filename="waitlist.csv"');
    res.send(csv);
  }

  @Patch(':id/contacted')
  @ApiOperation({ summary: 'Mark waitlist entry as contacted / not contacted' })
  async markWaitlistContacted(
    @Param('id') id: string,
    @Body() body: { isContacted: boolean; notes?: string },
  ): Promise<void> {
    const existing = await this.db.query<{ id: string }[]>(
      `SELECT id FROM waitlist_entries WHERE id = $1`,
      [id],
    );
    if (!existing.length) throw new NotFoundException('Waitlist entry not found');
    await this.db.query(
      `UPDATE waitlist_entries
       SET is_contacted = $2,
           contacted_at = CASE WHEN $2 THEN now() ELSE NULL END,
           notes = COALESCE($3, notes)
       WHERE id = $1`,
      [id, body.isContacted, body.notes ?? null],
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a waitlist entry' })
  async deleteWaitlistEntry(@Param('id') id: string): Promise<void> {
    await this.db.query(`DELETE FROM waitlist_entries WHERE id = $1`, [id]);
  }
}
