/** Sample the production volume from both sides with orthographic rays. */
export async function verifyConiferMaterial(page, helpers) {
  return page.evaluate(helpers => {
    const size = 144, canvas = new OffscreenCanvas(size, size);
    const gl = canvas.getContext('webgl2', { antialias: false });
    if (!gl) throw Error('Conifer material check needs WebGL 2');
    const program = gl.createProgram(), shaders = [];
    function compile(type, source) {
      const shader = gl.createShader(type);
      shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
    }
    try {
      compile(gl.VERTEX_SHADER, `#version 300 es
        precision highp float;
        out vec3 v_crownPoint;out vec3 v_crownRay;flat out vec3 v_crownFrame;
        void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);
          v_crownPoint=vec3((p.x-.5)*2.2,0.,p.y);v_crownRay=vec3(0,1,0);v_crownFrame=vec3(3,14,.371);
          gl_Position=vec4(p*2.-1.,0,1);}`);
      compile(gl.FRAGMENT_SHADER, `#version 300 es
        precision highp float;uniform float facing;out vec4 color;
        ${helpers}
        void main(){float dist;vec3 c,dir=v_crownRay*facing;
          if(!intersectCrown(v_crownPoint-dir*3.,dir,dist,c)) discard;
          color=vec4(dist/6.,c.g,c.b,1.);}`);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program); gl.viewport(0,0,size,size);
      const view = facing => {
        gl.uniform1f(gl.getUniformLocation(program,'facing'),facing);
        gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
        const pixels = new Uint8Array(size*size*4);
        gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        return pixels;
      };
      const front=view(1),back=view(-1);
      let filled=0,shared=0,thick=0,union=0;
      for(let i=0;i<front.length;i+=4){
        const a=front[i+3]>0,b=back[i+3]>0;
        if(a)filled++;
        if(a||b)union++;
        if(a&&b){
          shared++;
          // Distances from opposite origins (six units apart) leave the
          // interval occupied by opaque foliage along this same ray.
          if(6-(front[i]+back[i])*6/255>.09)thick++;
        }
      }
      const result={coverage:filled/(size*size),silhouetteAgreement:shared/union,volume:thick/shared};
      if(result.coverage<.1||result.coverage>.7||result.silhouetteAgreement<.9||result.volume<.65)
        throw Error('Crown lost its open silhouette or spatial depth: '+JSON.stringify(result));
      return result;
    } finally {
      shaders.forEach(s=>gl.deleteShader(s));gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  },helpers);
}
