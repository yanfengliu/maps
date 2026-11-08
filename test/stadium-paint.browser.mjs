// Browser regression: pass the production STADIUM_FIELD_HELPERS/FRAGMENT to
// page.evaluate(checkStadiumPaint, {helpers, fragment}) in the headless QA run.
// Rendering at overview resolution catches detail that disappears with LOD.
export function checkStadiumPaint({helpers,fragment}) {
 const canvas=document.createElement('canvas');canvas.width=120;canvas.height=270;
 const gl=canvas.getContext('webgl2');if(!gl)throw new Error('WebGL2 unavailable');
 const shaders=[],program=gl.createProgram();
 try {
  const vertex=`#version 300 es
precision highp float;
out vec2 v_uv;
void main(){vec2 p=vec2((gl_VertexID==1||gl_VertexID==2)?1.0:-1.0,gl_VertexID>=2?1.0:-1.0);gl_Position=vec4(p,0,1);v_uv=p*vec2(24.384,54.864);}`;
  const pixel=`#version 300 es
precision highp float;
in vec2 v_uv;out vec4 outColor;
const float v_kind=32.0;const vec3 v_color=vec3(.28,.48,.22);
${helpers}
void main(){vec3 tint=v_color;${fragment}outColor=vec4(tint,1);}`;
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,pixel]]){
   const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);
  }
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);gl.drawArrays(gl.TRIANGLE_FAN,0,4);
  const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const counts={endzones:0,midfield:0,numbers:0};
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const px=((x+.5)/canvas.width*2-1)*24.384,py=((y+.5)/canvas.height*2-1)*54.864,i=(y*canvas.width+x)*4,[r,g,b]=pixels.slice(i,i+3),white=r>180&&g>180&&b>170;
   if(Math.abs(px)<18&&Math.abs(py)>47.3&&Math.abs(py)<52.7&&white)counts.endzones++;
   if(Math.abs(px)<2.5&&Math.abs(py)<3.5&&r>g*2&&r>70)counts.midfield++;
   const dy=Math.abs(py-Math.round(py/9.144)*9.144);
   if(Math.abs(px)>15.7&&Math.abs(px)<19.3&&Math.abs(py)<38&&dy>.8&&dy<1.4&&white)counts.numbers++;
  }
  if(counts.endzones<60||counts.midfield<20||counts.numbers<10)throw new Error('Field artwork disappears at stadium overview resolution: '+JSON.stringify(counts));
  const whiteAt=(x,y)=>{const i=(Math.floor((y/54.864+1)*.5*canvas.height)*canvas.width+Math.floor((x/24.384+1)*.5*canvas.width))*4;return pixels[i]>180&&pixels[i+1]>180&&pixels[i+2]>170;};
  // The F's long top bar and absent bottom bar distinguish an upright word
  // from a reflected word at both ends, independently of the shader formula.
  for(const end of [-1,1])if(!whiteAt(-end*3.071, end*47.599)||whiteAt(-end*3.071,end*52.501))throw new Error('End-zone lettering is reflected');
  return counts;
 } finally {for(const shader of shaders)gl.deleteShader(shader);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
