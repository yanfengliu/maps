import type {LayerSpecification} from 'maplibre-gl';
import type * as GeoJSON from 'geojson';

export const CAMPUS_TRAFFIC_SOURCE='stanford-traffic-controls';
export const CAMPUS_STOP_ICON='stanford-control-stop';
export const CAMPUS_SIGNAL_ICON='stanford-control-signal';
export interface TrafficProperties {id:string;version:number;kind:'traffic-control';controlType:'stop'|'traffic_signals';placement:'road-control-point';physicalPoleVerified:false;directionStatus:'unknown'|'source-tagged';[key:string]:unknown}
export type CampusTrafficData=GeoJSON.FeatureCollection<GeoJSON.Point,TrafficProperties>;

/** Source regulatory locations stay unchanged. Physical stop-sign offsets and
 * uncertain facing are separately labeled estimates, never a pole survey. */
export function validateCampusTraffic(value:unknown,bounds:readonly number[]):CampusTrafficData {
  const data=value as CampusTrafficData,ids=new Set<string>();
  const bad=()=>new Error('Campus traffic controls contain invalid mapped regulatory points. Retry to reload the pinned road data.');
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw bad();
  for(const f of data.features){
    const p=f?.properties,c=f?.geometry?.coordinates;
    if(f?.type!=='Feature'||f.geometry?.type!=='Point'||!p||!/^node\/\d+$/.test(p.id)||ids.has(p.id)||!Number.isSafeInteger(p.version)||p.version<1||p.kind!=='traffic-control'||!['stop','traffic_signals'].includes(p.controlType)||p.placement!=='road-control-point'||p.physicalPoleVerified!==false||!['unknown','source-tagged'].includes(p.directionStatus)||!Array.isArray(c)||c.length!==2||!c.every(Number.isFinite)||c[0]<bounds[0]||c[0]>bounds[2]||c[1]<bounds[1]||c[1]>bounds[3])throw bad();
    ids.add(p.id);
  }
  return data;
}

/** Small deterministic map symbols, authored without remote sprites or a DOM. */
export function campusTrafficIcons(){
  const image=()=>({width:64,height:64,data:new Uint8Array(64*64*4)});
  const stop=image(),signal=image();
  const pixel=(img:ReturnType<typeof image>,x:number,y:number,color:readonly number[])=>img.data.set(color,(y*64+x)*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const dx=Math.abs(x-31.5),dy=Math.abs(y-31.5);
    if(Math.max(dx,dy)<29&&dx+dy<41){const rim=Math.max(dx,dy)>25||dx+dy>36;pixel(stop,x,y,rim?[250,248,238,255]:[173,51,43,255]);}
    if(x>=18&&x<=45&&y>=3&&y<=60)pixel(signal,x,y,[48,51,48,255]);
    for(const cy of [15,32,49])if((x-31.5)**2+(y-cy)**2<7**2)pixel(signal,x,y,[124,128,121,255]);
  }
  const glyphs=['01110100001000001110000010000111110','11111001000010000100001000010000100','01110100011000110001100011000101110','11110100011000111110100001000010000'];
  for(let letter=0;letter<glyphs.length;letter++)for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(glyphs[letter][row*5+col]==='1')for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++)pixel(stop,9+letter*12+col*2+xx,25+row*2+yy,[255,253,246,255]);
  return {[CAMPUS_STOP_ICON]:stop,[CAMPUS_SIGNAL_ICON]:signal};
}

export function campusTrafficLayer():LayerSpecification {
  return {id:'campus-traffic-controls',type:'symbol',source:CAMPUS_TRAFFIC_SOURCE,minzoom:17,filter:['==',['get','controlType'],'traffic_signals'],
    layout:{'icon-image':['match',['get','controlType'],'stop',CAMPUS_STOP_ICON,CAMPUS_SIGNAL_ICON],'icon-size':['interpolate',['linear'],['zoom'],17,.65,20,.9,24,1.1],'icon-anchor':'center','icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport','icon-allow-overlap':false,'icon-ignore-placement':false,'icon-padding':3},
    metadata:{description:'Mapped regulatory points; symbols do not assert physical pole positions, orientations or live signal states.'},
  };
}
