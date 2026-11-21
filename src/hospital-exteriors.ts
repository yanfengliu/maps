// Roof outlines in metres on the campus buildings' common grid (15° south
// of east; second axis points south). Origins register them to USGS NAIP.
// The outer walls still use every vertex of the actual OSM footprint.
type Point = [number, number];
export type HospitalExterior = 'stanford' | 'packard-main' | 'packard-west';
type Profile = { site: HospitalExterior; origin: Point; podium: number; description: string };

export const HOSPITAL_EXTERIORS: Readonly<Record<string, Profile>> = {
  'way/891732466': {
    site: 'stanford', origin: [-122.177, 37.4345833], podium: 0.39,
    description: 'At 500 Pasteur, four glazed upper blocks with inset rooftop screens stand above a planted podium around a glazed central roof. Their arrangement follows exterior photographs and public aerial imagery. The 18 m source height is estimated, as are the relative heights, overhangs and glazing.',
  },
  'way/689417360': {
    site: 'packard-main', origin: [-122.17395, 37.4363233], podium: 0.34,
    description: 'Packard Main has staggered pavilion wings, pale projecting fins and horizontal sunshades. Their form follows the architects’ exterior photographs and public aerial imagery. The 18 m source height, terrace elevations, fin spacing and unphotographed elevations are estimates.',
  },
  'way/130100416': {
    site: 'packard-west', origin: [-122.17511, 37.43607], podium: 0.55,
    description: 'Packard West has terraced wings around a garden and small pyramidal roof lights along its stepped roofline. The exterior model follows aerial imagery and Stanford references. Wing heights, garden details, glazing and the 18 m source height are estimated.',
  },
};

export function podiumHeight(id: string, base: number, height: number): number | undefined {
  const profile = HOSPITAL_EXTERIORS[id];
  return profile && base + (height - base) * profile.podium;
}

const box = (x0: number, y0: number, x1: number, y1: number): Point[] =>
  [[x0,y0], [x1,y0], [x1,y1], [x0,y1]];

// Interpreted roof edges rounded to the nearest half metre; no survey of
// roof heights or interior spaces is implied. Keep the three sites distinct.
export const UPPER_WINGS: Record<HospitalExterior, Point[][]> = {
  stanford: [
    box(-15, -52.5, 18, -24), box(19.5, -7, 59, 18.5),
    box(-12, 27.5, 14, 62), box(-59, -9, -23, 17),
  ],
  'packard-main': [
    [[-54,-41.5],[26.5,-41.5],[26.5,-27],[21,-27],[21,-22],[-54,-22]],
    box(6,-21,19.5,68), box(20.5,13,78,35),
  ],
  'packard-west': [
    [[-52,9.5],[-19,9.5],[-19,19],[25,19],[25,8.5],[30.5,8.5],[30.5,-9.5],[61.5,-9.5],[61.5,13.5],[45,13.5],[45,31.5],[-8,31.5],[-8,39.5],[-14,39.5],[-14,33.5],[-52,33.5]],
    [[-7.5,-47.5],[21,-47.5],[21,-24],[6,-24],[6,-14.5],[-7.5,-14.5]],
  ],
};
