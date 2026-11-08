// Mapped Stanford Stadium parts, distinct from the nearby baseball grandstand.
export const STADIUM_CONCOURSE_ID = 'relation/18614805';
export const STADIUM_SEATING_IDS = new Set([
  ...Array.from({length:8},(_,i)=>`way/${1351986681+i}`),
  ...Array.from({length:8},(_,i)=>`way/${1363840342+i}`),
]);
export const STADIUM_PRESSBOX_IDS = new Set(['way/232715861','way/1351984170','way/1351991359','way/1354417642','way/1354417643','way/1354417644','way/1354418130','way/1354419983','way/1354428205','way/1354428206','way/1357063452']);
export const STADIUM_SCOREBOARD_IDS = new Set(['way/1354428605','way/1354428606','way/1354429136','way/1354429137','way/1354430368','way/1354430369']);
export const STADIUM_CENTER:[number,number]=[-122.1610945,37.434510375];
export const STADIUM_OPEN_PART_IDS=new Set(['way/1357063452']);
