import { icon } from './icons.ts';
import { CANTOR_PLAN_URL } from './visitor-maps.ts';

interface GallerySpace {
  number: number;
  name: string;
  outline: string;
  label: readonly [number, number];
}

// Diagram coordinates share the orientation of the December 2024 museum handout.
// Only publicly named spaces are drawn. The paths bound areas, not walls or doors.
const westOctagon = 'M263 436H345L405 496V580L345 641H263L203 580V496Z';
const eastOctagon = 'M1019 436H1100L1161 496V580L1100 641H1019L958 580V496Z';
const rotunda = 'M600 196Q668 127 756 192L733 215Q782 276 733 327L756 349Q680 411 581 328H600Z';

export const GALLERY_FLOORS: readonly (readonly GallerySpace[])[] = [
  [
    { number: 101, name: 'Asian Art · Sullivan Gallery', outline: eastOctagon, label: [1060,538] },
    { number: 105, name: 'New Media Art · Russell Gallery', outline: 'M1012 666H1126V859H1012Z', label: [1068,763] },
    { number: 106, name: 'Oceanic Art', outline: 'M830 666H1012V762H830Q755 715 830 666Z', label: [915,713] },
    { number: 108, name: 'Asian Art · Miller Gallery', outline: 'M830 762H1012V859H830Z', label: [921,810] },
    { number: 111, name: 'Main Lobby', outline: 'M581 715H781V830H581Z', label: [681,773] },
    { number: 117, name: 'Courtyard', outline: 'M365 406H561V615H529V666H351V641L405 580V496L345 436H365Z', label: [477,508] },
    { number: 121, name: 'Miedel Gallery', outline: 'M658 425H751V567H710V615H658Z', label: [702,494] },
    { number: 122, name: 'Stanford Family Gallery', outline: 'M561 425H658V615H561Z', label: [609,520] },
    { number: 125, name: 'African Art · Seligman Gallery', outline: 'M352 762H531V859H352Z', label: [443,810] },
    { number: 127, name: 'Rodin', outline: 'M352 666H531Q605 698 550 741H531V762H352Z', label: [445,713] },
    { number: 128, name: 'Rodin · Taylor Gallery', outline: 'M239 666H352V859H239Z', label: [295,763] },
    { number: 132, name: 'Rodin · Diekman Gallery', outline: westOctagon, label: [303,538] },
    { number: 134, name: 'Meier Family Galleria', outline: 'M263 357H580Q599 388 642 389H709L730 379V425H561V407H365V392H319V407H263Z', label: [468,381] },
    { number: 141, name: 'Wilsey Classroom', outline: 'M262 187H364V327H262Z', label: [312,258] },
    { number: 142, name: 'Contemporary Art · Pigott Gallery', outline: 'M364 187H600V328H580L598 357H364Z', label: [480,270] },
    { number: 151, name: 'Eastman Auditorium', outline: rotunda, label: [672,264] }
  ],
  [
    { number: 201, name: 'Indigenous American Art · Reller Gallery', outline: eastOctagon, label: [1060,538] },
    { number: 205, name: 'Indigenous American Art · Rehmus Gallery', outline: 'M1004 666H1125V859H1004Z', label: [1064,763] },
    { number: 206, name: 'Ancient, Medieval & Early Modern European Art', outline: 'M831 666H1004V859H831Z', label: [918,763] },
    { number: 207, name: 'Artist Archive Room · Patricia S. Rebele Gallery', outline: 'M782 827H831V888H782Z', label: [806,858] },
    { number: 208, name: 'Geballe Family Balcony', outline: 'M531 614H831V827H782V659H581V827H531Z', label: [680,638] },
    { number: 210, name: 'Temporary Exhibition · Gibbons Gallery', outline: 'M365 406H561V614H530V666H318V641H345L405 580V496L345 436H365Z', label: [475,520] },
    { number: 211, name: 'Temporary Exhibition · Halperin Gallery', outline: 'M561 425H751V567H561Z', label: [655,496] },
    { number: 212, name: 'Artist Archive Room · Rowland K. Rebele Gallery', outline: 'M531 827H581V888H531Z', label: [556,858] },
    { number: 213, name: 'European and American Art · Mondavi Gallery', outline: 'M357 666H531V859H357Z', label: [445,763] },
    { number: 214, name: 'European and American Art · Sigall Gallery', outline: 'M239 666H357V859H239Z', label: [297,763] },
    { number: 218, name: 'Contemporary Art · Oshman Gallery', outline: westOctagon, label: [303,538] },
    { number: 220, name: 'H. L. Kwee Galleria', outline: 'M263 357H580Q611 381 642 373H709L730 367V425H561V407H365V392H319V407H263Z', label: [470,381] },
    { number: 221, name: 'Temporary Exhibition · Freidenrich Gallery', outline: 'M263 187H600V328H580L598 357H263Z', label: [427,270] },
    { number: 242, name: 'Sculpture Terrace · McMurtry Terrace', outline: rotunda, label: [672,264] }
  ]
];

export function openCantorGalleryPlan(): void {
  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-dialog';
  dialog.setAttribute('aria-labelledby', 'gallery-heading');
  dialog.innerHTML = `<header><div><p>Cantor Arts Center</p><h2 id="gallery-heading">Gallery floors</h2></div>
    <button type="button" class="icon-button" aria-label="Close gallery floors">${icon('close')}</button></header>
    <nav aria-label="Museum floor"><button type="button">First floor</button><button type="button">Second floor</button></nav>
    <svg class="gallery-diagram" viewBox="165 130 1035 790" aria-hidden="true"></svg>
    <label>Gallery or space<select></select></label>
    <footer>Approximate outlines from the museum’s visitor map. <a href="${CANTOR_PLAN_URL}" target="_blank" rel="noreferrer">Official floor plan (PDF) ↗</a></footer>`;
  const diagram = dialog.querySelector('.gallery-diagram')!;
  const select = dialog.querySelector('select')!;
  const floorButtons = [...dialog.querySelectorAll('nav button')];
  function selectSpace(number: string): void {
    select.value = number;
    for (const space of diagram.querySelectorAll<SVGGElement>('[data-room]')) {
      space.classList.toggle('selected', space.dataset.room === number);
    }
  }
  function showFloor(index: number): void {
    const spaces = GALLERY_FLOORS[index];
    floorButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    // Room names and coordinates are local constants from the inspected plan.
    diagram.innerHTML = spaces.map(({ number, name, outline, label }) =>
      `<g data-room="${number}"><title>${number} · ${name}</title><path d="${outline}"/><text x="${label[0]}" y="${label[1]}">${number}</text></g>`
    ).join('');
    select.replaceChildren(...spaces.map(space => new Option(`${space.number} · ${space.name}`, String(space.number))));
    selectSpace(index === 0 ? '111' : '208');
  }
  floorButtons.forEach((button, index) => button.addEventListener('click', () => showFloor(index)));
  diagram.addEventListener('click', event => {
    const number = (event.target as Element).closest<SVGGElement>('[data-room]')?.dataset.room;
    if (number) selectSpace(number);
  });
  select.addEventListener('change', () => selectSpace(select.value));
  dialog.querySelector('header button')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  showFloor(0);
  dialog.showModal();
}
