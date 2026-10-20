export function icon(name: 'search'|'close'|'arrow'|'bay'|'campus'|'chevron'|'plus'|'minus'|'compass'|'help'): string {
  const paths: Record<typeof name, string> = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    bay: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16M15 5v16"/>',
    campus: '<path d="m3 8 9-5 9 5-9 5-9-5Zm3 3v7m6-5v7m6-9v7M3 21h18M5 18h14"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    compass: '<path d="m12 3 5 15-5-3-5 3 5-15Z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.3 9a2.7 2.7 0 0 1 5.4 0c0 2-2.7 2-2.7 4m0 3v.1"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

export const campusIllustration = `<svg class="campus-art" viewBox="0 0 320 140" fill="none" aria-hidden="true">
<ellipse cx="178" cy="121" rx="134" ry="12" fill="#d6dfc5"/><path d="m35 117 120-40 130 36-112 27Z" fill="#e7d6b2"/><path d="m47 114 108-31 115 28-102 25Z" fill="#d5dfbd"/>
<path d="m59 99 90-25 91 23-84 25Z" fill="#c58a65"/><path d="m65 95 84-22 84 21-78 23Z" fill="#b35e48"/>
<path d="m71 101 78-21 78 19v14l-72 22-84-21Z" fill="#dcc5a0"/><path d="m84 99 66-16 62 16-59 17Z" fill="#d6dfbd"/>
<path d="m71 101 84 20v14l-84-21Zm84 20 72-22v14l-72 22Z" fill="#e8d4b0"/><path d="m81 109 4 1v9l-4-1Zm11 3 4 1v9l-4-1Zm11 3 4 1v9l-4-1Zm11 3 4 1v9l-4-1Zm11 3 4 1v9l-4-1Zm11 3 4 1v9l-4-1Z" fill="#9b8a6f"/>
<path d="M204 34 223 39v68l-19-5Z" fill="#e9d7b6"/><path d="m223 39 13-5v68l-13 5Z" fill="#c8ad86"/><path d="m201 33 19-7 19 7-16 7Z" fill="#ac5b45"/><path d="m207 27 13-5 13 4v8l-13 5-13-4Z" fill="#dec49e"/><path d="m205 26 15-8 15 7-15 6Z" fill="#b5654b"/><path d="M210 46v11m7-9v11m11-12v11" stroke="#a08b6b" stroke-width="3"/>
<path d="M52 119V93m0 1-13-5m13 4 11-8" stroke="#718865" stroke-width="2.5"/><path d="m52 94-17-10 15 2-1-12 7 11 12-7-6 13Z" fill="#879a73"/><path d="M271 123v-22m0 2-10-7m10 6 11-7" stroke="#718865" stroke-width="2.5"/><path d="m270 103-13-9 13 2-1-11 6 10 12-6-7 12Z" fill="#879a73"/>
</svg>`;
