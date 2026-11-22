/** The offline footprint edition can outlive the buildings it describes. */
export const NORTHWEST_QUAD_HALLS:Readonly<Record<string,string>>={
  'way/232841881':'Cedar Hall','way/232841911':'Cypress Hall',
  'way/232841912':'Spruce Hall','way/232841929':'Redwood Hall',
};
export const FORMER_LOU_HENRY_ID='way/232805718';

export function civicHistory(id:string):string|undefined{
  const hall=NORTHWEST_QUAD_HALLS[id];
  if(hall)return hall+' appears in the pinned footprint edition. Stanford included it in the Northwest Quad demolition project and reported site restoration in August 2026. The source inventory retains its historical footprint.';
  if(id===FORMER_LOU_HENRY_ID)return 'This pinned footprint carries the former Lou Henry Hoover Building name. Hoover reports that the George P. Shultz Building replaced it and opened in 2024. The earlier footprint is omitted from the current map.';
}
