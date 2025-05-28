import {
  CreateEventInput,
  CreateEventParticipantInput,
  CreateEventVoiceAccessInput,
  EventEntity,
  EventFilters,
  EventListQuery,
  EventPaginationQuery,
  EventParticipantEntity,
  EventParticipantWithUserQuery,
  EventRequiredTagEntity,
  EventStatus,
  EventType,
  EventVoiceAccessEntity,
  EventVoiceAccessWithUserQuery,
  EventWithDetailsQuery,
  ParticipantStatus,
  UpdateEventInput,
  UserEventEligibilityQuery,
  VoiceAccessStatus,
} from "@/types/database";

import { createLogger } from "@/utils/logger";
import { db } from "../db-client";

const logger = createLogger("event-repository");

export class EventRepository {
  // ==================== Core Event Operations ====================

  async createEvent(
    eventData: CreateEventInput,
    requiredTagIds: string[],
  ): Promise<EventEntity> {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      // 1. Create the event
      const eventQuery = `
        INSERT INTO events (
          title, description, event_type, start_time, end_time, 
          voice_channel_id, max_participants, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const eventValues = [
        eventData.title,
        eventData.description || null,
        eventData.event_type,
        eventData.start_time,
        eventData.end_time || null,
        eventData.voice_channel_id,
        eventData.max_participants || null,
        eventData.created_by || null, // Will be set by service layer
      ];

      const eventResult = await client.query(eventQuery, eventValues);
      const event = eventResult.rows[0];

      // 2. Add required tags if any
      if (requiredTagIds && requiredTagIds.length > 0) {
        const tagQuery = `
          INSERT INTO event_required_tags (event_id, tag_id)
          VALUES ($1, $2)
        `;

        for (const tagId of requiredTagIds) {
          await client.query(tagQuery, [event.id, tagId]);
        }
      }

      await client.query("COMMIT");
      logger.info("Event created successfully", {
        eventId: event.id,
        title: event.title,
      });

      return event;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to create event", { error, eventData });
      throw error;
    } finally {
      client.release();
    }
  }

  async getEvents(
    filters: EventFilters = {},
    pagination: EventPaginationQuery = {},
  ): Promise<{ events: EventListQuery[]; total: number }> {
    try {
      const {
        status,
        event_type,
        created_by,
        start_date,
        end_date,
        voice_channel_id,
        search,
      } = filters;

      const {
        page = 1,
        limit = 20,
        sort_by = "start_time",
        sort_order = "asc",
      } = pagination;

      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      // Build WHERE conditions
      if (status) {
        if (Array.isArray(status)) {
          conditions.push(`e.status = ANY($${paramCount})`);
          params.push(status);
        } else {
          conditions.push(`e.status = $${paramCount}`);
          params.push(status);
        }
        paramCount++;
      }

      if (event_type) {
        if (Array.isArray(event_type)) {
          conditions.push(`e.event_type = ANY($${paramCount})`);
          params.push(event_type);
        } else {
          conditions.push(`e.event_type = $${paramCount}`);
          params.push(event_type);
        }
        paramCount++;
      }

      if (created_by) {
        conditions.push(`e.created_by = $${paramCount}`);
        params.push(created_by);
        paramCount++;
      }

      if (start_date) {
        conditions.push(`e.start_time >= $${paramCount}`);
        params.push(start_date);
        paramCount++;
      }

      if (end_date) {
        conditions.push(`e.start_time <= $${paramCount}`);
        params.push(end_date);
        paramCount++;
      }

      if (voice_channel_id) {
        conditions.push(`e.voice_channel_id = $${paramCount}`);
        params.push(voice_channel_id);
        paramCount++;
      }

      if (search) {
        conditions.push(
          `(e.title ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`,
        );
        params.push(`%${search}%`);
        paramCount++;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Main query
      const query = `
        SELECT 
          e.*,
          u.username as creator_username,
          COUNT(DISTINCT ep.id) as participant_count,
          COUNT(DISTINCT eva.id) as voice_access_count,
          COUNT(DISTINCT ert.id) as required_tag_count,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'name', t.name,
                'display_name', t.display_name,
                'color', t.color,
                'icon', t.icon
              )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'::json
          ) as required_tags_preview
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN event_participants ep ON e.id = ep.event_id
        LEFT JOIN event_voice_access eva ON e.id = eva.event_id AND eva.status = 'active'
        LEFT JOIN event_required_tags ert ON e.id = ert.event_id
        LEFT JOIN tags t ON ert.tag_id = t.id
        ${whereClause}
        GROUP BY e.id, u.username
        ORDER BY e.${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      params.push(limit, offset);

      // Count query
      const countQuery = `
        SELECT COUNT(DISTINCT e.id) as total
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        ${whereClause}
      `;

      const [eventsResult, countResult] = await Promise.all([
        db.query(query, params),
        db.query(countQuery, params.slice(0, -2)), // Remove limit and offset from count
      ]);

      const events = eventsResult.rows.map((row) => ({
        ...row,
        participant_count: parseInt(row.participant_count),
        voice_access_count: parseInt(row.voice_access_count),
        required_tag_count: parseInt(row.required_tag_count),
        user_participation_status: null, // Will be set if user_id provided
        user_has_voice_access: false,
        user_can_join: false,
      }));

      return {
        events,
        total: parseInt(countResult.rows[0].total),
      };
    } catch (error) {
      logger.error("Failed to get events", { error, filters, pagination });
      throw error;
    }
  }

  async getEventById(
    id: string,
    userId?: string,
  ): Promise<EventWithDetailsQuery | null> {
    try {
      const query = `
        SELECT 
          e.*,
          u.username as creator_username,
          u.avatar_url as creator_avatar_url,
          COUNT(DISTINCT ep.id) as participant_count,
          COUNT(DISTINCT ep_granted.id) as granted_participants,
          COUNT(DISTINCT eva.id) as voice_access_count,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', ert.id,
                'tag_id', t.id,
                'name', t.name,
                'display_name', t.display_name,
                'color', t.color,
                'icon', t.icon,
                'category', t.category
              )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'::json
          ) as required_tags
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN event_participants ep ON e.id = ep.event_id
        LEFT JOIN event_participants ep_granted ON e.id = ep_granted.event_id AND ep_granted.status = 'granted'
        LEFT JOIN event_voice_access eva ON e.id = eva.event_id AND eva.status = 'active'
        LEFT JOIN event_required_tags ert ON e.id = ert.event_id
        LEFT JOIN tags t ON ert.tag_id = t.id
        WHERE e.id = $1
        GROUP BY e.id, u.username, u.avatar_url
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        participant_count: parseInt(row.participant_count),
        granted_participants: parseInt(row.granted_participants),
        voice_access_count: parseInt(row.voice_access_count),
      };
    } catch (error) {
      logger.error("Failed to get event by id", { error, id });
      throw error;
    }
  }

  async updateEvent(
    id: string,
    eventData: UpdateEventInput,
  ): Promise<EventEntity | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(eventData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error("No fields to update");
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE events 
        SET ${fields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info("Event updated successfully", { eventId: id });
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update event", { error, id, eventData });
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<boolean> {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      // Check if event exists
      const checkQuery = "SELECT id FROM events WHERE id = $1";
      const checkResult = await client.query(checkQuery, [id]);

      if (checkResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return false;
      }

      // Delete in correct order (child tables first)
      await client.query("DELETE FROM event_voice_access WHERE event_id = $1", [
        id,
      ]);
      await client.query("DELETE FROM event_participants WHERE event_id = $1", [
        id,
      ]);
      await client.query(
        "DELETE FROM event_required_tags WHERE event_id = $1",
        [id],
      );
      await client.query("DELETE FROM events WHERE id = $1", [id]);

      await client.query("COMMIT");
      logger.info("Event deleted successfully", { eventId: id });
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to delete event", { error, id });
      throw error;
    } finally {
      client.release();
    }
  }

  async updateEventStatus(
    id: string,
    status: EventStatus,
  ): Promise<EventEntity | null> {
    try {
      const query = `
        UPDATE events 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await db.query(query, [status, id]);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info("Event status updated", { eventId: id, status });
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update event status", { error, id, status });
      throw error;
    }
  }

  // ==================== Tag & Access Operations ====================

  async getEventRequiredTags(
    eventId: string,
  ): Promise<EventRequiredTagEntity[]> {
    try {
      const query = `
        SELECT ert.*, t.name, t.display_name, t.color, t.icon, t.category
        FROM event_required_tags ert
        JOIN tags t ON ert.tag_id = t.id
        WHERE ert.event_id = $1 AND t.is_active = true
        ORDER BY t.category, t.name
      `;

      const result = await db.query(query, [eventId]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to get event required tags", { error, eventId });
      throw error;
    }
  }

  async checkUserEligibility(
    eventId: string,
    userId: string,
  ): Promise<UserEventEligibilityQuery> {
    try {
      const query = `
        WITH required_tags AS (
          SELECT t.id, t.name, t.display_name, t.color, t.icon
          FROM event_required_tags ert
          JOIN tags t ON ert.tag_id = t.id
          WHERE ert.event_id = $1 AND t.is_active = true
        ),
        user_tags AS (
          SELECT t.id, t.name, t.display_name, t.color, t.icon, ut.is_primary
          FROM user_tags ut
          JOIN tags t ON ut.tag_id = t.id
          WHERE ut.user_id = $2 AND ut.is_active = true AND t.is_active = true
        ),
        missing_tags AS (
          SELECT rt.id, rt.name, rt.display_name, rt.color, rt.icon
          FROM required_tags rt
          LEFT JOIN user_tags ut ON rt.id = ut.id
          WHERE ut.id IS NULL
        )
        SELECT 
          $2 as user_id,
          $1 as event_id,
          (SELECT COUNT(*) FROM missing_tags) = 0 as is_eligible,
          (SELECT COUNT(*) FROM required_tags) = 0 OR (SELECT COUNT(*) FROM missing_tags) = 0 as has_all_required_tags,
          COALESCE(
            (SELECT json_agg(json_build_object(
              'tag_id', id,
              'name', name,
              'display_name', display_name,
              'color', color,
              'icon', icon
            )) FROM missing_tags),
            '[]'::json
          ) as missing_required_tags,
          COALESCE(
            (SELECT json_agg(json_build_object(
              'tag_id', id,
              'name', name,
              'display_name', display_name,
              'color', color,
              'icon', icon,
              'is_primary', is_primary
            )) FROM user_tags),
            '[]'::json
          ) as user_tags
      `;

      const result = await db.query(query, [eventId, userId]);
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to check user eligibility", {
        error,
        eventId,
        userId,
      });
      throw error;
    }
  }

  async getUserEventAccess(
    eventId: string,
    userId: string,
  ): Promise<EventVoiceAccessEntity | null> {
    try {
      const query = `
        SELECT * FROM event_voice_access 
        WHERE event_id = $1 AND user_id = $2
        ORDER BY granted_at DESC
        LIMIT 1
      `;

      const result = await db.query(query, [eventId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to get user event access", {
        error,
        eventId,
        userId,
      });
      throw error;
    }
  }

  async grantEventAccess(
    eventId: string,
    userId: string,
    discordUserId: string,
  ): Promise<EventVoiceAccessEntity> {
    try {
      // First revoke any existing access to avoid duplicates
      await this.revokeEventAccess(eventId, userId);

      const query = `
        INSERT INTO event_voice_access (
          event_id, user_id, discord_user_id, status, granted_by_system
        )
        VALUES ($1, $2, $3, 'active', true)
        RETURNING *
      `;

      const result = await db.query(query, [eventId, userId, discordUserId]);

      logger.info("Event access granted", { eventId, userId, discordUserId });
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to grant event access", { error, eventId, userId });
      throw error;
    }
  }

  async revokeEventAccess(
    eventId: string,
    userId: string,
    reason?: string,
  ): Promise<boolean> {
    try {
      const query = `
        UPDATE event_voice_access 
        SET 
          status = 'revoked',
          revoked_at = CURRENT_TIMESTAMP,
          revoke_reason = $3
        WHERE event_id = $1 AND user_id = $2 AND status = 'active'
      `;

      const result = await db.query(query, [
        eventId,
        userId,
        reason || "manual_revoke",
      ]);
      const success = (result.rowCount ?? 0) > 0;

      if (success) {
        logger.info("Event access revoked", { eventId, userId, reason });
      }

      return success;
    } catch (error) {
      logger.error("Failed to revoke event access", { error, eventId, userId });
      throw error;
    }
  }

  async getEventActiveAccess(
    eventId: string,
  ): Promise<EventVoiceAccessWithUserQuery[]> {
    try {
      const query = `
        SELECT 
          eva.*,
          u.username,
          u.avatar_url,
          e.title as event_title,
          e.event_type,
          e.voice_channel_id
        FROM event_voice_access eva
        JOIN users u ON eva.user_id = u.id
        JOIN events e ON eva.event_id = e.id
        WHERE eva.event_id = $1 AND eva.status = 'active'
        ORDER BY eva.granted_at DESC
      `;

      const result = await db.query(query, [eventId]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to get event active access", { error, eventId });
      throw error;
    }
  }

  async revokeAllEventAccess(
    eventId: string,
    reason?: string,
  ): Promise<number> {
    try {
      const query = `
        UPDATE event_voice_access 
        SET 
          status = 'revoked',
          revoked_at = CURRENT_TIMESTAMP,
          revoke_reason = $2
        WHERE event_id = $1 AND status = 'active'
      `;

      const result = await db.query(query, [eventId, reason || "event_ended"]);
      const revokedCount = result.rowCount ?? 0;

      logger.info("All event access revoked", {
        eventId,
        revokedCount,
        reason,
      });
      return revokedCount;
    } catch (error) {
      logger.error("Failed to revoke all event access", { error, eventId });
      throw error;
    }
  }

  // ==================== Participant Operations ====================

  async addParticipant(
    eventId: string,
    userId: string,
    status: ParticipantStatus = ParticipantStatus.REQUESTED,
  ): Promise<EventParticipantEntity> {
    try {
      const query = `
        INSERT INTO event_participants (event_id, user_id, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (event_id, user_id) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          requested_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await db.query(query, [eventId, userId, status]);

      logger.info("Participant added to event", { eventId, userId, status });
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to add participant", {
        error,
        eventId,
        userId,
        status,
      });
      throw error;
    }
  }

  async removeParticipant(eventId: string, userId: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM event_participants 
        WHERE event_id = $1 AND user_id = $2
      `;

      const result = await db.query(query, [eventId, userId]);
      const success = (result.rowCount ?? 0) > 0;

      if (success) {
        logger.info("Participant removed from event", { eventId, userId });
      }

      return success;
    } catch (error) {
      logger.error("Failed to remove participant", { error, eventId, userId });
      throw error;
    }
  }

  async getEventParticipants(
    eventId: string,
  ): Promise<EventParticipantWithUserQuery[]> {
    try {
      const query = `
        SELECT 
          ep.*,
          u.username,
          u.avatar_url,
          dp.discord_id,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'tag_id', t.id,
                'tag_name', t.name,
                'tag_display_name', t.display_name,
                'tag_color', t.color,
                'tag_icon', t.icon,
                'is_primary', ut.is_primary
              )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'::json
          ) as user_tags
        FROM event_participants ep
        JOIN users u ON ep.user_id = u.id
        LEFT JOIN discord_profiles dp ON u.id = dp.user_id
        LEFT JOIN user_tags ut ON u.id = ut.user_id AND ut.is_active = true
        LEFT JOIN tags t ON ut.tag_id = t.id AND t.is_active = true
        WHERE ep.event_id = $1
        GROUP BY ep.id, u.username, u.avatar_url, dp.discord_id
        ORDER BY ep.requested_at DESC
      `;

      const result = await db.query(query, [eventId]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to get event participants", { error, eventId });
      throw error;
    }
  }

  // ==================== Helper Methods ====================

  async getUserDiscordProfile(
    userId: string,
  ): Promise<{ discord_id: string } | null> {
    try {
      const query =
        "SELECT discord_id FROM discord_profiles WHERE user_id = $1";
      const result = await db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to get user discord profile", { error, userId });
      throw error;
    }
  }

  async getTagsByIds(tagIds: string[]): Promise<any[]> {
    try {
      if (tagIds.length === 0) return [];

      const query = `
        SELECT id, name, display_name, color, icon, category
        FROM tags 
        WHERE id = ANY($1) AND is_active = true
      `;

      const result = await db.query(query, [tagIds]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to get tags by ids", { error, tagIds });
      throw error;
    }
  }
}

export const eventRepository = new EventRepository();
