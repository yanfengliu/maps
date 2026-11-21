// Reconstruct only the retired conifer crowns from 18c5916 for the historical
// non-palm scene hash. Keep the emitted trunks, mulch, anchors and every other
// instance's actual faces, colors and normals in that cross-platform oracle.
export function originalConiferCrown([x,y],{height,radius,seed},id){
  const crown=[];
  for(let tier=0;tier<3;tier++)for(let i=0;i<8;i++){
    const a=i*Math.PI/4+seed,b=(i+1)*Math.PI/4+seed,r=radius*(1-tier*.22);
    const bottom=height*(.30+tier*.18),top=height*(.69+tier*.15);
    crown.push({points:[[x+Math.cos(a)*r,y+Math.sin(a)*r,bottom],[x+Math.cos(b)*r,y+Math.sin(b)*r,bottom],[x,y,top]],tint:[.32+tier*.015,.43+tier*.015,.34],kind:10,id});
  }
  return crown;
}
