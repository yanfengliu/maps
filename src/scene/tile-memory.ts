/** Mipmap estimates are fractional; LRU byte totals must be exact under reorder.
 * A conservative ceiling adds less than one byte per cached tile.
 */
export function wholeByteAccounting<Args extends unknown[]>(estimate: (...args: Args) => number): (...args: Args) => number {
  return (...args) => Math.ceil(estimate(...args));
}
