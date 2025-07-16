// This file contains setup code that will be executed before each test
import { jest, beforeAll, afterAll } from '@jest/globals';

// Extend the global namespace for our custom helpers
declare global {
  // eslint-disable-next-line no-var
  var mockKnex: () => any;
}

// Global beforeAll hook
beforeAll(() => {
  // Add any global setup logic here that should run once before all tests
});

// Global afterAll hook
afterAll(() => {
  // Add any global cleanup logic here that should run once after all tests
});

// Create a simpler mock helper that uses type assertions to avoid TypeScript errors
global.mockKnex = (): any => {
  return {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    table: jest.fn().mockReturnThis(),
    transaction: jest.fn((cb: any) => Promise.resolve(cb({}))),
    then: jest.fn((cb: any) => Promise.resolve(cb([]))),
  };
};

// We don't need to explicitly mock the 'knex' module here since we'll use
// the mockKnex function directly in tests to create mock instances