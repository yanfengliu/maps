// CPU reference for the analytical masks in tree-materials.ts. This detects
// coverage regressions and enables diagnostic ray probes; native GLSL pixels
// remain the acceptance oracle (GPU float rounding and derivatives differ).
const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const hash=([x,y])=>{
  const q=[fract(x*.1031),fract(y*.1030),fract(x*.0973)],dot=q[0]*(q[1]+33.33)+q[1]*(q[2]+33.33)+q[2]*(q[0]+33.33);
  for(let i=0;i<3;i++)q[i]+=dot;
  return [fract((q[0]+q[1])*q[2]),fract((q[0]+q[2])*q[1])];
};
const width=(gradient,dx,dy)=>Math.abs(gradient[0]*dx[0]+gradient[1]*dx[1])+Math.abs(gradient[0]*dy[0]+gradient[1]*dy[1]);
export function treeCutoutCoverage(uv,kind,dx=[.001,0],dy=[0,.001]){
  let [x,y]=uv;
  if(kind===91){
    const id=Math.floor(y*.5),along=y-id*2,side=Math.abs(x),rows=32+(id*7)%11,sweep=5+1.7*Math.sin(id),curve=1.8+.6*Math.sin(id),phase=along*rows-side*sweep-side*side*curve-(x<0?.43:0);
    const random=hash([Math.floor(phase),id])[0],length=.73+.25*random,tip=Math.max(0,Math.min(1,(length-side)*4.5)),w=(.30+.11*random)*tip;
    const aa=Math.max(width([-Math.sign(x)*(sweep+2*side*curve),rows],dx,dy),.001),fine=1-smooth(.85,1.65,aa),leaflet=1-smooth(w-aa*.28,w+aa*.28,Math.abs(fract(phase)-.5));
    const rachis=1-smooth(.018,.035+width([Math.sign(x),0],dx,dy),side),base=1-smooth(.035,.10,along),edge=.80+.13*Math.sin(along*31+id)*Math.sin(along*13+id*.7),envelope=1-smooth(edge-.025,edge+.025+width([Math.sign(x),0],dx,dy)*.3,side);
    return mix(1,Math.max(leaflet,rachis,base),fine)*envelope;
  }
  if(kind===93){
    const id=Math.floor((y+1.001)*.25);y-=id*4;
    const along=(y+1)*.5,side=Math.abs(x),phase=along*8-side*2.8-side*side*.7+(x<0?.37:0)+Math.sin(id)*.4;
    const aa=Math.max(width([-Math.sign(x)*(2.8+side*1.4),4],dx,dy),.001),fine=1-smooth(.7,1.6,aa),twiglets=1-smooth(.25-aa*.25,.37+aa*.25,Math.abs(fract(phase)-.5));
    const fw=width([Math.sign(x),0],dx,dy),stem=1-smooth(.035,.065+fw*.3,side),edge=.80+.12*Math.sin(along*25+id)*Math.sin(along*11+id*.3),outline=1-smooth(edge-.025,edge+.025+fw*.3,side);
    return Math.max(stem,mix(1,twiglets,fine))*outline;
  }
  if(kind!==90)return 1;
  const id=Math.floor((y+1.001)*.25);y-=id*4;
  const r=Math.hypot(x,y*.93),edge=.83+.075*Math.sin(x*8.7+id*1.3)*Math.sin(y*7.1-id)+.045*Math.sin(x*16.3+y*10.1+id);
  const aa=Math.max(width(r?[x/r,y*.93*.93/r]:[0,0],dx,dy),.001),envelope=1-smooth(edge-aa*.3,edge+aa*.3,r);
  const holes=Math.sin(x*9.1+id*2.1)*Math.sin(y*8.3-id*.6)+.28*Math.sin(x*17-y*12+id);
  const holeFade=1-smooth(.06,.18,Math.max(width([1,0],dx,dy),width([0,1],dx,dy))),air=1-smooth(.69,.94,holes)*holeFade;
  const scale=kind===93?[14,21]:[21,19],q=[x*scale[0],y*scale[1]],cell=q.map(Math.floor),footprint=Math.max(Math.hypot(dx[0]*scale[0],dx[1]*scale[1]),Math.hypot(dy[0]*scale[0],dy[1]*scale[1]));
  let coverage=0;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
    const c=[cell[0]+i,cell[1]+j],h=hash(c.map(v=>v+id*17.13)),center=c.map((v,k)=>v+.5+(h[k]-.5)*.7),a=h[0]*6.283185,d=q.map((v,k)=>v-center[k]),radius=kind===93?[.90,.29]:[.69,.45];
    const local=[d[0]*Math.cos(a)-d[1]*Math.sin(a),d[0]*Math.sin(a)+d[1]*Math.cos(a)],shape=Math.hypot(local[0]/radius[0],local[1]/radius[1]),edge=Math.max(.03,footprint*.32);
    coverage=Math.max(coverage,1-smooth(1-edge,1+edge,shape));
  }
  return envelope*air*mix(1,coverage,1-smooth(.32,1.05,footprint));
}
