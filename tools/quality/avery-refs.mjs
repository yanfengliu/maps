const county={url:'https://geo.sanjoseca.gov/server/rest/services/Imagery/DPW_ImageryCached2025/MapServer',kind:'photo',date:'2025'};
const naip={url:'https://gis.wildlife.ca.gov/images/rest/services/Base_Remote_Sensing/NAIP_2022/ImageServer',kind:'photo',date:'2022'};
const plan={url:'https://s3.amazonaws.com/mpsports.org/documents/2025/11/4/2025_MWP_MPSF_Championship_Participant_Manual_Final.pdf#page=7',kind:'document',date:'2025-11'};

export const AVERY_REFERENCES=[
  {
    key:'avery-grandstands',ids:['way/232715573'],title:'Avery Competition Pool',status:'photo-supported',reviewedAt:'2026-11-21',
    reviewBasis:'Matched the Stanford Athletics poolside view and MPSF venue diagram to the two pale strips on registered 2022 and 2025 aerials. The model uses the original dry U outline with the overlapping Band Shak footprint removed.',
    observed:'Pale scalloped fabric canopies cover aluminum spectator seating on opposite sides of a rectangular open-air pool. The lower aprons and terraces retain the existing basemap water.',
    limitations:'Stand and membrane dimensions are scaled from imagery. Canopy heights, sag, support spacing and the simplified stepped rows are estimates. The regional water outline and the 10 m source height are unmodified.',
    expected:{profile:'open',roofShape:'fabric-canopies'},
    sources:[{url:'https://gostanford.com/facilities/avery-aquatic-center',kind:'document',date:'undated'},
      {url:'https://storage.googleapis.com/stanford-prod/2024/06/05/ulf3QbbtkrGe92XAiUFG66ZD8BW4JssA561MAarV.jpg',kind:'photo',date:'undated'},plan,naip,county],
  },
  {
    key:'band-shak-roof',ids:['way/617740744'],title:'LSJUMB Band Shak',status:'photo-supported',reviewedAt:'2026-11-21',
    reviewBasis:'The MPSF competition plan labels the building at the end of the pool. Registered 2022 and 2025 overhead photographs show a brown, low roof with light rooftop fittings within the mapped part.',
    observed:'The individual low brown roof at the end of the pool occupies its separate source footprint. The two levels come from the mapped building tag.',
    limitations:'The aerials establish the roof and footprint. The facade, roof fittings and precise elevation remain approximate.',
    expected:{profile:'institutional',roofShape:'flat'},sources:[plan,naip,county],
  },
];
