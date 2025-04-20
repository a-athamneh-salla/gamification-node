"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDb = initializeDb;
exports.runMigrations = runMigrations;
const d1_1 = require("drizzle-orm/d1");
const schema = __importStar(require("./schema"));
/**
 * Initialize database connection with Drizzle ORM
 * @param d1Database Cloudflare D1 database binding
 * @returns Drizzle ORM database instance
 */
function initializeDb(d1Database) {
    return (0, d1_1.drizzle)(d1Database, { schema });
}
/**
 * Run database migrations
 */
async function runMigrations() {
    // In Cloudflare Workers environment, migrations should be applied using Wrangler CLI
    // This is a placeholder that logs information but doesn't try to run migrations at runtime
    console.log('In production, migrations should be applied using: wrangler d1 migrations apply GAMIFICATION_DB');
    console.log('For development, use: pnpm run setup-db');
    // For development environment, you can use the existing script: pnpm run setup-db
    // which runs: wrangler d1 migrations apply GAMIFICATION_DB
}
