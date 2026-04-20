/**
 * @module pulseEngine.test
 * @description Unit tests for the Pulse Score Engine.
 * Tests all 5 scoring components and edge cases with mocked MongoDB models.
 */

// Mock all Mongoose models before requiring the module
jest.mock('../models/Zone');
jest.mock('../models/Vendor');
jest.mock('../models/CrowdReport');
jest.mock('../models/Event');

const Zone = require('../models/Zone');
const Vendor = require('../models/Vendor');
const CrowdReport = require('../models/CrowdReport');
const Event = require('../models/Event');
const { calculatePulseScore } = require('../services/pulseEngine');

describe('PulseEngine — calculatePulseScore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns score=100 when no zones exist', async () => {
    Zone.find.mockResolvedValue([]);
    Vendor.find.mockResolvedValue([]);
    CrowdReport.find.mockResolvedValue([]);
    Event.findOne.mockResolvedValue(null);

    const result = await calculatePulseScore();
    expect(result.score).toBe(100);
    expect(result.label).toBe('No Data');
  });

  test('returns high score for low-congestion stadium', async () => {
    Zone.find.mockResolvedValue([
      { congestionLevel: 10, currentOccupancy: 100, capacity: 1000 },
      { congestionLevel: 15, currentOccupancy: 150, capacity: 1000 },
    ]);
    Vendor.find.mockResolvedValue([
      { estimatedWaitMinutes: 2 },
      { estimatedWaitMinutes: 3 },
    ]);
    CrowdReport.find.mockResolvedValue([]);
    Event.findOne.mockResolvedValue(null);

    const result = await calculatePulseScore();
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.label).toBe('Smooth');
    expect(result.trend).toBe('excellent');
  });

  test('returns low score for high-congestion stadium', async () => {
    Zone.find.mockResolvedValue([
      { congestionLevel: 90, currentOccupancy: 900, capacity: 1000 },
      { congestionLevel: 95, currentOccupancy: 950, capacity: 1000 },
    ]);
    Vendor.find.mockResolvedValue([
      { estimatedWaitMinutes: 25 },
      { estimatedWaitMinutes: 28 },
    ]);
    CrowdReport.find.mockResolvedValue([
      { sentiment: 'negative' },
      { sentiment: 'negative' },
      { sentiment: 'neutral' },
    ]);
    Event.findOne.mockResolvedValue(null);

    const result = await calculatePulseScore();
    expect(result.score).toBeLessThan(30);
    expect(['Stressed', 'Critical']).toContain(result.label);
  });

  test('emergency mode adds penalty', async () => {
    Zone.find.mockResolvedValue([
      { congestionLevel: 20, currentOccupancy: 200, capacity: 1000 },
    ]);
    Vendor.find.mockResolvedValue([]);
    CrowdReport.find.mockResolvedValue([]);
    Event.findOne.mockResolvedValue({ emergencyMode: true });

    const result = await calculatePulseScore();
    // Emergency penalty of 0.10 * 100 = 10 points deducted
    expect(result.breakdown.safety).toBe(0);
  });

  test('breakdown values are computed correctly', async () => {
    Zone.find.mockResolvedValue([
      { congestionLevel: 50, currentOccupancy: 500, capacity: 1000 },
    ]);
    Vendor.find.mockResolvedValue([
      { estimatedWaitMinutes: 10 },
    ]);
    CrowdReport.find.mockResolvedValue([
      { sentiment: 'positive' },
    ]);
    Event.findOne.mockResolvedValue({ emergencyMode: false });

    const result = await calculatePulseScore();
    expect(result.breakdown).toHaveProperty('crowdFlow');
    expect(result.breakdown).toHaveProperty('queueEfficiency');
    expect(result.breakdown).toHaveProperty('mood');
    expect(result.breakdown).toHaveProperty('capacity');
    expect(result.breakdown).toHaveProperty('safety');
    expect(result.breakdown.safety).toBe(100);
    expect(result.stats.totalZones).toBe(1);
  });

  test('returns default score on error', async () => {
    Zone.find.mockRejectedValue(new Error('DB failure'));

    const result = await calculatePulseScore();
    expect(result.score).toBe(50);
    expect(result.label).toBe('Unknown');
  });

  test('includes timestamp in result', async () => {
    Zone.find.mockResolvedValue([
      { congestionLevel: 30, currentOccupancy: 300, capacity: 1000 },
    ]);
    Vendor.find.mockResolvedValue([]);
    CrowdReport.find.mockResolvedValue([]);
    Event.findOne.mockResolvedValue(null);

    const result = await calculatePulseScore();
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });
});
