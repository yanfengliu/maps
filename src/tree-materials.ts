/** Shader-only foliage cutouts use local branch UVs, so folds share their mask.
 * Three-dimensional sprays supply parallax; these masks supply leaf-sized holes.
 * Fine holes merge before becoming subpixel. No image texture or alpha sorting. */
export const TREE_HELPERS=`
vec2 treeHash(vec2 p){
  vec3 q=fract(vec3(p.x,p.y,p.x)*vec3(.1031,.1030,.0973));
  q+=dot(q,q.yzx+33.33);
  return fract((q.xx+q.yz)*q.zy);
}
`;
export const TREE_FRAGMENT=`
  if(v_kind>89.9&&v_kind<95.1){
    vec2 p=v_uv;
    if(abs(v_kind-91.0)<.1){
      float along=p.y-2.0*floor(p.y*.5),leafId=floor(p.y*.5),side=abs(p.x);
      // A leaflet has its own swept center, changing length and tapered tip.
      // Opposite sides are staggered; there is no uniform horizontal strip.
      float rows=32.0+mod(leafId*7.0,11.0),sweep=5.0+1.7*sin(leafId);
      float phase=along*rows-side*sweep-side*side*(1.8+.6*sin(leafId))-(p.x<0.0?.43:0.0);
      float row=floor(phase),random=treeHash(vec2(row,leafId)).x;
      float length=.73+.25*random,tip=clamp((length-side)*4.5,0.0,1.0);
      float width=(.30+.11*random)*tip,strip=abs(fract(phase)-.5);
      float aa=max(fwidth(phase),.001),fine=1.0-smoothstep(.85,1.65,aa);
      float leaflet=1.0-smoothstep(width-aa*.28,width+aa*.28,strip);
      float rachis=1.0-smoothstep(.018,.035+fwidth(side),side);
      float base=1.0-smoothstep(.035,.10,along);
      // This coarser ragged edge survives the loss of individual leaflets.
      // Filtered fronds therefore never become the pointed carrier polygon.
      float edge=.80+.13*sin(along*31.0+leafId)*sin(along*13.0+leafId*.7);
      float envelope=1.0-smoothstep(edge-.025,edge+.025+fwidth(side)*.3,side);
      float coverage=mix(1.0,max(max(leaflet,rachis),base),fine)*envelope;
      if(coverage<.46)discard;
      tint*=mix(.94,.79+.24*random,fine);
      tint=mix(tint,tint*1.16,rachis*.65);
    }else if(abs(v_kind-92.0)<.1){
      float ray=p.x*13.0,aa=max(fwidth(ray),.002),fold=.5+.5*cos(ray*6.283185);
      tint*=1.0-.12*fold*(1.0-smoothstep(.35,1.1,aa));
    }else{
      float aa=max(fwidth(p.x),fwidth(p.y));
      if(abs(v_kind-95.0)<.1){
        vec2 diamond=vec2(p.x/.10+p.y/.16,p.x/.10-p.y/.16);
        vec2 f=abs(fract(diamond)-.5),w=max(fwidth(diamond),vec2(.002));
        float scar=max(smoothstep(.39-w.x,.47+w.x,f.x),smoothstep(.39-w.y,.47+w.y,f.y));
        tint*=1.0-scar*.19*(1.0-smoothstep(.06,.22,aa));
      }else{
        float groove=.5+.5*sin(p.x*91.0+sin(p.y*4.7)*.65);
        tint*=1.0-groove*.18*(1.0-smoothstep(.03,.12,aa));
      }
    }
  }
`;
