/** Exterior observations from the four individual 2016 survey photographs. */
type House = {
  name: string;
  floors: number;
  shape: 'gabled' | 'hipped';
  wall: string;
  roof: string;
  eastLowerWall?: string;
  description: string;
};

export const ADDRESS_ELEVATIONS: Readonly<Record<string, House>> = {
  'way/232715597': {
    name:'225 Santa Teresa Lane', floors:1, shape:'hipped', wall:'#b8ae91', roof:'#8c8575',
    description:'The 2016 south elevation shows one story with vertical tan siding below a low composition hip roof.',
  },
  'way/232715618': {
    name:'506 Governor’s Avenue', floors:1, shape:'gabled', wall:'#c0bba7', roof:'#706c64',
    description:'The 2016 east elevation shows one story, pale stucco and a shallow side gable. The attached rear garage has a separate flat roof, simplified within the main roof here.',
  },
  'way/232715619': {
    name:'518 Governor’s Avenue', floors:2, shape:'gabled', wall:'#bdb8a9', roof:'#797469', eastLowerWall:'#a67b61',
    description:'The 2016 east elevation shows a brick lower story, pale upper walls and a long balcony below a composition gable. The garage ridge and balcony are simplified.',
  },
  'way/232715620': {
    name:'525 Los Arboles Avenue', floors:1, shape:'gabled', wall:'#c5b1a0', roof:'#9a7b63',
    description:'The 2016 west elevation shows a one-story stucco house with a low brown gable and central chimney. The chimney, trellis and carport roof are simplified.',
  },
};
