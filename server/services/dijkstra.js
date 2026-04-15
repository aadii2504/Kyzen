/**
 * Dijkstra's Algorithm for finding shortest path between zones
 * Edge weights are adjusted by congestion: weight = walkTime * (1 + congestion/100)
 * This makes the router automatically avoid congested areas.
 */

const Zone = require('../models/Zone');

class PriorityQueue {
  constructor() {
    this.items = [];
  }
  enqueue(element, priority) {
    this.items.push({ element, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }
  dequeue() {
    return this.items.shift();
  }
  isEmpty() {
    return this.items.length === 0;
  }
}

/**
 * Build a weighted graph from zone data
 * @param {Array} zones - Array of zone documents
 * @returns {Object} adjacency list with weights
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
 * Find shortest path between two zones using Dijkstra
 * @param {string} startId - Starting zone ID
 * @param {string} endId - Destination zone ID
 * @param {Array} zones - Array of zone documents (optional, will fetch if not provided)
 * @returns {Object} { path: [zoneIds], totalSeconds, totalCongestionAdjusted, segments }
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

  // Initialize
  Object.keys(graph).forEach(node => {
    distances[node] = Infinity;
    previous[node] = null;
  });
  distances[startId] = 0;
  pq.enqueue(startId, 0);

  while (!pq.isEmpty()) {
    const { element: current } = pq.dequeue();

    if (current === endId) break;

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
 * Find optimal multi-stop route (greedy nearest neighbor)
 * @param {string} startId - Starting zone
 * @param {Array} stopIds - Array of zone IDs to visit
 * @param {Array} zones - Zone documents
 * @returns {Object} ordered stops with path details
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

module.exports = { findShortestPath, findMultiStopRoute, buildGraph };
