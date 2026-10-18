/** Bound: one pinned directed source corridor is refused before any activation,
 * through all shared route consumers. The positive is authority-valid only;
 * these tests make no support, default-opening or performance claim. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it,vi} from 'vitest';
import {RouteLibrary,vehicleScale,type VehicleRouteBody} from '../src/agents/population/routes.ts';
import {RefusalCounts} from '../src/agents/population/status.ts';
import {vehicleEnvelope} from '../src/network/footprints.ts';
import {unreconciledVehicleCorridorReason,UNRECONCILED_VEHICLE_CORRIDOR} from '../src/agents/population/route-dispositions.ts';
import {createPopulation} from '../src/agents/population/tick.ts';
import {populationSettings} from '../src/agents/population/config.ts';
import {JunctionAdmissions} from '../src/network/admissions.ts';
import type {NetworkData} from '../src/world/network-data.ts';
import type {VehicleAssetManifest} from '../src/world/agent-assets.ts';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/unreconciled-vehicle-corridor.json',import.meta.url),'utf8')) as {inputs:{network:string;fleet:string};edgeIds:string[];authorityValidAlternative:string[]};
// Literal reviewed OLD / fresh1695 inputs; route/body expectations below stay unchanged.
const reviewedSourcePins: Record<string, readonly (readonly [number, string])[]> = {
  "data/network/network.json": [[10239410, "314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677"], [10301111, "1e558138fe8d6df9dfbf9df76d05c868d776fc9fbd8e018999e611d86a63d15f"]],
  "data/scene/agents/vehicles.json": [[4128, "5b29efc7977949db1611273c8fb294b3ab23a1a55c8f42316cad9b5309c94a01"], [4128, "83569d3bf6a41bbe6ae37edcc6bcad212615f4c69e76ca1b6714d8001f6deb9f"]],
};
function pinned<T>(path: string, originalSha256: string): T {
  const pins = reviewedSourcePins[path];
  if (!pins || originalSha256 !== pins[0]![1]) throw Error(`Unreviewed fixture source identity for ${path}; restore the original reviewed route fixture.`);
  const bytes = readFileSync(new URL(`../${path}`, import.meta.url));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (!pins.some(([size, digest]) => bytes.length === size && sha256 === digest)) throw Error(`Unreviewed ${path}: ${bytes.length} bytes / ${sha256}; restore reviewed OLD or fresh1695 source bytes.`);
  return JSON.parse(bytes.toString()) as T;
}
const network=pinned<NetworkData>('data/network/network.json',fixture.inputs.network),fleet=pinned<VehicleAssetManifest>('data/scene/agents/vehicles.json',fixture.inputs.fleet);
const bodyFor=(i=0):VehicleRouteBody=>({asset:fleet.vehicles[i]!,scale:vehicleScale(()=>1,fleet.vehicles[i]!),laneIndex:0,frame:'population-upright'});
describe('unreconciled source corridor admission',()=>{
 it('pins a real complete directed candidate, retaining source geometry',()=>{const byId=new Map(network.lanes.map(e=>[e.id,e]));expect(network.portals.vehicleEntry).toContain(fixture.edgeIds[0]);expect(network.portals.vehicleExit).toContain(fixture.edgeIds.at(-1));for(let i=1;i<fixture.edgeIds.length;i++)expect(byId.get(fixture.edgeIds[i-1]!)!.nextIds).toContain(fixture.edgeIds[i]);const before=JSON.stringify(network);for(let i=0;i<fleet.vehicles.length;i++){const counts=new RefusalCounts(),library=new RouteLibrary(network,counts),attempt=library.validateVehicleCandidate(fixture.edgeIds,bodyFor(i));expect(attempt.route).toBeNull();expect(attempt.reason).toContain(UNRECONCILED_VEHICLE_CORRIDOR.id);expect(counts.snapshot()).toHaveLength(1);expect(counts.snapshot()[0]!.count).toBe(1);}expect(JSON.stringify(network)).toBe(before);});
 it('uses the same refusal and exact ledger in portal screening and final planning',()=>{const counts=new RefusalCounts(),library=new RouteLibrary(network,counts),body=bodyFor(),request={footprintRadiusM:vehicleEnvelope(body.asset,body.scale).diameter/2,maxEdges:120,walkAttempts:3,vehicleBody:body},walk=vi.spyOn(library as unknown as {walk:(...args:unknown[])=>string[]|null},'walk').mockReturnValue([...fixture.edgeIds]);try{expect(library.drivablePortals(library.vehicleGraph,[fixture.edgeIds[0]!],request)).toEqual([]);expect(counts.snapshot()[0]!.count).toBe(3);expect(library.route('vehicle',0,1,fixture.edgeIds[0]!,request)).toBeNull();expect(counts.snapshot()[0]!.count).toBe(6);expect(library.refused).toBe(6);}finally{walk.mockRestore();}});
 it('preserves a refusal even when a later unchanged-policy candidate passes',()=>{const counts=new RefusalCounts(),library=new RouteLibrary(network,counts),body=bodyFor(),walk=vi.spyOn(library as unknown as {walk:(...args:unknown[])=>string[]|null},'walk').mockReturnValueOnce([...fixture.edgeIds]).mockReturnValue([...fixture.authorityValidAlternative]);try{const result=library.planFrom(library.vehicleGraph,'vehicle',fixture.edgeIds[0]!,5970698,{footprintRadiusM:vehicleEnvelope(body.asset,body.scale).diameter/2,maxEdges:120,walkAttempts:3,vehicleBody:body});expect(result.route?.edgeIds).toEqual(fixture.authorityValidAlternative);expect(counts.snapshot()).toHaveLength(1);expect(counts.snapshot()[0]!.count).toBe(1);}finally{walk.mockRestore();}});
 it('retains the refusal for changed source and does not confuse nearby source identities',()=>{const changed=structuredClone(network);changed.provenance.osmSha256='0'.repeat(64);const selected=network.lanes.filter(e=>fixture.edgeIds.includes(e.id));expect(unreconciledVehicleCorridorReason(changed,selected)).toContain('changed source still awaiting reconciliation');expect(unreconciledVehicleCorridorReason(network,selected.map(e=>({...e,id:e.id.replaceAll('41857228:1:','418572280:1:')})))).toBeNull();});
 it('reports the refused corridor in an ordinary fixed-step population without hidden demand',()=>{const population=createPopulation({network,fleet,admissions:new JunctionAdmissions(network),settings:populationSettings({pedestrians:0,vehicles:6})});try{for(let t=1;t<=120;t++)population.update(1/60,t/60);const status=population.status();expect(status.vehicles.requested).toBe(6);expect(status.vehicles.active+status.vehicles.waiting).toBe(6);expect(status.refusedRoutes.some(r=>r.reason.includes(UNRECONCILED_VEHICLE_CORRIDOR.id)&&r.count>0)).toBe(true);for(let slot=0;slot<6;slot++){const route=population.vehicleRoute(slot);if(route)expect(unreconciledVehicleCorridorReason(network,route.edges as NetworkData['lanes'])).toBeNull();}expect(status.authorityViolations).toBe(0);}finally{population.dispose();}});
});
