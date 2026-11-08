/** Insert inside the existing fragment main after tint is initialized. */
export const GARAGE_FRAGMENT=`
  if(abs(v_kind-40.0)<0.1){
    float footprint=max(fwidth(v_uv.x),fwidth(v_uv.y));
    float fade=1.0-smoothstep(.04,.20,footprint);
    float aggregate=sin(v_uv.x*47.0+sin(v_uv.y*31.0))*sin(v_uv.y*53.0)*.025*fade;
    tint+=aggregate;
  }
  if(abs(v_kind-41.0)<0.1){
    vec2 p=v_uv;float aa=max(fwidth(p.x),fwidth(p.y));
    float stripe=abs(mod(p.y+1.3,2.6)-1.3);
    float row=mod(p.x+8.0,16.0);
    float parking=step(row,5.0)+step(11.0,row);
    float line=(1.0-smoothstep(.045,.045+aa,stripe))*min(parking,1.0);
    float baseline=min(abs(row-5.0),abs(row-11.0));
    line=max(line,1.0-smoothstep(.045,.045+aa,baseline));
    float fade=1.0-smoothstep(.3,.9,aa);
    tint=mix(tint,vec3(.85,.74,.41),line*fade*.85);
    // Direction arrows in the driving aisle use the same metre axes as stalls.
    vec2 arrow=vec2(row-8.0,mod(p.y+9.0,18.0)-9.0);
    float shaft=step(abs(arrow.x),.16)*step(abs(arrow.y+.25),.8);
    float head=step(abs(arrow.x),max(0.0,.8-arrow.y))*step(.0,arrow.y)*step(arrow.y,.8);
    tint=mix(tint,vec3(.87,.75,.39),max(shaft,head)*fade*.8);
  }
  if(abs(v_kind-42.0)<0.1){
    float aa=fwidth(v_uv.y),slat=abs(fract(v_uv.y/.24)-.5);
    float lines=1.0-smoothstep(.12,.12+aa/.24,slat);
    tint=mix(tint,vec3(.24,.29,.28),lines*.7);
  }
`;
