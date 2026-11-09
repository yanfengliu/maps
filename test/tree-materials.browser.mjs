/** Execute the production GLSL, not the CPU reference mask. Own this temporary
 * context independently of the map and release all its resources even on failure. */
export async function verifyTreeMaterials(page,shaders){
  return page.evaluate(({helpers,fragment})=>{
    const canvas=new OffscreenCanvas(256,256),gl=canvas.getContext('webgl2',{antialias:false,preserveDrawingBuffer:true});
    if(!gl)throw Error('Tree material verification requires native WebGL2');
    const resources=[],records=[];
    const compile=(type,source)=>{const s=gl.createShader(type);resources.push(['shader',s]);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const makeProgram=cutout=>{
      const program=gl.createProgram();resources.push(['program',program]);
      gl.attachShader(program,compile(gl.VERTEX_SHADER,`#version 300 es
        precision highp float;
        uniform vec4 region;uniform float kind;
        out vec2 v_uv;flat out float v_kind;
        void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);v_uv=mix(region.xy,region.zw,p);v_kind=kind;gl_Position=vec4(p*2.-1.,0,1);}`));
      gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`#version 300 es
        precision highp float;
        in vec2 v_uv;flat in float v_kind;out vec4 color;
        ${helpers}
        void main(){vec3 tint=vec3(1);${cutout?fragment:''}color=vec4(tint,1);}`));
      gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));return program;
    };
    const sample=(program,kind,id)=>{
      gl.useProgram(program);gl.uniform1f(gl.getUniformLocation(program,'kind'),kind);
      const y=id*(kind===91?2:4),region=kind===91?[-.8,.15+y,.8,.85+y]:[-.6,-.6+y,.6,.6+y];
      gl.uniform4fv(gl.getUniformLocation(program,'region'),region);gl.viewport(0,0,256,256);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
      const pixels=new Uint8Array(256*256*4);gl.readPixels(0,0,256,256,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      if(gl.getError()!==gl.NO_ERROR)throw Error('Tree material draw failed');
      const cells=new Array(16).fill(0);let rachis=0;
      for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(pixels[(y*256+x)*4+3]){cells[Math.floor(y/64)*4+Math.floor(x/64)]++;if(x===128)rachis++;}
      return {kind,id,ratios:cells.map(n=>n/4096),rachis:rachis/256};
    };
    try{
      const program=makeProgram(true),solid=makeProgram(false);
      for(const kind of [90,91,93])for(const id of [0,2,5]){
        const r=sample(program,kind,id);records.push(r);
        if(!r.ratios.every(n=>n>.15&&n<.96))throw Error('Production leaf coverage is empty or solid: '+JSON.stringify(r));
        if(kind===91&&r.rachis<.95)throw Error('Production frond rachis is disconnected');
      }
      const control=sample(solid,90,0);
      if(!control.ratios.every(n=>n===1))throw Error('Solid negative control did not paint the same region');
      return {pass:true,records,solidControlRejected:!control.ratios.every(n=>n>.15&&n<.96)};
    }finally{
      for(const [type,r] of resources.reverse())if(type==='shader')gl.deleteShader(r);else gl.deleteProgram(r);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  },shaders);
}
