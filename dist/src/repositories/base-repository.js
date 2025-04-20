"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
/**
 * Abstract Base Repository Class
 * Provides common functionality for all repositories
 */
class BaseRepository {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }
    /**
     * Calculate pagination limits
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object with offset and limit
     */
    getPaginationParams(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        return { offset, limit };
    }
}
exports.BaseRepository = BaseRepository;
