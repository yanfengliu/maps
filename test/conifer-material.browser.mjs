/** Render the actual crown and check both its silhouette and framebuffer depth. */
export async function verifyConiferMaterial(page, production) {
  return page.evaluate(({helpers, fragment}) => {
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
        uniform int mode;uniform vec2 clipZW;uniform float proxyY;
        out vec3 v_crownPoint;out vec3 v_crownRay;flat out vec3 v_crownFrame;
        void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);
          v_crownPoint=vec3((p.x-.5)*2.2,0.,p.y);v_crownRay=vec3(0,1,0);v_crownFrame=vec3(3,14,.371);
          gl_Position=vec4(p*2.-1.,0,1);
          if(mode!=0){
            v_crownPoint=vec3(0.,proxyY,.71);
            gl_Position=vec4((p*2.-1.)*clipZW.y,clipZW);
          }
        }`);
      compile(gl.FRAGMENT_SHADER, `#version 300 es
        precision highp float;precision highp int;uniform float facing;uniform int mode;out vec4 color;
        ${helpers}
        void main(){
          if(mode<=1){
            float dist;vec3 c,dir=v_crownRay*facing;
            if(!intersectCrown(v_crownPoint-dir*3.,dir,dist,c))discard;
            gl_FragDepth=gl_FragCoord.z;
            if(mode==0)color=vec4(dist/6.,c.g,c.b,1.);
            else{
              uint bits=floatBitsToUint(v_crownPoint.y+dist-3.);
              color=vec4((uvec4(bits)>>uvec4(0,8,16,24))&255u)/255.;
            }
            return;
          }
          float v_kind=mode==3?93.:0.;
          vec3 tint=vec3(1,0,0);
          ${fragment}
          color=vec4(tint,1.);
        }`);
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
      // Read one actual 3D foliage hit, then put an opaque plane immediately
      // before/behind its independently projected depth. Either proxy face
      // must produce the same visibility under MapLibre's custom depth range.
      gl.viewport(0,0,1,1);
      const mode=gl.getUniformLocation(program,'mode'), clip=gl.getUniformLocation(program,'clipZW');
      const proxy=gl.getUniformLocation(program,'proxyY');
      const draw=(kind,z,w)=>{gl.uniform1i(mode,kind);gl.uniform2f(clip,z,w);gl.drawArrays(gl.TRIANGLES,0,3);};
      const pixel=()=>{const p=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
      gl.uniform1f(gl.getUniformLocation(program,'facing'),1);
      gl.disable(gl.DITHER);
      gl.clear(gl.COLOR_BUFFER_BIT);draw(1,0,1);
      const hitY=new DataView(pixel().buffer).getFloat32(0,true);
      if(!(hitY<0&&hitY>-.8))throw Error('Expected the near surface of a real bough, got '+hitY);
      // clipZ = .8 + .45*y, clipW = 1 + .45*y. The production fragment
      // receives world displacement in metres, with a three-metre crown radius.
      const matrix=new Float32Array(16);matrix[6]=.15;matrix[7]=.15;
      gl.uniformMatrix4fv(gl.getUniformLocation(program,'u_matrix'),false,matrix);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);
      const occlusion=[];
      for(const [near,far] of [[0,1],[0,1-102*14/65536],[.1,.8]]){
        gl.depthRange(near,far);
        const hitNdc=(.8+.45*hitY)/(1+.45*hitY);
        const hitDepth=near+(far-near)*(.5+.5*hitNdc);
        for(const proxyY of [-.8,.8]){
          for(const offset of [-.00035,.00035]){
            gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
            draw(2,2*(hitDepth+offset-near)/(far-near)-1,1);
            gl.uniform1f(proxy,proxyY);
            draw(3,.8+.45*proxyY,1+.45*proxyY);
            const rgba=pixel(),visible=rgba[1]>0;
            if(rgba[3]!==255||visible!==(offset>0))throw Error('Incorrect conifer occlusion '+JSON.stringify({near,far,proxyY,offset,hitY,rgba:[...rgba]}));
            occlusion.push({near,far,proxyY,offset,visible});
          }
        }
      }
      if(gl.getError()!==gl.NO_ERROR)throw Error('WebGL error checking conifer depth');
      return {...result,hitY,occlusion};
    } finally {
      shaders.forEach(s=>gl.deleteShader(s));gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  },production);
}
