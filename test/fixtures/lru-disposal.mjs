// Real upstream zero-budget unload. Run only in a child with a bounded timeout.
import { LRUCache } from "3d-tiles-renderer/core";
import { wholeByteAccounting } from "../../src/scene/tile-memory.ts";

const cache = new LRUCache();
const estimate = process.argv.includes("--fractional") ? (value) => value : wholeByteAccounting((value) => value);
const values = [0.1, 0.2, 0.3].map(estimate);
let removed = 0;
values.forEach((value, index) => { cache.add(index, () => removed++); cache.setMemoryUsage(index, value); });
cache.unloadPriorityCallback = (a, b) => a - b;
cache.minSize = 0; cache.maxSize = 0; cache.minBytesSize = 0; cache.maxBytesSize = Infinity; cache.unloadPercent = 1;
cache.markAllUnused();
const orderedSum = [...values].reverse().reduce((sum, value) => sum + value, 0);
console.log(JSON.stringify({ cachedBytes: cache.cachedBytes, orderedSum, remainder: cache.cachedBytes - orderedSum }));
cache.unloadUnusedContent();
console.log(JSON.stringify({ removed, remaining: cache.cachedBytes }));
