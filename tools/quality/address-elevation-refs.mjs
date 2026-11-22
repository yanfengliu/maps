const survey = 'https://stgenpln.blob.core.windows.net/document/SU_2018GUP_App_Vol4_pt2.pdf';
const county = 'https://geo.sanjoseca.gov/server/rest/services/Imagery/DPW_ImageryCached2025/MapServer';
function elevation(way, version, title, page, side, matched, observed, limitations) {
  return {
    key:'residential-survey-' + way, ids:['way/' + way], title, status:'photo-supported', reviewedAt:'2026-11-21',
    reviewBasis:'Compared the 2016 ' + side + ' elevation in the county-hosted survey, the original mapped street address and the outline over 2022 and 2025 aerial imagery. ' + matched,
    observed, limitations,
    sources:[
      {url:survey + '#page=' + page, kind:'photo', date:'2016'},
      {url:'https://api.openstreetmap.org/api/0.6/way/' + way + '/' + version + '.json', kind:'source-tag', date:version === 1 ? '2013-08-07' : '2022-10-04'},
      {url:'https://gis.wildlife.ca.gov/images/rest/services/Base_Remote_Sensing/NAIP_2022/ImageServer', kind:'photo', date:'2022'},
      {url:county, kind:'photo', date:'2025'},
    ],
  };
}

export const ADDRESS_ELEVATION_REFERENCES = [
  elevation(232715597, 1, '225 Santa Teresa Lane', 222, 'south',
    'The long, stepped house runs along Santa Teresa Lane. The south elevation and the projection at the west end match this main house.',
    'One story, muted tan vertical siding and a shallow gray-brown composition hip roof. Vegetation screens part of the front.',
    'Eave and ridge heights, the west projection and the window spacing are approximate. The survey records no measured height.'),
  elevation(232715618, 3, '506 Governor’s Avenue', 216, 'east',
    'The long main roof faces Governor’s Avenue, with an attached section at the northwest rear near Searsville Road. The original way labels this street Governors Avenue South.',
    'A single-story stucco house with a shallow side gable, dark gray roof and recessed entrance. A flat-roof garage attaches behind it.',
    'The main roof is represented across the mapped exterior. Garage roof geometry, end chimneys and individual openings are unsurveyed in the model.'),
  elevation(232715619, 3, '518 Governor’s Avenue', 227, 'east',
    'The house south of 506 has the east-facing facade and projecting southeast garage visible in both the outline and survey. The original way labels this street Governors Avenue South.',
    'Two stories, brick below light plaster, a continuous upstairs balcony, a composition gable and a front-gabled projecting garage.',
    'The principal gable and a single representative finish are modeled. The attached garage ridge, layered materials, balcony and openings are simplified.'),
  elevation(232715620, 1, '525 Los Arboles Avenue', 224, 'west',
    'The stepped footprint runs along the east side of Los Arboles Avenue with a projecting southwest carport, consistent with the survey’s west-facing facade and covered carport.',
    'One-story pale stucco residence with a shallow brown gabled roof. A wide central chimney and large windows are visible on the west elevation.',
    'The connected carport and trellis do not have separate roof profiles in the model. Height and opening dimensions are unsurveyed.'),
];
