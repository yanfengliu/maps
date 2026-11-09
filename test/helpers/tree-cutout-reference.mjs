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
  return 1;
}
