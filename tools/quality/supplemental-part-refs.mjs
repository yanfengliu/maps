const doc=(url,date='undated')=>({url,date,kind:'document'});
const photo=(url,date='undated')=>({url,date,kind:'photo'});
const campus=doc('https://campus-map.stanford.edu/kml/Stanford_Buildings.kmz?z=45','2026-05');
const naip=photo('https://gis.wildlife.ca.gov/images/rest/services/Base_Remote_Sensing/NAIP_2022/ImageServer','2022');
const county=photo('https://geo.sanjoseca.gov/server/rest/services/Imagery/DPW_ImageryCached2025/MapServer','2025');
const facility=code=>photo('https://campus-map.stanford.edu/images_repo/bldg/'+code+'/'+code+'-1.jpg');
const baseball=doc('https://gostanford.com/facilities/klein-field-at-sunken-diamond');
const seating=doc('https://storage.googleapis.com/stanford-prod/2025/02/07/N3GOAfROqpZSDHfCXiz8ifqb218qApUi5hzsuAk1.png','2025');
const sideline=photo('https://storage.googleapis.com/stanford-prod/2024/06/05/ey1GsmBNfkjibwLzhfo2BIXxwX8LKkfMOGpp7d0o.jpg');
const ref=(id,title,status,reviewBasis,observed,limitations,sources)=>({
  key:'supplemental-'+id,ids:['way/'+id],title,status,reviewedAt:'2026-11-21',reviewBasis,observed,limitations,sources,
});

export const SUPPLEMENTAL_PART_REFERENCES=[
  ref('232805683','Clock Bell Tower colonnade','photo-supported',
    'The original municipal address is 501 Lasuen Mall. The Stanford visitor map separates a square bell tower from an adjacent eight-corner T-shaped colonnade. The pinned way has the same eight corners as the colonnade and is horizontally offset by about 2 m.',
    'The mapped T is the low open pergola. Stanford’s facility photo and side view show pale columns, perimeter beams and exposed overhead slats. The separate tower sits beside it.',
    'The tower has its own square outline in the Stanford plan. This source part does not supply that footprint. Beam spacing, post count and height are estimates.',
    [campus,facility('03-055'),photo('https://news.stanford.edu/__data/assets/image/0024/95235/Clock-tower.jpeg','2017'),doc('https://news.stanford.edu/stories/2017/07/clock-tower-will-repairs-summer','2017'),county]),
  ref('1168128440','The Knoll central bay','photo-supported',
    'Changeset 135631894 identifies the building as The Knoll. All six corners of this mapped part are the consecutive outer vertices 5 through 10 of The Knoll (way/232805659). The lawn-facing projection is visible in Stanford’s facility photograph and in the registered aerial.',
    'The building’s faceted central bay has three dark arched openings at ground level, a shallow balcony and a band of upper windows below the projecting hipped roof. The bay is represented on the parent exterior. Subtracting the three joined wings retains their separate roof profiles and leaves the mapped front and rear projections under the parent ID.',
    'Height, arch dimensions, window spacing and balcony height are estimated. The available photograph does not resolve the depth behind the openings.',
    [campus,facility('05-300'),doc('https://visit.stanford.edu/sites/g/files/sbiybj35161/files/media/file/self-guided_tour-stanford_arts_district.pdf#page=14'),naip,county]),
  ref('232805698','Knoll Garage','photo-supported',
    'The source address is 662 Lomita Court. The small rotated rectangle overlaps Stanford’s single Knoll Garage polygon and sits beside the Knoll driveway in both aerial vintages. The university photo identifies the building by the same facility number.',
    'A detached, single-storey garage has light textured walls, large dark doors and a shallow hipped tile roof.',
    'The wall and ridge heights are estimates. The photograph alone does not establish the compass orientation of the doors.',
    [campus,facility('05-310'),naip,county]),
  ref('338080122','Main Quad restroom building','photo-supported',
    'The original way explicitly tags the building as a restroom. It covers 92% of the university’s separately named restroom polygon. Stanford’s facility photograph shows the only small rectangular hip-roof building in that location.',
    'A low, single-storey, light-walled building has projecting hipped terracotta eaves beneath mature trees.',
    'Canopy and planting obscure openings. Its photographed roof is clear; the eave and ridge heights are estimates.',
    [campus,facility('01-570'),naip,county]),
  ref('690412907','North Ticket Booth','document-supported',
    'The original ticket-shop tag and the independent university plan agree. The entire small way falls inside the sole North Ticket Booth plan polygon, covering 29% of the larger envelope.',
    'This small rectangular part is associated with the north ticket booth. A 2025 overhead shows a pale patch at its location.',
    'The campus photo URL is a placeholder. Tree cover and the larger plan outline prevent a frontage, roof-shape, height or full-building match.',
    [campus,county]),
  ref('232715662','Former Taube tennis spectator structures','document-supported',
    'The original way carries 275 Sam McDonald Mall. Stanford’s 2013 facility plan identifies structures around the courts. The registered 2022 aerial matches both long arms of the pinned outline; in 2025 both are gone and the replacement is under construction.',
    'This footprint records structures surrounding the former competition courts. Stanford describes its replacement with a new tennis center on the same site.',
    'The retained outline describes the former stands and facility. It cannot establish the geometry of the new tennis pavilion.',
    [doc('https://maps.stanford.edu/ada/pdf/ADAMAP09-340.pdf','2013'),doc('https://stgenpln.blob.core.windows.net/document/ZA_20230706_Agenda.pdf','2023-07'),doc('https://headsup.stanford.edu/arrillaga-tennis-center'),naip,county]),
  ref('657542640','Former Smith Family Softball Stadium grandstand','document-supported',
    'The two arms and central curved section match the former stands in the 2022 aerial and KSH’s A1.0 demolition plan. The 2025 photo shows the replacement under construction and Stanford Athletics records its February 2026 opening.',
    'The pinned angled grandstand outline belongs to the former softball facility. KSH marks the old seating for demolition.',
    'The later stadium has a different envelope. This part cannot represent its exterior geometry.',
    [doc('https://stgenpln.blob.core.windows.net/document/PLN23_033_Plans.pdf#page=3','2023-02'),doc('https://gostanford.com/stanford-softball-stadium','2026-02'),naip,county]),
  ref('1363917194','Sunken Diamond press box','photo-supported',
    'The seating diagram puts the press box at the center behind home plate. The registered 9 m mapped part matches this standalone block in both aerials; the sideline photograph shows its light parapet and dark-framed field-facing glazing.',
    'The press box has a pale flat roof and a glazed elevation toward home plate.',
    'The map tag provides the height. Precise glazing dimensions and the division between the three tiers are unresolved.',
    [baseball,seating,sideline,county]),
  ...[['1363917195','visitors’','east'],['1363917196','home','west']].map(([id,team,side])=>ref(id,'Sunken Diamond '+team+' dugout','photo-supported',
    'Stanford’s seating diagram labels the two dugouts on opposite baselines. The '+side+' sideline’s narrow 2 m mapped part matches the horizontal strip at the front of the stands in the registered overheads.',
    'The '+team+' dugout is a long, low shelter with a flat cap and an open field-facing side. The facility photograph shows the sheltered sideline opening and edge of the opposite roof.',
    'The source provides the height. The canopy thickness, depth of the shelter and support spacing are approximations.',
    [baseball,seating,sideline,naip,county])),
];
