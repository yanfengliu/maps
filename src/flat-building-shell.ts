import type * as GeoJSON from 'geojson';
import type {BuildingArchitecture} from './building-architecture.ts';
import {BRAUN_MUSIC_ID} from './campus-roof.ts';
import {ENGINEERING_REFERENCES} from './engineering-architecture.ts';
import {garageProfile} from './garage-architecture.ts';
import {HOOVER_PART_IDS} from './hoover-architecture.ts';
import {STADIUM_CONCOURSE_ID,STADIUM_SEATING_IDS,STADIUM_PRESSBOX_IDS,STADIUM_SCOREBOARD_IDS} from './stadium-architecture.ts';

// Match the native terrain foundation's below-ground coverage. This is a
// rendering skirt, not a change to the source base or an invented basement.
export const FLAT_SHELL_FOUNDATION_DEPTH=10;

/** Only the generic, opaque flat-roof path owns a complete replacement shell.
 * Specialized landmarks retain their separate rendering/visibility contracts. */
export function hasFlatBuildingShell(p:GeoJSON.GeoJsonProperties,architecture:BuildingArchitecture):boolean {
  const id=String(p?.id),garage=garageProfile(p)?.kind;
  return architecture.roofShape==='flat' && id!==BRAUN_MUSIC_ID
    && !['memorial-church','quad','quad-wing'].includes(architecture.profile)
    && !HOOVER_PART_IDS.has(id) && id!==STADIUM_CONCOURSE_ID
    && !STADIUM_SEATING_IDS.has(id) && !STADIUM_PRESSBOX_IDS.has(id) && !STADIUM_SCOREBOARD_IDS.has(id)
    && garage!=='open-deck' && garage!=='screened'
    && !['workshop','concrete-frame'].includes(ENGINEERING_REFERENCES[id]?.family);
}
