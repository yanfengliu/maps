// No image asset: field paint uses regulation metre spacing and small block
// glyphs. Row/letter shapes are illustrative, not an exact artwork reproduction.
export const STADIUM_FIELD_HELPERS = `
float stadiumGlyph(vec2 p,int code){
  if(any(lessThan(p,vec2(0.0)))||any(greaterThanEqual(p,vec2(1.0))))return 0.0;
  int column=int(floor(p.x*5.0)),row=int(floor((1.0-p.y)*7.0));uint bits=0u;
  if(code==0)bits=column==0?79u:column==1?73u:column==2?73u:column==3?73u:121u;
  if(code==1)bits=column==0?1u:column==1?1u:column==2?127u:column==3?1u:1u;
  if(code==2)bits=column==0?126u:column==1?9u:column==2?9u:column==3?9u:126u;
  if(code==3)bits=column==0?127u:column==1?6u:column==2?8u:column==3?48u:127u;
  if(code==4)bits=column==0?127u:column==1?9u:column==2?9u:column==3?9u:1u;
  if(code==5)bits=column==0?62u:column==1?65u:column==2?65u:column==3?65u:62u;
  if(code==6)bits=column==0?127u:column==1?9u:column==2?25u:column==3?41u:70u;
  if(code==7)bits=column==0?127u:column==1?65u:column==2?65u:column==3?65u:62u;
  if(code==8)bits=column==0?62u:column==1?81u:column==2?73u:column==3?69u:62u;
  if(code==9)bits=column==0?0u:column==1?66u:column==2?127u:column==3?64u:0u;
  if(code==10)bits=column==0?66u:column==1?97u:column==2?81u:column==3?73u:70u;
  if(code==11)bits=column==0?65u:column==1?73u:column==2?73u:column==3?73u:54u;
  if(code==12)bits=column==0?24u:column==1?20u:column==2?18u:column==3?127u:16u;
  if(code==13)bits=column==0?79u:column==1?73u:column==2?73u:column==3?73u:49u;
  return float((bits>>uint(row))&1u);
}
float stadiumWord(vec2 p){
  float slot=floor(p.x*8.0);if(slot<0.0||slot>=8.0)return 0.0;
  return stadiumGlyph(vec2(fract(p.x*8.0)/0.78,p.y),int(slot));
}
float stadiumNumber(vec2 p,int value){
  return p.x<.48?stadiumGlyph(vec2(p.x/.43,p.y),8+value/10):stadiumGlyph(vec2((p.x-.55)/.43,p.y),8);
}
`;
export const STADIUM_FIELD_FRAGMENT = `
  if(abs(v_kind-32.0)<0.1){
    vec2 p=v_uv;const float yard=.9144;
    float aa=max(fwidth(p.x),fwidth(p.y)),fade=1.0-smoothstep(1.25,3.0,aa);
    float stripe=mod(floor((p.y+45.72)/(5.0*yard)),2.0);
    tint=v_color*(.94+.06*stripe);
    float paint=(1.0-smoothstep(.07,.07+aa,abs(abs(p.x)-24.2)))+(1.0-smoothstep(.07,.07+aa,abs(abs(p.y)-54.7)));
    if(abs(p.y)<45.8){
      float line=abs(mod(p.y+2.5*yard,5.0*yard)-2.5*yard);
      paint=max(paint,1.0-smoothstep(.055,.055+aa,line));
      float tick=abs(mod(p.y+.5*yard,yard)-.5*yard);
      float hash=max(1.0-smoothstep(.30,.30+aa,abs(abs(p.x)-6.096)),1.0-smoothstep(.30,.30+aa,abs(abs(p.x)-23.7)));
      paint=max(paint,(1.0-smoothstep(.055,.055+aa,tick))*hash);
      float nearTen=floor(p.y/(10.0*yard)+.5),dy=p.y-nearTen*10.0*yard;
      int value=50-int(abs(nearTen))*10;
      if(value>=10&&abs(p.x)>16.5&&abs(p.x)<19.5&&abs(dy)<1.8){
        vec2 glyph=vec2((p.x>0.0?dy:-dy)/3.6+.5,(19.5-abs(p.x))/2.8);
        paint=max(paint,stadiumNumber(glyph,value)*fade);
      }
    }
    if(abs(p.y)>46.5&&abs(p.y)<53.5){
      // Rotate opposite end zones by 180 degrees; a single-axis flip mirrors
      // lettering. Both words face inward, as do numbers at each sideline.
      vec2 textPoint=vec2((p.y>0.0?-p.x:p.x)/35.0+.5,1.0-(abs(p.y)-47.2)/5.7);
      paint=max(paint,stadiumWord(textPoint)*fade);
    }
    tint=mix(tint,vec3(.94,.94,.88),clamp(paint,0.0,1.0));
    float logo=stadiumGlyph(vec2(p.x/5.0+.5,p.y/7.0+.5),0)*fade;
    tint=mix(tint,vec3(.55,.06,.09),logo);
  }
`;
