// Individual visitor photos. A facade band is an exterior treatment, not a
// survey of occupied floors. Keep the independent source heights.
type Finish = {wall:string;roof:string;shape:'gabled'|'flat';bands:number};
export const PHOTO_COTTAGES:Readonly<Record<string,Finish>>={
  'way/232805700':{wall:'#d4d2c6',roof:'#827e70',shape:'gabled',bands:1}, // 670 Lomita
  'way/232805701':{wall:'#d8d5c9',roof:'#898475',shape:'gabled',bands:1}, // 672 Lomita
  'way/232715652':{wall:'#c9ad81',roof:'#a47659',shape:'gabled',bands:1}, // Cottages A–D
  'way/983231129':{wall:'#d8bd8b',roof:'#ac795a',shape:'gabled',bands:1}, // Cottages E–F
  'way/28592989':{wall:'#bcac97',roof:'#a4745e',shape:'gabled',bands:1}, // Golf Shop
  'way/232715613':{wall:'#d0c7b2',roof:'#a8a79a',shape:'flat',bands:1}, // Golf Clubhouse
  'way/232715779':{wall:'#c9c5b5',roof:'#985d58',shape:'gabled',bands:1}, // Biology Field House
  'way/232715642':{wall:'#ac7a67',roof:'#8c8172',shape:'gabled',bands:1}, // Visitor Center
};
// Distinct source and campus names remain searchable. The separate Lodge building
// at 672 Lomita has the reciprocal university facility match.
export const FACILITY_NAMES:Readonly<Record<string,{name:string;subtitle:string}>>={
  'way/1508657403':{name:'Mitchell Earth Sciences',subtitle:'397 Panama Mall · Stanford University'},
  'way/232805700':{name:'670 Lomita Drive',subtitle:'Building · Stanford University'},
  'way/232805701':{name:'The Lodge',subtitle:'672 Lomita · Former Breer Library · Stanford University'},
  'way/232715642':{name:'Stanford Visitor Center',subtitle:'Sam McDonald Track House · Stanford University'},
  'way/922801150':{name:'Educational Farm Shade Structure',subtitle:'14-786 · Mapped as Lathe House · Stanford University'},
};
