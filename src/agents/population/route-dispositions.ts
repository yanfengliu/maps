/** A reviewed source defect, held out before route activation until it is reconciled.
 * This disposition is not road support for any other route and does not repair a turn.
 */
import type { NetworkEdge, NetworkData } from '../../world/network-data.ts';

export const UNRECONCILED_VEHICLE_CORRIDOR = Object.freeze({
  id: 'shibuya-41857228-forward-unreconciled',
  laneFamily: 'lane:41857228:1:0:ground0:f:0',
  sourceWayId: 41857228,
  evidence: Object.freeze({
    network: '314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677',
    osm: '9923a9ae93afbc73f82332bb5a03f06f76ed587cbc143541158d4c192b4b8671',
    roads: '0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc',
    buildingLeaf: '8de4fcb545fb8a66c8049313e80afd73be6b0571f29051b4e2dd7c2c1c6aef80',
  }),
});

/** Stable source identity is retained across graph splitting. Changed source does
 * not silently revoke a known refusal: reconciliation needs its own reviewed change.
 */
export function unreconciledVehicleCorridorReason(network: NetworkData, edges: readonly NetworkEdge[]): string | null {
  const policy = UNRECONCILED_VEHICLE_CORRIDOR;
  const member = (id: string): boolean => id === policy.laneFamily || id.startsWith(`${policy.laneFamily}:section`);
  const affected = edges.find(edge => member(edge.id) || (edge.id.startsWith('turn:') && member(edge.id.split('>')[1] ?? '')));
  if (!affected) return null;
  const source = network.provenance.osmSha256 === policy.evidence.osm ? 'reviewed source' : 'changed source still awaiting reconciliation';
  return `Vehicle corridor ${policy.id} refuses ${affected.id} (${source}): the original outgoing corridor loses displayed road support and its tested body envelopes intersect current buildings. Reconcile complete driving support and obstacle clearance before admitting this corridor; refusal does not repair the backwards turn.`;
}
