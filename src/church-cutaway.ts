import { projectLocal, type CampusData, type Point } from './building-geometry.ts';

// The existing material slot packs a whole-wall group in its hundreds digit.
// 0 is permanent structure; 1 east, 2 west, 3 entrance, 4 rear. The low two
// digits retain the original material, including photo/wood/stone shading.
export const WALL_KIND_STRIDE = 100;
export type WallMask = [number, number, number, number];
export function churchAxes(data: CampusData): [Point, Point] | undefined {
  const church=data.features.find(f=>f.properties?.id==='way/836474103');
  if(!church||church.geometry.type!=='Polygon')return;
  const ring=church.geometry.coordinates[0];
  let a=projectLocal(ring[0]),b=projectLocal(ring[ring.length-2]);
  if(a[0]>b[0])[a,b]=[b,a];
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const east:Point=[(b[0]-a[0])/length,(b[1]-a[1])/length];
  return [east,[east[1],-east[0]]];
}

/** Whole assemblies switch together; near edge-on walls do not obscure rooms.
 * At a top-down view there is no foreground wall to cut. */
export function churchWallMask(axes: [Point,Point] | undefined, bearing:number, pitch:number): WallMask {
  if(!axes||pitch<5)return [1,1,1,1];
  const angle=bearing*Math.PI/180,camera:Point=[-Math.sin(angle),-Math.cos(angle)];
  const [east,inward]=axes,side=camera[0]*east[0]+camera[1]*east[1],rear=camera[0]*inward[0]+camera[1]*inward[1];
  return [Number(side<=.18),Number(side>=-.18),Number(rear>=-.18),Number(rear<=.18)];
}
