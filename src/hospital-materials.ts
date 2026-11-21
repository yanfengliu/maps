// UVs describe one architectural bay and one exterior band. Average colors
// take over before the glazing subdivisions reach a single pixel.
export const HOSPITAL_FRAGMENT = `
  if (v_kind > 96.5 && v_kind < 99.5 && u_facadeDetail > 0.5) {
    vec2 cell = fract(v_uv), aa = max(fwidth(v_uv), vec2(.001));
    float detail = 1.0 - smoothstep(.16,.65,max(aa.x,aa.y));
    bool steel = v_kind < 97.5;
    float sill = v_kind > 98.5 ? .44 : .13;
    float glass = smoothstep(sill,sill+.03+aa.y,cell.y)*(1.0-smoothstep(.85,.88+aa.y,cell.y));
    float frame = 1.0-smoothstep(.018,.035+aa.x,min(cell.x,1.0-cell.x));
    vec3 pane = steel ? vec3(.32,.43,.48) : vec3(.36,.44,.43);
    tint = mix(tint,pane*(.93+.12*cell.y),glass*(1.0-frame)*detail);
    if (abs(v_kind-98.0)<.1) {
      float slat = (1.0-smoothstep(.08,.14+aa.y*14.0,abs(fract(cell.y*14.0)-.5))) *
        smoothstep(.50,.52+aa.y,cell.y)*(1.0-smoothstep(.83,.86+aa.y,cell.y));
      tint = mix(tint,vec3(.62,.45,.34),slat*(1.0-frame)*detail);
    }
  }
`;
