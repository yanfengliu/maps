import type { PopulationSettings } from './population/config.js';
interface Binding { url: string; sha256: string }
declare const __MAPS_LOCAL_WALK__: Binding | null;
export const LOCAL_WALK_BINDING: Binding | null = typeof __MAPS_LOCAL_WALK__ === 'undefined' ? null : __MAPS_LOCAL_WALK__;
export function localWalkRequested(query: URLSearchParams,seed:number,population: Readonly<Pick<PopulationSettings, 'pedestrians' | 'vehicles'>>):boolean {
  const value=query.get('local-walk');
  if(value===null)return Boolean(LOCAL_WALK_BINDING&&seed===5970698&&population.pedestrians+population.vehicles===0&&!['agents','pedestrians','vehicles'].some(key=>query.has(key)));
  if(value!=='1'||!LOCAL_WALK_BINDING)throw Error('The local walker requires ?local-walk=1 and its admitted packet. Run npm run data:local-walk after restoring the reviewed cached prerequisites.');
  if(seed!==5970698)throw Error('The local walker requires its retained seed 5970698.');
  if(population.pedestrians+population.vehicles>0)throw Error(`The one-actor local walker cannot coexist with ${population.pedestrians} generic pedestrians and ${population.vehicles} generic vehicles. Remove population overrides or request zero pedestrians and zero vehicles.`);
  return true;
}
