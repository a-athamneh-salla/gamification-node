import { DB } from '../db';

/**
 * Base Repository Interface
 * Defines standard operations to be implemented by all repositories
 */
export interface IRepository<T> {
  findById(id: number): Promise<T | null>;
  findAll(page?: number, limit?: number): Promise<{ items: T[], total: number }>;
  create(data: Partial<T>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T | null>;
  delete(id: number): Promise<boolean>;
}

/**
 * Abstract Base Repository Class
 * Provides common functionality for all repositories
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  protected db: DB;
  protected tableName: string;

  constructor(db: DB, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Find entity by ID
   * @param id Entity ID
   * @returns Entity or null if not found
   */
  abstract findById(id: number): Promise<T | null>;

  /**
   * Find all entities with pagination
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object containing items array and total count
   */
  abstract findAll(page?: number, limit?: number): Promise<{ items: T[], total: number }>;

  /**
   * Create new entity
   * @param data Entity data
   * @returns Created entity
   */
  abstract create(data: Partial<T>): Promise<T>;

  /**
   * Update existing entity
   * @param id Entity ID
   * @param data Entity data to update
   * @returns Updated entity or null if not found
   */
  abstract update(id: number, data: Partial<T>): Promise<T | null>;

  /**
   * Delete entity
   * @param id Entity ID
   * @returns True if deleted, false otherwise
   */
  abstract delete(id: number): Promise<boolean>;

  /**
   * Calculate pagination limits
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object with offset and limit
   */
  protected getPaginationParams(page: number = 1, limit: number = 10): { offset: number, limit: number } {
    const offset = (page - 1) * limit;
    return { offset, limit };
  }
}