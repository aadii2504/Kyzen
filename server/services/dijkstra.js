/**
 * @module dijkstra
 * @description Dijkstra's Algorithm for finding shortest path between stadium zones.
 * Uses a binary min-heap priority queue for O(log n) insert/dequeue operations.
 * Edge weights are adjusted by congestion: weight = walkTime × (1 + congestion/100)
 * This makes the router automatically prefer less congested areas.
 */

const Zone = require('../models/Zone');

/**
 * Binary min-heap priority queue for efficient Dijkstra traversal.
 * Provides O(log n) enqueue and dequeue instead of O(n log n) with array sort.
 */
class PriorityQueue {
  constructor() {
    /** @type {Array<{element: string, priority: number}>} */
    this.heap = [];
  }

  /** @returns {number} */
  size() { return this.heap.length; }

  /** @returns {boolean} */
  isEmpty() { return this.heap.length === 0; }

  /**
   * Insert element with given priority. O(log n)
   * @param {string} element - Node identifier
   * @param {number} priority - Weight/distance value
   */
  enqueue(element, priority) {
    this.heap.push({ element, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the element with smallest priority. O(log n)
   * @returns {{element: string, priority: number}}
   */
  dequeue() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  /** @private */
  _bubbleUp(idx) {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.heap[parentIdx].priority <= this.heap[idx].priority) break;
      [this.heap[parentIdx], this.heap[idx]] = [this.heap[idx], this.heap[parentIdx]];
      idx = parentIdx;
    }
  }

  /** @private */
  _sinkDown(idx) {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === idx) break;
      [this.heap[smallest], this.heap[idx]] = [this.heap[idx], this.heap[smallest]];
      idx = smallest;
    }
  }
}

/**
 * Build a weighted graph from zone data.
 * @param {Array} zones - Array of zone documents
 * @returns {{graph: Object, zoneMap: Object}} adjacency list with weights and zone lookup map
 */
const buildGraph = (zones) => {
  const graph = {};
  const zoneMap = {};

  zones.forEach(zone => {
    zoneMap[zone.zoneId] = zone;
    graph[zone.zoneId] = [];
  });

  zones.forEach(zone => {
    zone.walkTimeToAdjacent.forEach(adj => {
      const targetZone = zoneMap[adj.zoneId];
      if (targetZone) {
        // Weight = walkTime * (1 + congestion factor)
        // A zone at 90% congestion makes the walk cost 1.9x more
        const congestionFactor = targetZone.congestionLevel / 100;
        const weight = adj.seconds * (1 + congestionFactor);
        graph[zone.zoneId].push({
          node: adj.zoneId,
          weight,
          rawSeconds: adj.seconds
        });
      }
    });
  });

  return { graph, zoneMap };
};

/**
 * Find shortest path between two zones using Dijkstra with binary heap.
 * @param {string} startId - Starting zone ID
 * @param {string} endId - Destination zone ID
 * @param {Array|null} zones - Array of zone documents (optional, will fetch if not provided)
 * @returns {Promise<Object>} { path: [zoneIds], totalSeconds, totalCongestionAdjusted, segments }
 */
const findShortestPath = async (startId, endId, zones = null) => {
  if (!zones) {
    zones = await Zone.find({});
  }

  const { graph, zoneMap } = buildGraph(zones);

  if (!graph[startId] || !graph[endId]) {
    return { path: [], totalSeconds: Infinity, error: 'Zone not found in graph' };
  }

  const distances = {};
  const previous = {};
  const pq = new PriorityQueue();

  // Initialize all distances to Infinity
  Object.keys(graph).forEach(node => {
    distances[node] = Infinity;
    previous[node] = null;
  });
  distances[startId] = 0;
  pq.enqueue(startId, 0);

  while (!pq.isEmpty()) {
    const { element: current } = pq.dequeue();

    // Early termination when destination reached
    if (current === endId) break;

    // Skip already-processed nodes with stale priorities
    if (distances[current] === Infinity) continue;

    graph[current].forEach(neighbor => {
      const alt = distances[current] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = current;
        pq.enqueue(neighbor.node, alt);
      }
    });
  }

  // Reconstruct path
  const path = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    current = previous[current];
  }

  if (path[0] !== startId) {
    return { path: [], totalSeconds: Infinity, error: 'No path found' };
  }

  // Build segment details
  const segments = [];
  let totalRawSeconds = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edge = graph[path[i]].find(e => e.node === path[i + 1]);
    totalRawSeconds += edge.rawSeconds;
    segments.push({
      from: path[i],
      to: path[i + 1],
      fromName: zoneMap[path[i]]?.name || path[i],
      toName: zoneMap[path[i + 1]]?.name || path[i + 1],
      walkSeconds: edge.rawSeconds,
      congestionAdjusted: Math.round(edge.weight),
      targetCongestion: zoneMap[path[i + 1]]?.congestionLevel || 0
    });
  }

  return {
    path,
    totalSeconds: totalRawSeconds,
    totalMinutes: Math.ceil(totalRawSeconds / 60),
    congestionAdjustedSeconds: Math.round(distances[endId]),
    segments
  };
};

/**
 * Find optimal multi-stop route using greedy nearest neighbor heuristic.
 * @param {string} startId - Starting zone
 * @param {Array<string>} stopIds - Array of zone IDs to visit
 * @param {Array|null} zones - Zone documents (optional)
 * @returns {Promise<Array>} ordered stops with path details
 */
const findMultiStopRoute = async (startId, stopIds, zones = null) => {
  if (!zones) {
    zones = await Zone.find({});
  }

  const remaining = [...stopIds];
  const ordered = [];
  let current = startId;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const result = await findShortestPath(current, remaining[i], zones);
      if (result.totalSeconds < bestDist) {
        bestDist = result.totalSeconds;
        bestIdx = i;
      }
    }

    const nextStop = remaining.splice(bestIdx, 1)[0];
    const pathDetails = await findShortestPath(current, nextStop, zones);
    ordered.push({ zoneId: nextStop, ...pathDetails });
    current = nextStop;
  }

  return ordered;
};

module.exports = { findShortestPath, findMultiStopRoute, buildGraph, PriorityQueue };
