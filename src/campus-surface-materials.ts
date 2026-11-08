/** Surface UVs are physical metres, aligned to a mapped feature edge. Detail
 * fades before subpixel patterns can shimmer; unverified surfaces stay plain. */
export const SURFACE_FRAGMENT=`
  if(v_kind>59.9&&v_kind<65.1){
    vec2 p=v_uv;
    float footprint=max(fwidth(p.x),fwidth(p.y));
    if(abs(v_kind-60.0)<.1){
      // Small rounded rectangular blocks visible in the close Quad reference.
      // Exact module and bond remain estimates rather than a paving survey.
      vec2 unit=vec2(.18,.20);
      float row=floor(p.y/unit.y);
      vec2 tiles=vec2(p.x/unit.x+mod(row,2.0)*.5,p.y/unit.y);
      vec2 q=abs((fract(tiles)-.5)*unit)-(unit*.5-vec2(.018));
      float block=length(max(q,vec2(0.0)))+min(max(q.x,q.y),0.0)-.014;
      float joint=smoothstep(-.002-footprint,.001+footprint,block);
      float fade=1.0-smoothstep(.07,.20,footprint);
      float variation=fract(sin(dot(floor(tiles),vec2(12.9898,78.233)))*43758.5453)-.5;
      tint*=1.0+(variation*.07-joint*.13)*fade;
    }else if(abs(v_kind-61.0)<.1){
      float grain=sin(p.x*93.0+sin(p.y*71.0))*sin(p.y*83.0);
      tint*=1.0+grain*.035*(1.0-smoothstep(.015,.07,footprint));
    }else if(abs(v_kind-62.0)<.1){
      // Subtle expansion joints; no traffic striping on pedestrian concrete.
      vec2 cell=fract(p/1.5);
      float edge=min(min(cell.x,1.0-cell.x),min(cell.y,1.0-cell.y))*1.5;
      float joint=1.0-smoothstep(.002,.006+footprint,edge);
      tint*=1.0-joint*.11*(1.0-smoothstep(.2,.6,footprint));
    }else if(abs(v_kind-64.0)<.1){
      float grain=sin(p.x*37.0)*sin(p.y*43.0);
      tint*=1.0+grain*.025*(1.0-smoothstep(.02,.08,footprint));
    }
  }
`;
