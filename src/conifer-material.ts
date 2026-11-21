/** The drooping, layered boughs follow the Pine Avenue photograph on
 * https://trees.stanford.edu/ENCYC/CEDde.htm. The OSM nodes identify
 * needleleaf trees but have no species tags; the crown is a generic estimate.
 * The closed proxy bounds fixed 3D boughs. Each intersection is independent
 * of bearing and writes its own projected depth among other campus objects.
 * Only needleleaf vertices compute a ray; no extra draw, texture or buffer. */
export const CONIFER_VERTEX_OUTPUTS = `
out vec3 v_crownPoint;
out vec3 v_crownRay;
flat out vec3 v_crownFrame;
`;
export const CONIFER_VERTEX = `
  if(abs(material-93.0)<.1 && u_groundPass<.5) {
    v_crownFrame=a_normal;
    v_crownPoint=vec3(a_uv,a_position.z/a_normal.y);
    vec4 nearPoint=inverse(u_matrix)*vec4(gl_Position.xy/gl_Position.w,-1.0,1.0);
    v_crownRay=(position-nearPoint.xyz/nearPoint.w)/a_normal.xxy;
  }
`;
export const CONIFER_HELPERS = `
in vec3 v_crownPoint;
in vec3 v_crownRay;
flat in vec3 v_crownFrame;
uniform mat4 u_matrix;

float needleNoise(vec3 p){
  // A fixed projection of local 3D coordinates follows each branch as the camera turns.
  vec2 q=p.xy+vec2(.43*p.z,-.64*p.z);
  vec2 cell=floor(q),f=fract(q);f=f*f*(3.0-2.0*f);
  return mix(mix(treeHash(cell).x,treeHash(cell+vec2(1,0)).x,f.x),mix(treeHash(cell+vec2(0,1)).x,treeHash(cell+vec2(1)).x,f.x),f.y);
}
float boughLight(vec3 n) {
  return .72+.28*max(0.0,dot(normalize(n),normalize(vec3(-.45,.6,.85))));
}
bool intersectCrown(vec3 origin,vec3 ray,out float nearest,out vec3 foliage) {
  float seed=v_crownFrame.z;
  nearest=6.0;
  // The exposed woody leader connects the whorls to the modeled lower trunk.
  vec2 radial=origin.xy/.045,dir=ray.xy/.045;
  float a=dot(dir,dir),b=dot(radial,dir),c=dot(radial,radial)-1.0;
  float delta=b*b-a*c;
  if(a>.000001 && delta>0.0) {
    float t=(-b-sqrt(delta))/a,z=origin.z+t*ray.z;
    if(z>.41 && z<.94){nearest=t;foliage=vec3(.36,.30,.22);}
  }
  const mat2 turn=mat2(.62348980,.78183148,-.78183148,.62348980);
  for(int tier=0;tier<6;tier++) {
    float level=float(tier),t=level/6.0,phase=seed*6.28+level*2.4;
    vec2 axis=vec2(cos(phase),sin(phase));
    for(int j=0;j<7;j++){
      axis=turn*axis;
      float id=level*7.0+float(j),variation=fract(seed*77.3+id*.61803399);
      float reach=(.86-.73*t)*(.82+.18*variation);
      float z=.425+.103*level+.022*(variation-.5);
      float sag=(.075+.035*variation)*(1.0-.55*t);
      vec2 side=vec2(-axis.y,axis.x);
      // Skewed ellipsoids form sloping, thick clusters around each bough.
      // They overlap around the trunk, with open space between outer sprays.
      vec3 scale=vec3(.55*reach,reach*(.30+.08*variation),(.059-.030*t));
      vec3 o=vec3(dot(origin.xy,axis)-.40*reach,dot(origin.xy,side),origin.z-z+dot(origin.xy,axis)*sag/reach)/scale;
      vec3 d=vec3(dot(ray.xy,axis),dot(ray.xy,side),ray.z+dot(ray.xy,axis)*sag/reach)/scale;
      float invA=1.0/dot(d,d),mid=-dot(o,d)*invA;
      vec3 closest=o+mid*d;
      float radial2=dot(closest,closest);
      if(radial2>=1.0)continue;
      float entry=mid-sqrt((1.0-radial2)*invA);
      if(entry>=nearest)continue;
      // The ellipsoid only bounds the search. Cut overlapping, upswept
      // sprays and a narrow twig out of its volume in bough coordinates.
      // Shared 3D sampling keeps that interior structure at opposite bearings.
      float span=2.0*(mid-entry);
      for(int k=0;k<7;k++){
        float depth=entry+span*(.045+.15*float(k));
        if(depth>=nearest)break;
        vec3 local=o+d*depth;
        float along=clamp(local.x*.5+.5,0.0,1.0);
        float lateral=abs(local.y);
        float spray=fract(along*(6.0+2.0*variation)-lateral*1.8-lateral*lateral*.65
                          +(local.y<0.0?.36:0.0)+id*.287);
        float fork=abs(spray-.5)*2.0;
        float twig=.085+.055*(1.0-along);
        float taper=clamp((1.0-along)*1.7,.06,1.0);
        vec3 hit=origin+ray*depth;
        float tufts=needleNoise(hit*vec3(22.0,22.0,62.0)+id);
        float fine=needleNoise(hit*vec3(61.0,61.0,171.0)+seed*41.0);
        float fringe=.37+.49*tufts+.18*fine;
        float flatness=.64+.28*tufts;
        float vertical=(local.z+.24*lateral)/flatness;
        float shell=local.x*local.x+local.y*local.y/(taper*taper)+vertical*vertical;
        if(shell>fringe*fringe)continue;
        if(lateral>twig && fork>.30+.47*tufts+.17*fine)continue;
        nearest=depth;
        vec3 grad=local/scale;
        vec3 n=vec3(axis*(grad.x+grad.z*sag/reach)+side*grad.y,grad.z)/v_crownFrame.xxy;
        float tone=.67+.37*tufts+.19*fine+.07*variation+.09*along;
        foliage=vec3(.35,.48,.33)*boughLight(n)*tone;
        break;
      }
    }
  }
  return nearest<6.0;
}
`;
export const CONIFER_FRAGMENT = `
  gl_FragDepth=gl_FragCoord.z;
  if(abs(v_kind-93.0)<.1) {
    vec3 ray=normalize(v_crownRay),origin=v_crownPoint-ray*3.0,leafColor;
    float nearest;
    if(!intersectCrown(origin,ray,nearest,leafColor))discard;
    vec3 displacement=(origin+nearest*ray-v_crownPoint)*v_crownFrame.xxy;
    vec4 clipDelta=u_matrix*vec4(displacement,0);
    float reciprocalW=gl_FragCoord.w;
    gl_FragDepth=.5+.5*(2.0*gl_FragCoord.z-1.0+clipDelta.z*reciprocalW)/(1.0+clipDelta.w*reciprocalW);
    tint=leafColor;
  }
`;
