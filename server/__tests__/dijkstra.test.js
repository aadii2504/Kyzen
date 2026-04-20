/**
 * @module dijkstra.test
 * @description Unit tests for the Dijkstra shortest path algorithm.
 * Tests the binary heap priority queue, graph construction, and path finding.
 */

const { PriorityQueue, buildGraph, findShortestPath } = require('../services/dijkstra');

// Mock Mongoose Zone model
jest.mock('../models/Zone');

describe('PriorityQueue (Binary Min-Heap)', () => {
  test('should enqueue and dequeue in priority order', () => {
    const pq = new PriorityQueue();
    pq.enqueue('A', 5);
    pq.enqueue('B', 1);
    pq.enqueue('C', 3);

    expect(pq.dequeue().element).toBe('B');
    expect(pq.dequeue().element).toBe('C');
    expect(pq.dequeue().element).toBe('A');
  });

  test('should handle single element', () => {
    const pq = new PriorityQueue();
    pq.enqueue('only', 42);
    expect(pq.size()).toBe(1);
    expect(pq.dequeue().element).toBe('only');
    expect(pq.isEmpty()).toBe(true);
  });

  test('should handle elements with equal priority', () => {
    const pq = new PriorityQueue();
    pq.enqueue('X', 10);
    pq.enqueue('Y', 10);
    pq.enqueue('Z', 10);
    expect(pq.size()).toBe(3);
    // All should dequeue successfully regardless of order
    const results = [pq.dequeue(), pq.dequeue(), pq.dequeue()];
    expect(results.every(r => r.priority === 10)).toBe(true);
  });

  test('should return null when dequeueing empty queue', () => {
    const pq = new PriorityQueue();
    expect(pq.dequeue()).toBeNull();
  });

  test('should correctly report isEmpty', () => {
    const pq = new PriorityQueue();
    expect(pq.isEmpty()).toBe(true);
    pq.enqueue('A', 1);
    expect(pq.isEmpty()).toBe(false);
    pq.dequeue();
    expect(pq.isEmpty()).toBe(true);
  });
});

describe('buildGraph', () => {
  test('should build adjacency list from zone data', () => {
    const zones = [
      {
        zoneId: 'A', congestionLevel: 20,
        walkTimeToAdjacent: [{ zoneId: 'B', seconds: 60 }]
      },
      {
        zoneId: 'B', congestionLevel: 50,
        walkTimeToAdjacent: [{ zoneId: 'A', seconds: 60 }]
      },
    ];

    const { graph, zoneMap } = buildGraph(zones);
    expect(graph['A']).toHaveLength(1);
    expect(graph['A'][0].node).toBe('B');
    expect(graph['A'][0].rawSeconds).toBe(60);
    // Weight should be 60 * (1 + 0.50) = 90
    expect(graph['A'][0].weight).toBe(90);
    expect(zoneMap['A'].zoneId).toBe('A');
  });

  test('should handle zones with no adjacent connections', () => {
    const zones = [{ zoneId: 'lonely', congestionLevel: 0, walkTimeToAdjacent: [] }];
    const { graph } = buildGraph(zones);
    expect(graph['lonely']).toEqual([]);
  });

  test('should skip edges to non-existent zones', () => {
    const zones = [
      {
        zoneId: 'X', congestionLevel: 10,
        walkTimeToAdjacent: [{ zoneId: 'ghost', seconds: 30 }]
      },
    ];
    const { graph } = buildGraph(zones);
    expect(graph['X']).toHaveLength(0);
  });
});

describe('findShortestPath', () => {
  const mockZones = [
    {
      zoneId: 'start', name: 'Start', congestionLevel: 0,
      walkTimeToAdjacent: [{ zoneId: 'mid', seconds: 60 }, { zoneId: 'end', seconds: 200 }],
      coordinates: { lat: 0, lng: 0 }
    },
    {
      zoneId: 'mid', name: 'Middle', congestionLevel: 10,
      walkTimeToAdjacent: [{ zoneId: 'end', seconds: 60 }, { zoneId: 'start', seconds: 60 }],
      coordinates: { lat: 1, lng: 1 }
    },
    {
      zoneId: 'end', name: 'End', congestionLevel: 0,
      walkTimeToAdjacent: [{ zoneId: 'mid', seconds: 60 }],
      coordinates: { lat: 2, lng: 2 }
    },
  ];

  test('should find direct path when it is shortest', async () => {
    // start -> end direct is 200s, start -> mid -> end is 60+60=120s
    const result = await findShortestPath('start', 'end', mockZones);
    expect(result.path).toEqual(['start', 'mid', 'end']);
    expect(result.totalSeconds).toBe(120);
    expect(result.totalMinutes).toBe(2);
  });

  test('should return empty path for non-existent zones', async () => {
    const result = await findShortestPath('start', 'nonexistent', mockZones);
    expect(result.path).toEqual([]);
    expect(result.totalSeconds).toBe(Infinity);
  });

  test('should return segments with congestion details', async () => {
    const result = await findShortestPath('start', 'end', mockZones);
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toHaveProperty('from', 'start');
    expect(result.segments[0]).toHaveProperty('to', 'mid');
    expect(result.segments[0]).toHaveProperty('walkSeconds');
    expect(result.segments[0]).toHaveProperty('congestionAdjusted');
  });

  test('should prefer less congested routes', async () => {
    // Make the direct route go through a very congested zone
    const congestedZones = [
      {
        zoneId: 'A', name: 'A', congestionLevel: 0,
        walkTimeToAdjacent: [{ zoneId: 'B', seconds: 100 }, { zoneId: 'C', seconds: 100 }],
      },
      {
        zoneId: 'B', name: 'B (congested)', congestionLevel: 90,
        walkTimeToAdjacent: [{ zoneId: 'D', seconds: 100 }],
      },
      {
        zoneId: 'C', name: 'C (clear)', congestionLevel: 10,
        walkTimeToAdjacent: [{ zoneId: 'D', seconds: 100 }],
      },
      {
        zoneId: 'D', name: 'D', congestionLevel: 0,
        walkTimeToAdjacent: [],
      },
    ];

    const result = await findShortestPath('A', 'D', congestedZones);
    // Should prefer A -> C -> D over A -> B -> D because B is congested
    expect(result.path).toEqual(['A', 'C', 'D']);
  });
});
