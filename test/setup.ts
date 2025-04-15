// Global Jest setup
jest.setTimeout(10000); // Set timeout for all tests

// Mock global objects that are available in Cloudflare Workers
global.caches = {
  default: {
    match: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
} as any;

// Add any other global mocks or setup needed for tests