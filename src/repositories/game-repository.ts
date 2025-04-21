import { eq, sql, and, or, desc } from 'drizzle-orm';
import { BaseRepository } from './base-repository';
import { games, players } from '../db/schema';
import { Game } from '../types';
import { DB } from '../db';

/**
 * Game Repository
 * Handles data access for the Game entity
 */
export class GameRepository extends BaseRepository<Game> {
  constructor(db: DB) {
    super(db, 'games');
  }

  /**
   * Create a new game
   * @param data Game data
   * @returns Created game
   */
  async create(data: Partial<Game>): Promise<Game> {
    const result = await this.db
      .insert(games)
      .values({
        name: data.name as string,
        description: data.description,
        isActive: data.isActive ?? true,
        startDate: data.startDate,
        endDate: data.endDate,
        targetType: (data.targetType ?? 'all') as any,
        targetPlayers: data.targetPlayers
      })
      .returning();

    return result[0] as Game;
  }

  /**
   * Find a game by its ID
   * @param id Game ID
   * @returns Game or null if not found
   */
  async findById(id: number): Promise<Game | null> {
    const result = await this.db
      .select()
      .from(games)
      .where(eq(games.id, id))
      .limit(1);

    return result.length ? result[0] as Game : null;
  }

  /**
   * Get all games with pagination
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object containing games and total count
   */
  async findAll(
    page: number = 1,
    limit: number = 10
  ): Promise<{ items: Game[]; total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);

    const result = await this.db
      .select()
      .from(games)
      .orderBy(desc(games.createdAt))
      .limit(limitParam)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(games);

    return {
      items: result as Game[],
      total: Number(countResult[0].count)
    };
  }

  /**
   * Get games available to a specific player
   * @param playerId Player ID
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object containing games and total count
   */
  async findByPlayer(
    playerId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ games: Game[]; total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);

    // First get player details
    const playerResult = await this.db
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1);

    if (!playerResult.length) {
      return { games: [], total: 0 };
    }

    // Find games available to this player based on target criteria
    const result = await this.db
      .select()
      .from(games)
      .where(
        or(
          eq(games.targetType, 'all'),
          and(
            eq(games.targetType, 'specific'),
            sql`json_extract(${games.targetPlayers}, '$') LIKE '%${playerId}%'`
          ),
          // For filtered type, we would need more complex logic based on player attributes
          // For now, we'll assume all filtered games are accessible
          eq(games.targetType, 'filtered')
        )
      )
      .where(
        and(
          eq(games.isActive, true),
          or(
            sql`${games.startDate} IS NULL`,
            sql`${games.startDate} <= CURRENT_TIMESTAMP`
          ),
          or(
            sql`${games.endDate} IS NULL`,
            sql`${games.endDate} >= CURRENT_TIMESTAMP`
          )
        )
      )
      .orderBy(desc(games.createdAt))
      .limit(limitParam)
      .offset(offset);

    // Count total accessible games
    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(games)
      .where(
        or(
          eq(games.targetType, 'all'),
          and(
            eq(games.targetType, 'specific'),
            sql`json_extract(${games.targetPlayers}, '$') LIKE '%${playerId}%'`
          ),
          eq(games.targetType, 'filtered')
        )
      )
      .where(
        and(
          eq(games.isActive, true),
          or(
            sql`${games.startDate} IS NULL`,
            sql`${games.startDate} <= CURRENT_TIMESTAMP`
          ),
          or(
            sql`${games.endDate} IS NULL`,
            sql`${games.endDate} >= CURRENT_TIMESTAMP`
          )
        )
      );

    return {
      games: result as Game[],
      total: Number(countResult[0].count)
    };
  }

  /**
   * Update a game
   * @param id Game ID
   * @param data Game data to update
   * @returns Updated game
   */
  async update(id: number, data: Partial<Game>): Promise<Game | null> {
    const result = await this.db
      .update(games)
      .set({
        ...data,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(games.id, id))
      .returning();

    return result.length ? result[0] as Game : null;
  }

  /**
   * Delete a game
   * @param id Game ID
   * @returns Boolean indicating success
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(games)
      .where(eq(games.id, id))
      .returning({ id: games.id });

    return result.length > 0;
  }

  /**
   * Grant access to a game for a player
   * @param gameId Game ID
   * @param playerId Player ID
   * @returns Boolean indicating success
   */
  async grantAccessToPlayer(gameId: number, playerId: number): Promise<boolean> {
    // Update the game's targetPlayers to include this player
    const game = await this.findById(gameId);
    if (!game) {
      return false;
    }

    let targetPlayers: number[] = [];
    if (game.targetPlayers) {
      try {
        targetPlayers = JSON.parse(game.targetPlayers);
      } catch (e) {
        targetPlayers = [];
      }
    }

    // Add player if not already in the list
    if (!targetPlayers.includes(playerId)) {
      targetPlayers.push(playerId);
    }

    // Update the game
    const result = await this.update(gameId, {
      targetType: 'specific',
      targetPlayers: JSON.stringify(targetPlayers)
    });

    return !!result;
  }

  /**
   * Revoke access to a game for a player
   * @param gameId Game ID
   * @param playerId Player ID
   * @returns Boolean indicating success
   */
  async revokeAccessFromPlayer(gameId: number, playerId: number): Promise<boolean> {
    // Update the game's targetPlayers to remove this player
    const game = await this.findById(gameId);
    if (!game) {
      return false;
    }

    let targetPlayers: number[] = [];
    if (game.targetPlayers) {
      try {
        targetPlayers = JSON.parse(game.targetPlayers);
      } catch (e) {
        targetPlayers = [];
      }
    }

    // Remove player if in the list
    targetPlayers = targetPlayers.filter(id => id !== playerId);

    // Update the game
    const result = await this.update(gameId, {
      targetPlayers: JSON.stringify(targetPlayers)
    });

    return !!result;
  }
}