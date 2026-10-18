// Explicit bounded profile, never ordinary or production admission. Historical guards remain unchanged.
import {HISTORICAL_HERO_INPUTS,HISTORICAL_OBSTACLE_INPUTS,NETWORK_INPUT,CURRENT_OWNER_INPUTS} from './input-contract.mjs';
import {readPinned} from './paths.mjs';
const freeze=rows=>Object.freeze(rows.map(row=>Object.freeze(row)));
const hero=freeze([
  {
    "path": "data/scene/roads.mesh",
    "bytes": 6509676,
    "sha256": "0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc"
  },
  {
    "path": "data/scene/pavements.mesh",
    "bytes": 13071300,
    "sha256": "841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6"
  },
  {
    "path": "data/scene/pavement-recipe.json",
    "bytes": 5703511,
    "sha256": "bd77413a040d940aab75ec3ecc4415ef2e29f4a3b344cc0f5e4e0c2440e0c088"
  },
  {
    "path": "data/scene/pavement-source.json",
    "bytes": 34410496,
    "sha256": "ab6a66b4da3fda3b0f3e60853f468fd203fd76bc92c56fdaa1d9a5a0dbdd58ea"
  },
  {
    "path": "data/scene/terrain.mesh",
    "bytes": 4415496,
    "sha256": "c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773"
  }
]);
const obstacles=freeze([
  {
    "path": "data/scene/buildings/tileset.json",
    "bytes": 67872,
    "sha256": "71b1716f6fafd028e1f6bad46fb8f7848c36f941c30d428be21828e9902b4483"
  },
  {
    "path": "data/scene/buildings/data/data518.b3dm",
    "bytes": 4973844,
    "sha256": "5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b"
  },
  {
    "path": "data/scene/decorations.json",
    "bytes": 80890,
    "sha256": "f16d044aeefc16704f6bcd10c1e3d03039927d6226b68322631ea3edff1ac918"
  },
  {
    "path": "data/scene/control-hardware.json",
    "bytes": 100180,
    "sha256": "6b8afb406d339cb8bed7926ef8ec800711f4f309ef69c4794203aa0603248b3b"
  }
]);
const code=freeze([
  {
    "path": "tools/scene/pavement-hero.ts",
    "bytes": 5501,
    "sha256": "8e3a580272f3ce8472eb11908bb6438f7caa9549d5f6c6b1d87c98368e3540d5"
  },
  {
    "path": "tools/scene/pavement-geometry.ts",
    "bytes": 5060,
    "sha256": "3b7c8034061a8c28e8df143cbcc09cfafa90177eb45120e16141bb21f7bc9507"
  },
  {
    "path": "tools/scene/pavement-overlay.ts",
    "bytes": 9593,
    "sha256": "22b152df2b6d5884f6f089fb068d352ce04ffcf81c0e3851f05e3e02658c8868"
  },
  {
    "path": "tools/scene/compose-pavement.ts",
    "bytes": 4772,
    "sha256": "67581f14d69274db2830b6fc8974e4f159aece2a4cd4cf4616020de78259396e"
  },
  {
    "path": "tools/scene/pavement-recipe.ts",
    "bytes": 6920,
    "sha256": "f0a3c534c21671a4e858b4e9dfe291230f1bcffb51e20a2bf90ea7d14f75d077"
  },
  {
    "path": "tools/scene/pavement-source.ts",
    "bytes": 3696,
    "sha256": "f8de87501914d52de754be032430f6d645983c30145b4df14cf0f8dfe4e5ada4"
  },
  {
    "path": "tools/scene/select-pavement-source.ts",
    "bytes": 7700,
    "sha256": "c447af7511ddc59f1df75ad66bd49a7d4c388d1ee34069f18dc53866bddd6623"
  }
]);
const primaryOwners=freeze([
  {path:'src/agents/population/local-ordered/controller.mjs',bytes:27870,sha256:'3e2117108c98821a8f846a02c3b82964d0b5358f24cc9756fff3d7cc6a1d0ce9'},
  CURRENT_OWNER_INPUTS[1],
  {path:'src/agents/population/local-ordered/solve-leg.mjs',bytes:1516,sha256:'2d32a3930f7197140c651d3cbf62257565141aad63f30b29a74daffb091b431f'},
]);
export const CURRENT_776_PROFILE=Object.freeze({id:'current-776-bounded-generation',heroInputs:hero,obstacleInputs:obstacles,networkInput:NETWORK_INPUT,codeInputs:code,ownerInputs:primaryOwners,productionReady:false,normalAdoption:'withheld',caveats:Object.freeze(['Seven shared competing-height centroid refusals remain; continuous support is not qualified','One conservative building-envelope overlap/minimum0m remains; full body/contact/collision checks are not waived','Five obstacle provenance differences remain distinct from geometry equality','785:776 imported759 grounding/route paths were not bound throughout that earlier execution; equal reviewed copies do not retroactively establish closure','This profile permits only separately leased bounded generation; it does not qualify default activation or historical375/fullpopulation/FPS'])});
const historical=Object.freeze({id:'historical',heroInputs:HISTORICAL_HERO_INPUTS,obstacleInputs:HISTORICAL_OBSTACLE_INPUTS,networkInput:NETWORK_INPUT,codeInputs:Object.freeze([]),ownerInputs:CURRENT_OWNER_INPUTS,productionReady:false,normalAdoption:'withheld',caveats:Object.freeze(['Historical exact inputs remain required; current pavement/recipe/hardware refuse this profile'])});
// Explicit 2026-10-18 source succession. Historical tuples remain unchanged.
export const FRESH_1695_PROFILE=Object.freeze({...CURRENT_776_PROFILE,id:'fresh-1695-bounded-generation',ownerInputs:freeze(primaryOwners.map(row=>row.path==='src/agents/population/local-walk-gait.ts'?{path:row.path,bytes:13490,sha256:'46a8a11de55c30a32a9ca3dc961d15a3b156ccaa4d53ecbb590baf2fd29ca657'}:row)),obstacleInputs:freeze(obstacles.map(row=>row.path==='data/scene/decorations.json'?{path:row.path,bytes:80952,sha256:'afcf87518922f383a50dc63c1b014e35ad8ffc989154db7fc813b7aefb2ab3bc'}:row.path==='data/scene/control-hardware.json'?{path:row.path,bytes:100769,sha256:'c5c93afbe2cbc4634018a2b0848bfbad19572157374b4bc42a9602406a767c6c'}:row)),networkInput:Object.freeze({path:'data/network/network.json',bytes:10301111,sha256:'1e558138fe8d6df9dfbf9df76d05c868d776fc9fbd8e018999e611d86a63d15f'}),caveats:Object.freeze([...CURRENT_776_PROFILE.caveats,'Fresh source succession binds the complete1695 network/decorations/hardware bytes; ordinary runtime source, route and all-junction authority checks remain required'])});
export function inputProfile(name='historical'){if(name==='historical')return historical;if(name===CURRENT_776_PROFILE.id)return CURRENT_776_PROFILE;if(name===FRESH_1695_PROFILE.id)return FRESH_1695_PROFILE;throw Error('Walker preparation input profile '+name+' is unsupported; explicitly choose historical, current-776-bounded-generation or fresh-1695-bounded-generation');}
export function assertInputProfile(project,name='historical'){const profile=inputProfile(name),rows=[...profile.heroInputs,...profile.obstacleInputs,profile.networkInput,...profile.codeInputs,...profile.ownerInputs];return rows.map(row=>({...row,bytes:readPinned(project,row).length}));}
