/** Cement stucco is continuous; never apply the generic sandstone block grid. */
export const HOOVER_FRAGMENT=`
  if(abs(v_kind-70.0)<0.1){
    float fade=1.0-smoothstep(0.01,0.06,max(fwidth(v_uv.x),fwidth(v_uv.y)));
    float grain=fract(sin(dot(floor(v_uv*115.0),vec2(12.9898,78.233)))*43758.5453)-0.5;
    tint*=1.0+grain*0.025*fade;
  }
`;
