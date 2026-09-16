/**
 * The direct-indexed cell grid: the same neighbour-set contract as `SpatialHash`, with the
 * cell lookup replaced by arithmetic.
 *
 * Why this exists. `main`'s `SpatialHash` finds a cell through a `Map` plus an
 * open-addressed bucket array plus a linked list, and then re-checks the cell's identity
 * because the packing used to overflow. With the cell key fixed, every one of the 25 cells
 * a radius-8 query walks visits bodies genuinely in it — 2,919 candidates per query on the
 * delivered crowd against 8 neighbours returned — so the traversal is now the dominant term
 * in the tick.
 *
 * A uniform grid over a *bounded* world does not need a hash: `column` and `row` index a
 * flat `Int32Array` directly. That removes the Map lookup, the bucket mask, the key
 * packing and the identity test.
 *
 * The neighbour set is defined to be **identical** to `SpatialHash`'s for the same
 * positions, cell size and radius: the same cell box is walked, the same distance test is
 * applied, and the cap keeps the lowest slot indices, returned ascending.
 * `probes/grid-smoke.mjs` checks it against a brute-force disc scan; `DSH_GRID=4` runs it
 * through 1,200 ticks of ORCA with the digest compared against the shipped hash.
 *
 * The bound, stated here: a uniform grid over a fixed extent. `rebuild` throws, naming the
 * coordinate, if a body leaves that extent. It is not a general replacement for a hash
 * over an unbounded world.
 *
 * The build is a two-pass counting sort — count bodies per cell, prefix-sum the counts,
 * then place — so entries in a cell are **contiguous**, which is what makes the walk cheap:
 * no linked list, no pointer chase, and a cell's bodies sit in one run of memory.
 */

/** The walk counters a probe may install on `globalThis` to count what a query visits. */
export interface GridCounters {
  queries: number;
  cellsVisited: number;
  bodiesVisited: number;
  inRadius: number;
  atCap: number;
}

/**
 * The neighbour-index contract the crowd's field is typed to.
 *
 * `SpatialHash` is one implementation and `CellGrid` is another, and the tick reaches its index
 * only through these four members. Naming them is what lets a candidate structure be
 * substituted without the tick knowing.
 */
export interface NeighbourIndex {
  readonly size: number;
  slotAt(index: number): number;
  rebuild(count: number, position: Float32Array, active: Uint8Array): void;
  neighbours(x: number, z: number, radius: number, limit: number, out: Int32Array): number;
}

export interface GridSettings {
  /** Cell edge in metres. Must match the dynamics' cell size for a like-for-like set. */
  readonly cellSizeM: number;
  /** Half-extent of the grid, metres from the world origin. */
  readonly halfExtentM: number;
  /** Diagnostic: validate the bucket invariant after every rebuild. Default false. */
  readonly validateAfterRebuild?: boolean;
}

export class CellGrid implements NeighbourIndex {
  private readonly cellSize: number;
  private readonly inverse: number;
  private readonly columns: number;
  private readonly rows: number;
  private readonly offsetColumn: number;
  private readonly offsetRow: number;
  private readonly half: number;
  /** cell -> first slot in `entries`, or -1 when the cell is empty. */
  private readonly start: Int32Array;
  /** cell -> number of entries, so an emptied cell is found without a second pass. */
  private readonly tally: Int32Array;
  /** cell -> touched this rebuild? One pass clears only what was written. */
  private readonly stamp: Int32Array;
  private touched: Int32Array;
  /** slot indices, grouped by cell. */
  private entries: Int32Array;
  private bodyX: Float64Array;
  private bodyZ: Float64Array;
  private live: Int32Array;
  private count = 0;
  private touchedCount = 0;
  private generation = 0;
  private readonly validate_: boolean;

  constructor(settings: GridSettings) {
    const { cellSizeM, halfExtentM } = settings;
    if (!Number.isFinite(cellSizeM) || cellSizeM <= 0) throw new Error(`Cell grid cell size ${cellSizeM} must be positive metres.`);
    if (!Number.isFinite(halfExtentM) || halfExtentM <= 0) throw new Error(`Cell grid half extent ${halfExtentM} must be positive metres.`);
    this.cellSize = cellSizeM;
    this.inverse = 1 / cellSizeM;
    this.half = halfExtentM;
    // The grid spans [-half, +half] plus one cell of slack on each side, so a query box
    // that runs off the edge is a skipped cell rather than a throw.
    this.columns = 2 * Math.ceil(halfExtentM * this.inverse) + 3;
    this.rows = this.columns;
    this.offsetColumn = this.columns >> 1;
    this.offsetRow = this.rows >> 1;
    const cells = this.columns * this.rows;
    this.start = new Int32Array(cells).fill(-1);
    this.tally = new Int32Array(cells);
    this.stamp = new Int32Array(cells);
    this.touched = new Int32Array(1024);
    this.entries = new Int32Array(0);
    this.bodyX = new Float64Array(0);
    this.bodyZ = new Float64Array(0);
    this.live = new Int32Array(0);
    this.validate_ = settings.validateAfterRebuild === true;
    const registry = (globalThis as { __DSH_GRID_REGISTRY?: CellGrid[] }).__DSH_GRID_REGISTRY;
    if (Array.isArray(registry)) registry.push(this);
  }

  get size(): number {
    return this.count;
  }

  get gridCells(): number {
    return this.columns * this.rows;
  }

  get occupiedCells(): number {
    return this.touchedCount;
  }

  slotAt(index: number): number {
    return this.live[index]!;
  }

  private columnOf(x: number): number {
    return Math.floor(x / this.cellSize) + this.offsetColumn;
  }

  private rowOf(z: number): number {
    return Math.floor(z / this.cellSize) + this.offsetRow;
  }

  rebuild(count: number, position: Float32Array, active: Uint8Array): void {
    if (this.live.length < count) {
      this.live = new Int32Array(count);
      this.bodyX = new Float64Array(count);
      this.bodyZ = new Float64Array(count);
      this.entries = new Int32Array(count);
    }
    let live = 0;
    for (let slot = 0; slot < count; slot += 1) {
      if (!active[slot]) continue;
      this.live[live] = slot;
      this.bodyX[live] = position[slot * 3]!;
      this.bodyZ[live] = position[slot * 3 + 2]!;
      live += 1;
    }
    this.count = live;

    // Clear only the cells the previous rebuild wrote.
    for (let i = 0; i < this.touchedCount; i += 1) {
      const cell = this.touched[i]!;
      this.start[cell] = -1;
      this.tally[cell] = 0;
    }
    this.touchedCount = 0;
    this.generation += 1;
    if (this.generation === 0x7fffffff) {
      this.stamp.fill(0);
      this.generation = 1;
    }

    // Pass one: count.
    for (let entry = 0; entry < live; entry += 1) {
      const column = this.columnOf(this.bodyX[entry]!);
      const row = this.rowOf(this.bodyZ[entry]!);
      this.bounds(column, row, this.bodyX[entry]!, this.bodyZ[entry]!);
      const cell = row * this.columns + column;
      if (this.stamp[cell] !== this.generation) {
        this.stamp[cell] = this.generation;
        if (this.touchedCount >= this.touched.length) {
          const grown = new Int32Array(this.touched.length * 2);
          grown.set(this.touched);
          this.touched = grown;
        }
        this.touched[this.touchedCount] = cell;
        this.touchedCount += 1;
        this.start[cell] = 0;
      }
      this.tally[cell] = this.tally[cell]! + 1;
    }

    // Pass two: prefix sums, so each cell owns a contiguous run.
    let running = 0;
    for (let i = 0; i < this.touchedCount; i += 1) {
      const cell = this.touched[i]!;
      this.start[cell] = running;
      running += this.tally[cell]!;
    }

    // Pass three: place. `cursor` walks each cell's run.
    for (let entry = 0; entry < live; entry += 1) {
      const cell = this.rowOf(this.bodyZ[entry]!) * this.columns + this.columnOf(this.bodyX[entry]!);
      this.entries[this.start[cell]! + this.tally[cell]! - 1] = entry;
      this.tally[cell] = this.tally[cell]! - 1;
    }
    // `tally` is now zero everywhere only if pass two's `start` is restored; recompute the
    // run lengths so a query knows how many entries to read.
    for (let i = 0; i < this.touchedCount; i += 1) {
      const cell = this.touched[i]!;
      this.tally[cell] = 0;
    }
    for (let entry = 0; entry < live; entry += 1) {
      const cell = this.rowOf(this.bodyZ[entry]!) * this.columns + this.columnOf(this.bodyX[entry]!);
      this.tally[cell] = this.tally[cell]! + 1;
    }
    let cursor = 0;
    for (let i = 0; i < this.touchedCount; i += 1) {
      const cell = this.touched[i]!;
      this.start[cell] = cursor;
      cursor += this.tally[cell]!;
    }

    if (this.validate_) this.validate();
  }

  private bounds(column: number, row: number, x: number, z: number): void {
    if (column < 0 || column >= this.columns || row < 0 || row >= this.rows) {
      throw new Error(
        `Cell grid coordinate (${column - this.offsetColumn}, ${row - this.offsetRow}) is outside the grid's ${this.columns} by ${this.rows} cells, which covers +/-${this.half} m at the ${this.cellSize} m cell edge. ` +
          `The body is at (${x}, ${z}); a uniform grid over a fixed extent is the wrong structure once the world is this large.`,
      );
    }
  }

  /** Diagnostic: every live body appears exactly once, in one cell's run. */
  validate(): { entries: number; occupiedCells: number; longestRun: number } {
    const seen = new Uint8Array(this.live.length);
    let entries = 0;
    let longestRun = 0;
    for (let i = 0; i < this.touchedCount; i += 1) {
      const cell = this.touched[i]!;
      const start = this.start[cell]!;
      const run = this.tally[cell]!;
      if (run > longestRun) longestRun = run;
      if (start < 0 || start + run > this.count) {
        throw new Error(`cell ${cell} claims entries [${start}, ${start + run}) but only ${this.count} entries exist`);
      }
      for (let at = start; at < start + run; at += 1) {
        const entry = this.entries[at]!;
        if (entry < 0 || entry >= this.count) throw new Error(`cell ${cell} holds entry ${entry}, outside [0, ${this.count})`);
        if (seen[entry]) throw new Error(`entry ${entry} appears in two cells; cell ${cell} at offset ${at}`);
        seen[entry] = 1;
        entries += 1;
      }
    }
    if (entries !== this.count) throw new Error(`the cells hold ${entries} entries but ${this.count} bodies are live`);
    return { entries, occupiedCells: this.touchedCount, longestRun };
  }

  /** Ascending slot indices within `radius` of (x, z), capped at `limit`. */
  neighbours(x: number, z: number, radius: number, limit: number, out: Int32Array): number {
    const radiusSquared = radius * radius;
    const maximum = Math.min(limit, out.length);
    if (maximum <= 0) return 0;
    const diagnostics = (globalThis as { __DSH_GRID_COUNTS?: GridCounters }).__DSH_GRID_COUNTS;
    if (diagnostics) diagnostics.queries += 1;
    const firstColumn = Math.floor((x - radius) / this.cellSize) + this.offsetColumn;
    const lastColumn = Math.floor((x + radius) / this.cellSize) + this.offsetColumn;
    const firstRow = Math.floor((z - radius) / this.cellSize) + this.offsetRow;
    const lastRow = Math.floor((z + radius) / this.cellSize) + this.offsetRow;
    let found = 0;
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      if (column < 0 || column >= this.columns) continue;
      for (let row = firstRow; row <= lastRow; row += 1) {
        if (row < 0 || row >= this.rows) continue;
        const cell = row * this.columns + column;
        const run = this.tally[cell]!;
        if (diagnostics) {
          diagnostics.cellsVisited += 1;
          diagnostics.bodiesVisited += run;
        }
        if (run === 0) continue;
        const start = this.start[cell]!;
        for (let at = start; at < start + run; at += 1) {
          const entry = this.entries[at]!;
          const dx = this.bodyX[entry]! - x;
          const dz = this.bodyZ[entry]! - z;
          if (dx * dx + dz * dz > radiusSquared) continue;
          if (diagnostics) diagnostics.inRadius += 1;
          const slot = this.live[entry]!;
          if (found === maximum && slot > out[maximum - 1]!) continue;
          let into = Math.min(found, maximum - 1);
          while (into > 0 && out[into - 1]! > slot) {
            out[into] = out[into - 1]!;
            into -= 1;
          }
          out[into] = slot;
          if (found < maximum) found += 1;
          else if (diagnostics) diagnostics.atCap += 1;
        }
      }
    }
    return found;
  }
}
