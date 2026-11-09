/** Shader-only foliage cutouts use local branch UVs, so folds share their mask.
 * Three-dimensional sprays supply parallax; these masks supply leaf-sized holes.
 * Fine holes merge before becoming subpixel. No image texture or alpha sorting. */
export const TREE_HELPERS=`
vec2 treeHash(vec2 p){
  vec3 q=fract(vec3(p.x,p.y,p.x)*vec3(.1031,.1030,.0973));
  q+=dot(q,q.yzx+33.33);
  return fract((q.xx+q.yz)*q.zy);
}
vec2 treeLeafCoverage(vec2 p,float id,bool needle){
  vec2 scale=needle?vec2(14.0,21.0):vec2(21.0,19.0),q=p*scale,cell=floor(q);
  float coverage=0.0,light=1.0,footprint=max(length(dFdx(q)),length(dFdy(q)));
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 c=cell+vec2(x,y),h=treeHash(c+id*17.13),center=c+.5+(h-.5)*.7;
    float angle=h.x*6.283185,cs=cos(angle),sn=sin(angle);
    vec2 d=q-center,local=vec2(d.x*cs-d.y*sn,d.x*sn+d.y*cs);
    vec2 radius=needle?vec2(.90,.29):vec2(.69,.45);
    float shape=length(local/radius),edge=max(.03,footprint*.32);
    float leaf=1.0-smoothstep(1.0-edge,1.0+edge,shape);
    if(leaf>coverage){coverage=leaf;light=.79+.25*h.y+.11*(1.0-shape);}
  }
  float fine=1.0-smoothstep(.32,1.05,footprint);
  return vec2(mix(1.0,coverage,fine),mix(1.0,light,fine));
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
    }else if(abs(v_kind-93.0)<.1){
      float id=floor((p.y+1.001)*.25);p.y-=id*4.0;
      float along=(p.y+1.0)*.5,side=abs(p.x);
      float phase=along*8.0-side*2.8-side*side*.7+(p.x<0.0?.37:0.0)+sin(id)*.4;
      float aa=max(fwidth(phase),.001),fine=1.0-smoothstep(.7,1.6,aa);
      float twiglets=1.0-smoothstep(.25-aa*.25,.37+aa*.25,abs(fract(phase)-.5));
      float stem=1.0-smoothstep(.035,.065+fwidth(side)*.3,side);
      float edge=.80+.12*sin(along*25.0+id)*sin(along*11.0+id*.3);
      float outline=1.0-smoothstep(edge-.025,edge+.025+fwidth(side)*.3,side);
      float coverage=max(stem,mix(1.0,twiglets,fine))*outline;
      if(coverage<.46)discard;
      tint*=.91+.08*sin(along*17.0+id);
    }else if(abs(v_kind-90.0)<.1){
      float id=floor((p.y+1.001)*.25);p.y-=id*4.0;
      bool needle=false;
      // Large lobes stay present at every distance. The narrower leaf holes
      // fade independently, preventing a distant card from turning rectangular.
      float r=length(p*vec2(1.0,.93));
      float edge=.83+.075*sin(p.x*8.7+id*1.3)*sin(p.y*7.1-id)+.045*sin(p.x*16.3+p.y*10.1+id);
      float aa=max(fwidth(r),.001),envelope=1.0-smoothstep(edge-aa*.3,edge+aa*.3,r);
      float holes=sin(p.x*9.1+id*2.1)*sin(p.y*8.3-id*.6)+.28*sin(p.x*17.0-p.y*12.0+id);
      float holeFade=1.0-smoothstep(.06,.18,max(fwidth(p.x),fwidth(p.y)));
      float air=1.0-smoothstep(.69,.94,holes)*holeFade;
      vec2 leaves=treeLeafCoverage(p,id,needle);
      if(envelope*air*leaves.x<.46)discard;
      float clusters=.95+.06*sin(p.x*4.0+id)*sin(p.y*3.8-id);
      tint*=leaves.y*clusters;
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
