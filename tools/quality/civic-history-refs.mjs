import {NORTHWEST_QUAD_HALLS,FORMER_LOU_HENRY_ID,civicHistory} from '../../src/civic-history.ts';
const survey='https://stgenpln.blob.core.windows.net/document/SU_2018GUP_App_Vol4_pt2.pdf#page=105';
const bulletin='https://myemail.constantcontact.com/HEADS-UP-WEEKLY-UPDATE--8-22---8-28-2026.html?aid=0-YMaAkczpg&soid=1118124550054';
const doc=(url,date)=>({url,kind:'document',date});
const common={reviewedAt:'2026-11-21',status:'document-supported'};
export const CIVIC_HISTORY_REFERENCES=[
  ...Object.entries(NORTHWEST_QUAD_HALLS).map(([id,name])=>{
    const pictured=name==='Redwood Hall'||name==='Cypress Hall';
    return {key:'former-'+id.split('/')[1],ids:[id],title:name,...common,
      observed:civicHistory(id),
      reviewBasis:'The historic survey identifies the four halls by name and Stanford facility number; the construction update explicitly lists them together for demolition. The 2026 visitor-map polygon comparison returned no current match.',
      limitations:pictured?'Page 105 pictures this former hall in 2016. The 2025 aerial also predates the demolition bulletin. The surviving pinned volume is historical.':'The survey describes this hall within the Jordan Quad group. Its photographs are of Redwood and Cypress. The 2025 aerial predates demolition.',
      sources:[doc(bulletin,'2026-08-22 to 2026-08-28'),{url:survey,kind:pictured?'photo':'document',date:'2016 photograph; 2017 evaluation'}],
    };
  }),
  {key:'former-lou-henry',ids:[FORMER_LOU_HENRY_ID],title:'Former Lou Henry Hoover Building',...common,
    observed:civicHistory(FORMER_LOU_HENRY_ID),
    reviewBasis:'The Hoover Institution explicitly identifies the construction site as the former Lou Henry Hoover Building and dates the Shultz Building unveiling to February 2024.',
    limitations:'The current Shultz Building has a different footprint. Its public images cannot verify the shape retained in the pinned source.',
    sources:[doc('https://www.hoover.org/news/new-george-p-shultz-building-unveiled-winter-2024-hoover-board-overseers-meeting','2024-02'),doc('https://www.hoover.org/shultzbuilding','2024')],
  },
];
