/** Museum bands follow the full height of a single elevation. The east lawn
 * and south gallery openings use continuous normalized facade coordinates. */
export const CIVIC_FRAGMENT = `
  if (v_kind > 54.5 && v_kind < 58.5 && u_facadeDetail > .5) {
    float x = v_uv.x, y = v_uv.y;
    float aa = max(fwidth(y),.002), ax = max(fwidth(x),.001);
    float panel = fract(x*25.);
    float joint = (1.-smoothstep(.010,.027+ax*25.,min(panel,1.-panel))) *
      (1.-smoothstep(.20,.65,ax*25.));
    vec3 glass = mix(vec3(.18,.23,.23),vec3(.29,.36,.37),y);
    if (v_kind < 55.5) {
      float height = mix(.63,.29,smoothstep(.12,.83,x));
      float zinc = smoothstep(height-aa,height+aa,y)*(1.-smoothstep(height+.24-aa,height+.24+aa,y));
      float bay = smoothstep(.07,.09+ax,x)*(1.-smoothstep(.83,.85+ax,x));
      float glazing = bay*smoothstep(.02,.04+aa,y)*(1.-smoothstep(height-.13,height-.10+aa,y));
      tint = mix(tint,glass,glazing*(1.-.55*joint));
      tint = mix(tint,vec3(.47,.35,.26)*(1.-joint*.13),zinc);
    } else if (abs(v_kind-57.) < .1) {
      float glazing = smoothstep(.18,.19+ax,x)*(1.-smoothstep(.79,.80+ax,x))*
        smoothstep(.06,.07+aa,y)*(1.-smoothstep(.84,.86+aa,y));
      tint = mix(tint,glass,glazing*(1.-joint*.65));
      tint = mix(tint,vec3(.36,.29,.27),smoothstep(.88,.90+aa,y));
    } else {
      float low = 1.-smoothstep(.28-aa,.28+aa,y);
      float upper = smoothstep(.49-aa,.49+aa,y)*(1.-smoothstep(.74-aa,.74+aa,y));
      float opening = v_kind < 56.5 ? upper*smoothstep(.24,.25+ax,x)*(1.-smoothstep(.78,.79+ax,x)) : 0.;
      tint = mix(tint,glass,max(low,opening)*(1.-joint*.55));
      tint = mix(tint,vec3(.65,.70,.69)*(1.-joint*.2),smoothstep(.89-aa,.89+aa,y));
    }
  }
`;
