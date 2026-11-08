/** Continuous world-metre noise and coverage-filtered botanical marks avoid
 * visible polygon triangulation and subpixel blade/flower shimmer. These are
 * authored material scales, not measured grass species or planting spacing. */
export const LANDSCAPE_HELPERS=`
float landscapeHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float landscapeNoise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(landscapeHash(i),landscapeHash(i+vec2(1,0)),f.x),mix(landscapeHash(i+vec2(0,1)),landscapeHash(i+vec2(1,1)),f.x),f.y);
}
`;
export const LANDSCAPE_FRAGMENT=`
if(v_kind>79.9&&v_kind<84.1){
 vec2 p=v_uv;float footprint=max(fwidth(p.x),fwidth(p.y));
 float broad=landscapeNoise(p*.075),variation=landscapeNoise(p*.73);
 if(abs(v_kind-80.0)<.1){
  // Soft variation follows the lawn, never the mesh's large triangles.
  tint*=.91+.12*broad+.08*variation;
  float fine=landscapeNoise(p*9.0)-.5;
  tint+=vec3(.045,.055,.027)*fine*(1.0-smoothstep(.035,.14,footprint));
  vec2 cell=floor(p/.085),q=fract(p/.085)-.5;
  float seed=landscapeHash(cell),angle=seed*6.2831853;
  vec2 axis=vec2(cos(angle),sin(angle)),across=vec2(-axis.y,axis.x);
  float along=dot(q,axis),side=dot(q,across)+along*along*(seed-.5);
  float blade=(1.0-smoothstep(.035,.075+footprint/.085,abs(side)))*(1.0-smoothstep(.12,.40,abs(along)));
  tint+=vec3(.055,.078,.031)*blade*(1.0-smoothstep(.025,.075,footprint));
 }else if(abs(v_kind-84.0)<.1){
  float leaves=landscapeNoise(p*11.0);
  tint*=.88+.18*variation+.12*leaves*(1.0-smoothstep(.03,.12,footprint));
 }else{
  // Separate petal heads sit among foliage, with offset clusters instead of a
  // flat red/white carpet. Average bloom coverage persists at map distances.
  float spacing=abs(v_kind-83.0)<.1?.48:.24;
  vec2 cell=floor(p/spacing),q=fract(p/spacing)-.5;
  float seed=landscapeHash(cell);q-=vec2(seed-.5,landscapeHash(cell+17.3)-.5)*.66;
  float radius=length(q),angle=atan(q.y,q.x)+seed*6.2831853;
  float petal=.26+.055*cos(angle*5.0),aa=max(footprint/spacing,.008);
  float bloom=1.0-smoothstep(petal-aa,petal+aa,radius);
  vec3 flower=v_color*(.88+.22*seed),foliage=vec3(.25,.34,.17)*(.84+.22*variation);
  if(abs(v_kind-83.0)<.1)flower=mix(vec3(.78,.12,.18),vec3(.88,.87,.73),step(.55,seed));
  float center=1.0-smoothstep(.035,.065+aa,radius);
  vec3 closeColor=mix(foliage,flower,bloom);closeColor=mix(closeColor,vec3(.63,.48,.20),center*.48);
  vec3 distant=mix(foliage,v_color,.68);
  if(abs(v_kind-83.0)<.1)distant=mix(foliage,vec3(.72,.46,.44),.60);
  tint=mix(closeColor,distant,smoothstep(spacing*.12,spacing*.55,footprint));
 }
}
`;
