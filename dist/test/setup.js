"use strict";
// Global Jest setup
jest.setTimeout(10000); // Set timeout for all tests
// Create a types file specifically for global declarations
// This is added as a comment to explain what should be done in a separate file
// Create a file at /test/types/global.d.ts with:
// declare global {
//   var caches: {
//     default: {
//       match: jest.Mock;
//       put: jest.Mock;
//       delete: jest.Mock;
//     };
//   };
// }
// Mock global objects that are available in Cloudflare Workers
// Using any type to avoid TypeScript errors
const globalAny = global;
globalAny.caches = {
    default: {
        match: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
    }
};
// Add any other global mocks or setup needed for tests
