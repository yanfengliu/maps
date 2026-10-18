/** Exact selected actor/route construction recovered from241; no generic routing. */
import {placeOnCorridor,populationActorRng} from '../../../src/agents/population/routes.ts';
import {createRouteVisits} from '../../../src/network/halts.ts';
import {readPinned} from './paths.mjs';
import {inputProfile} from './profile.mjs';
export function createRetainedRoute(project:string,profile="historical") {
const network=JSON.parse(readPinned(project,inputProfile(profile).networkInput).toString()),slot=0,generation=1,seed=5970698;
const rng=populationActorRng(seed,'pedestrian',slot,generation);rng();
const scale=Math.fround(.92+rng()*.16),variant=Math.floor(rng()*3);
if(variant!==2||scale!==1.0391258001327515)throw Error('Normal actor stream differs from the accepted241 actor.');
function actorSeed(sceneSeed:number,kind:string,slot:number,generation:number) {
  let state=(sceneSeed^0x9e3779b9)>>>0;
  const mix=(value:number)=>{state=(state^(value+0x9e3779b9+(state<<6)+(state>>>2)))>>>0;state=Math.imul(state^(state>>>15),0x85ebca6b)>>>0;state=(state^(state>>>13))>>>0;};
  mix(kind==='vehicle'?0x56_48:0x50_45);mix(slot>>>0);mix(generation>>>0);return state>>>0;
}
const ids=['walk:664532523:1:0:ground0:f','walk:664532523:1:0:ground0:r','walk:664532523:1:0:ground0:f'];
const edges=ids.map(id=>network.walks.find((edge:any)=>edge.id===id));
if(edges.some(edge=>!edge))throw Error('Retained local route requires all three reviewed source occurrences');
const starts:number[]=[];let totalLengthM=0;for(const edge of edges){starts.push(totalLengthM);totalLengthM+=edge.lengthM;}
const route=placeOnCorridor({entryEdgeId:ids[0]!,edgeIds:ids,edges,starts,totalLengthM,speedLimits:[1.1,1.1,1.1],passages:createRouteVisits(network,'pedestrian',ids),gates:[]},'pedestrian',actorSeed(0,'pedestrian',slot,generation),.25*scale);
if(route.lateralOffsetsM![0]!==.79562462540758)throw Error('Seeded local offset differs from the accepted241 actor.');
return {network,route,scale};
}
