import type { PhysicalCrossing, PhysicalTactilePath, WorldPoint } from "../../src/world/network-data.ts";
import type { OsmElement } from "./osm.ts";

/** Preserve physical source facts independently of directed/split movement paths. */
export function physicalWalkingFacts(segments: {way:OsmElement;points:WorldPoint[]}[], drape:(points:WorldPoint[])=>WorldPoint[]): {crossings:PhysicalCrossing[];tactilePaths:PhysicalTactilePath[]} {
  const grouped=new Map<number,{way:OsmElement;paths:WorldPoint[][]}>();
  for(const segment of segments) {
    const record=grouped.get(segment.way.id)??{way:segment.way,paths:[]};
    const path=drape(segment.points),last=record.paths.at(-1);
    if(last&&Math.hypot(last.at(-1)!.x-path[0]!.x,last.at(-1)!.z-path[0]!.z)<.001)last.push(...path.slice(1));else record.paths.push(path);
    grouped.set(segment.way.id,record);
  }
  const crossings:PhysicalCrossing[]=[],tactilePaths:PhysicalTactilePath[]=[];
  for(const{way,paths}of grouped.values()) {
    const tags=way.tags!,marking=tags["crossing:markings"];
    if(tags.footway==="crossing") {
      const width=Number.parseFloat(tags.width??"");
      const markings=tags.crossing==="unmarked"||marking==="no"?"none":marking==="zebra"?"zebra":marking?"other":"unknown";
      const control=tags.crossing==="traffic_signals"||tags["crossing:signals"]==="yes"?"signals":tags.crossing==="uncontrolled"||tags["crossing:signals"]==="no"?"uncontrolled":"unknown";
      crossings.push({id:`osm:way:${way.id}:crossing`,source:"osm",sourceWayId:way.id,paths,markings,sourceMarkings:marking??(tags.crossing==="unmarked"?"crossing=unmarked":null),control,widthM:Number.isFinite(width)&&width>0?width:tags["crossing:scramble"]==="yes"?5:3,widthSource:Number.isFinite(width)&&width>0?"osm":"inferred"});
    }
    const followsTactile=/following the yellow tactile paving/i.test(tags.note??"");
    if(followsTactile||tags.tactile_paving==="yes")tactilePaths.push({id:`osm:way:${way.id}:tactile`,sourceWayId:way.id,paths,sourceReason:followsTactile?"source_note":"tactile_paving_tag",extent:followsTactile?"path":tags.footway==="crossing"?"endpoints":"unspecified"});
  }
  return {crossings,tactilePaths};
}
