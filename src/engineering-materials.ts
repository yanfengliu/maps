/** UV x counts full bays; y spans the complete tall elevation. Monitor glass
 * uses kind 52 with y in [2,3]. All sub-pixel detail fades analytically. */
export const ENGINEERING_FRAGMENT=`
  if(v_kind>49.9&&v_kind<52.1){
    vec2 p=vec2(fract(v_uv.x),v_uv.y),aa=max(fwidth(v_uv),vec2(.001));
    float fade=1.0-smoothstep(.10,.30,max(aa.x,aa.y));
    if(v_uv.y>1.5){
      float mullion=1.0-smoothstep(.025,.045+fwidth(v_uv.x),abs(fract(v_uv.x/.85)-.5));
      float edge=step(p.y,2.08)+step(2.92,p.y);
      tint=mix(vec3(.19,.24,.22),vec3(.34,.33,.27),max(mullion,edge)*fade);
    }else{
      bool stone=v_kind<50.5,concrete=v_kind>51.5;
      float x=abs(p.x-.5),width=stone?.36:concrete?.35:.31;
      float aperture=(1.0-smoothstep(width,width+aa.x,x))*smoothstep(.14,.15+aa.y,p.y)*(1.0-smoothstep(.88,.89+aa.y,p.y));
      float shade=smoothstep(.16,.86,p.y);
      vec3 glazing=mix(vec3(.24,.28,.23),vec3(.17,.22,.20),shade);
      // Deep sandstone reveals and heavy crossbars differ from slender wood
      // grids on stucco wings. None of these buildings has a glass curtain wall.
      float reveal=(1.0-smoothstep(width-.035,width,x))*step(width-.055,x)*aperture;
      float crossbar=stone?max(1.0-smoothstep(.014,.021+aa.y,abs(p.y-.60)),1.0-smoothstep(.014,.021+aa.y,abs(p.y-.77))):0.0;
      float center=1.0-smoothstep(stone?.025:.010,stone?.034:.019+aa.x,x);
      float horizontal=1.0-smoothstep(.010,.018+aa.y,abs(fract((p.y-.15)*6.0)-.5));
      float frame=max(center,concrete?(1.0-smoothstep(.018,.028+aa.y,abs(p.y-.51))):horizontal*.78);
      tint=mix(tint,glazing,aperture*fade);
      tint=mix(tint,vec3(.25,.25,.19),frame*aperture*fade);
      tint=mix(tint,v_color*.93,max(crossbar*aperture,reveal)*fade);
      if(stone){
        vec2 blocks=vec2(v_uv.x*4.8+mod(floor(p.y*14.0),2.0)*.5,p.y*14.0);
        vec2 c=fract(blocks),da=fwidth(blocks);float joint=min(min(c.x,1.0-c.x),min(c.y,1.0-c.y));
        float detail=1.0-smoothstep(.25,.75,max(da.x,da.y));
        float grain=fract(sin(dot(floor(blocks),vec2(12.9898,78.233)))*43758.5453)-.5;
        tint*=1.0+(grain*.07-(1.0-smoothstep(.015,.035+max(da.x,da.y),joint))*.13)*(1.0-aperture)*detail;
      }
      float plinth=1.0-smoothstep(.08,.10+aa.y,p.y);
      tint=mix(tint,v_color*.84,plinth*fade);
    }
  }
`;
