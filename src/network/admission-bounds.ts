/** Engineering support envelope, not a duplicate vehicle asset recipe. Actual scaled collision bounds are checked at admission. */
export const ADMISSION_BOUNDS=Object.freeze({maxFootprintDiagonalM:11.6,stopGapM:.5,routeGroupingGapM:12.5});
/** Authored lifecycle envelope, not a sampled road or permission to snap actor motion. */
export const MAX_BOUNDARY_EGRESS_M=7.5;
export interface FootprintSize {lengthM:number;widthM:number}
export function assertSupportedFootprint(size:FootprintSize,scale=1):void {
  if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(size.lengthM)||!Number.isFinite(size.widthM)||size.lengthM<0||size.widthM<0||Math.hypot(size.lengthM,size.widthM)*scale>ADMISSION_BOUNDS.maxFootprintDiagonalM+1e-9)throw new Error(`Collision footprint ${size.lengthM} x ${size.widthM} m at scale ${scale} exceeds the network's ${ADMISSION_BOUNDS.maxFootprintDiagonalM} m diagonal bound; use the generated asset collision dimensions and rebuild/review admission bounds before supporting larger actors.`);
}
