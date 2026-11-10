/** Vector lettering and octagonal edges in fixed object UVs, never billboards. */
export const STOP_SIGN_HELPERS=`
float signStroke(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.0,1.0));}
float signLetter(vec2 p,int letter){
 float d=1.0;
 if(letter==0){
  d=min(signStroke(p,vec2(.29,.33),vec2(.18,.40)),signStroke(p,vec2(.18,.40),vec2(-.20,.40)));
  d=min(d,signStroke(p,vec2(-.20,.40),vec2(-.31,.28)));d=min(d,signStroke(p,vec2(-.31,.28),vec2(-.28,.12)));
  d=min(d,signStroke(p,vec2(-.28,.12),vec2(.23,-.09)));d=min(d,signStroke(p,vec2(.23,-.09),vec2(.31,-.23)));
  d=min(d,signStroke(p,vec2(.31,-.23),vec2(.22,-.39)));d=min(d,signStroke(p,vec2(.22,-.39),vec2(-.20,-.39)));
  d=min(d,signStroke(p,vec2(-.20,-.39),vec2(-.31,-.32)));
 }else if(letter==1){d=min(signStroke(p,vec2(-.34,.40),vec2(.34,.40)),signStroke(p,vec2(0,.40),vec2(0,-.40)));}
 else if(letter==2){vec2 q=abs(p)-vec2(.19,.27);d=abs(length(max(q,0.0))+min(max(q.x,q.y),0.0)-.12);}
 else {d=min(signStroke(p,vec2(-.28,-.40),vec2(-.28,.40)),signStroke(p,vec2(-.28,.40),vec2(.15,.40)));d=min(d,signStroke(p,vec2(.15,.40),vec2(.30,.26)));d=min(d,signStroke(p,vec2(.30,.26),vec2(.28,.10)));d=min(d,signStroke(p,vec2(.28,.10),vec2(.15,.01)));d=min(d,signStroke(p,vec2(.15,.01),vec2(-.28,.01)));}
 return d;
}
`;
export const STOP_SIGN_FRAGMENT=`
 if(abs(v_kind-96.0)<.1){
  vec2 p=v_uv-.5,q=abs(p);
  float edge=max(max(q.x,q.y)-.5,(q.x+q.y-.70710678)*.70710678);
  if(edge>0.0)discard;
  float aa=max(fwidth(edge),.001),rim=1.0-smoothstep(-.031-aa,-.031+aa,edge);
  if(gl_FrontFacing){
   tint=mix(vec3(.94,.93,.88),v_color,rim);
   vec2 text=vec2((v_uv.x-.12)/.19,(v_uv.y-.5)/.25);
   int letter=int(floor(text.x));
   if(letter>=0&&letter<4){float d=signLetter(vec2(fract(text.x)-.5,text.y),letter);float ink=1.0-smoothstep(.064,.064+max(fwidth(d),.008),d);tint=mix(tint,vec3(.98,.97,.93),ink);}
  }else{tint=vec3(.50,.53,.53);}
  float bolt=min(length(p-vec2(0,.34)),length(p-vec2(0,-.34)));
  tint=mix(tint,vec3(.38,.40,.39),1.0-smoothstep(.007,.011,bolt));
 }
`;
