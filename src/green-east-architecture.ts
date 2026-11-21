export const GREEN_EAST_ID = 'way/232805660';
export const GREEN_EAST_DESCRIPTION = 'Green Library’s East Wing has three aboveground stories and a basement. Its precast bands, metal-framed ribbon windows and tiled hips follow Stanford’s survey and exterior photograph. The staggered upper roof fields follow 2022 aerial imagery. The 12 m source height, pitches, roof levels and facade spacing are estimates.';

/** Facade UVs span estimated structural bays and three documented storeys.
 * Broad concrete spandrels separate dark continuous glazing, with a narrow
 * bevel shadow at the sill and closely spaced metal mullions within each bay.
 * The upper roof fields carry the single gridded rectangle visible in NAIP.
 */
export const GREEN_EAST_FRAGMENT = `
  if(abs(v_kind-53.0)<.1){
    vec2 p=fract(v_uv), aa=max(fwidth(v_uv),vec2(.001));
    float pane=smoothstep(.26,.26+aa.y,p.y)*(1.0-smoothstep(.89-aa.y,.89,p.y));
    float pier=smoothstep(.025,.025+aa.x,min(p.x,1.0-p.x));
    float bars=abs(fract(v_uv.x*4.0+.5)-.5);
    float mullion=1.0-smoothstep(.014,.014+aa.x*4.0,bars);
    vec3 glass=mix(vec3(.27,.30,.29),vec3(.17,.21,.23),p.y);
    float detail=1.0-smoothstep(.12,.4,aa.x);
    tint=mix(tint,glass*(1.0-.28*mullion*detail),pier*pane*(1.0-smoothstep(.22,.65,aa.y)));
    float sill=smoothstep(.17,.17+aa.y,p.y)*(1.0-smoothstep(.24,.24+aa.y,p.y));
    tint*=1.0+.09*sill;
  }else if(abs(v_kind-54.0)<.1){
    vec2 p=v_uv-vec2(25.2,16.1), size=vec2(5.3,8.6), aa=max(fwidth(v_uv),vec2(.01));
    vec2 edge=min(p,size-p);
    float opening=smoothstep(-aa.x,aa.x,edge.x)*smoothstep(-aa.y,aa.y,edge.y);
    float frame=1.0-smoothstep(.04,.04+aa.x,abs(fract(p.x/.94+.5)-.5)*.94);
    tint=mix(tint,mix(vec3(.39,.45,.47),vec3(.61,.62,.59),frame),opening);
  }
`;
