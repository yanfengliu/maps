/** Insert inside the existing fragment main after tint is initialized. */
export const GARAGE_FRAGMENT=`
  if(abs(v_kind-40.0)<0.1){
    float footprint=max(fwidth(v_uv.x),fwidth(v_uv.y));
    float fade=1.0-smoothstep(.04,.20,footprint);
    float aggregate=sin(v_uv.x*47.0+sin(v_uv.y*31.0))*sin(v_uv.y*53.0)*.025*fade;
    tint+=aggregate;
  }
  if(abs(v_kind-41.0)<0.1){
    // Concrete only: finite, circulation-aware markings are authored geometry.
    // A repeating shader cannot respect ramp wells or end turning aisles.
    float fade=1.0-smoothstep(.04,.2,max(fwidth(v_uv.x),fwidth(v_uv.y)));
    tint+=sin(v_uv.x*43.0)*sin(v_uv.y*37.0)*.012*fade;
  }
  if(abs(v_kind-42.0)<0.1){
    float aa=fwidth(v_uv.y),slat=abs(fract(v_uv.y/.24)-.5);
    float lines=1.0-smoothstep(.12,.12+aa/.24,slat);
    tint=mix(tint,vec3(.24,.29,.28),lines*.7);
  }
`;
