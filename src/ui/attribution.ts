/**
 * The attribution surface. Plan item 8.
 *
 * The plan's acceptance criterion is that the *running app* shows its
 * attribution, so this builds a real DOM overlay rather than leaving the credit
 * in a file nobody opens.
 *
 * Shape: one dim line always on screen naming all three sources and their
 * licences, and a details panel behind it carrying each rights holder's own
 * required wording. The OSM Foundation's attribution guideline allows a credit
 * that collapses after interaction as long as the licence information stays
 * reachable from a control on the page, which is what the toggle is.
 *
 * Deliberately small and dim, and that is a constraint rather than taste. The
 * visual gate's "a frame that did not render" proof measures an empty scene's
 * luminance spread against a floor of 6, and the only thing drawn on that empty
 * scene is this overlay. Phase 0's version measured 2.84; this one was measured
 * the same way on 2026-09-06 and reads **2.20**, so the gate separates the two
 * cases slightly better than before. A larger or brighter overlay would push a
 * blank frame towards the floor and quietly stop it separating them at all.
 * Anything growing this surface should re-measure and update
 * `docs/learning/gate-proofs.md`.
 */

import { SHORT_CREDIT, SOURCES } from "../world/sources.js";

const STYLE = `
#attribution {
  position: absolute;
  right: 8px;
  bottom: 6px;
  max-width: min(46em, calc(100vw - 24px));
  font-size: 11px;
  line-height: 1.45;
  text-align: right;
  color: #e6e9ef;
  /*
    A shadow rather than a brighter colour or a panel behind the line. Over the
    scene's pale rooftops the credit was readable but faint, and it has to stay
    readable because it is a licence condition. A shadow adds dark pixels around
    the glyphs, so it raises contrast without raising the mean luminance of a
    frame that drew nothing — which is the number the visual gate's blank-frame
    floor depends on.
  */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}
#attribution summary {
  cursor: pointer;
  opacity: 0.55;
  list-style: none;
}
#attribution summary::-webkit-details-marker { display: none; }
#attribution[open] summary { opacity: 0.8; }
/*
  The credit line is anchored to the bottom of the window, so a panel that grew
  downward from it would open straight off the screen — which it did. It opens
  upward instead.
*/
#attribution .panel {
  position: absolute;
  right: 0;
  bottom: 100%;
  margin-bottom: 6px;
  width: max-content;
  max-width: min(46em, calc(100vw - 24px));
  padding: 10px 12px;
  text-align: left;
  background: rgba(16, 20, 26, 0.92);
  border: 1px solid rgba(230, 233, 239, 0.18);
  border-radius: 4px;
  max-height: 60vh;
  overflow-y: auto;
}
#attribution h2 {
  margin: 10px 0 2px;
  font-size: 11px;
  font-weight: 600;
}
#attribution h2:first-child { margin-top: 0; }
#attribution p { margin: 2px 0; opacity: 0.85; }
#attribution .required { opacity: 0.7; }
#attribution a { color: #9ec5ff; }
`;

function paragraph(text: string, className?: string): HTMLParagraphElement {
  const element = document.createElement("p");
  element.textContent = text;
  if (className !== undefined) element.className = className;
  return element;
}

/**
 * Replace the placeholder attribution element with the real surface.
 *
 * Throws rather than returning quietly when the element is missing: a licence
 * credit that silently fails to appear is the one failure mode this must not
 * have, and the app's boot handler turns a throw into a visible message.
 */
export function installAttribution(document: Document): HTMLDetailsElement {
  const placeholder = document.querySelector("#attribution");
  if (placeholder === null) {
    throw new Error(
      'No element with id "attribution" is in the document, so the map data credits have ' +
        "nowhere to go. index.html must contain it — PLATEAU, OpenStreetMap and GSI all require " +
        "attribution, so the app must not run without it.",
    );
  }

  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.append(style);

  const details = document.createElement("details");
  details.id = "attribution";

  const summary = document.createElement("summary");
  summary.textContent = SHORT_CREDIT;
  summary.title = "Show the full licence terms";
  details.append(summary);

  const panel = document.createElement("div");
  panel.className = "panel";

  for (const source of SOURCES) {
    const heading = document.createElement("h2");
    heading.textContent = `${source.label} — ${source.role}`;
    panel.append(heading);

    panel.append(paragraph(source.credit));

    const licence = document.createElement("p");
    licence.append(document.createTextNode(`Licence: ${source.licence} — `));
    const link = document.createElement("a");
    link.href = source.licenceUrl;
    link.textContent = source.licenceUrl;
    link.rel = "noreferrer";
    link.target = "_blank";
    licence.append(link);
    panel.append(licence);

    if (source.required !== undefined) {
      panel.append(paragraph(source.required.source, "required"));
      panel.append(paragraph(source.required.modified, "required"));
    }
    for (const note of source.notes ?? []) panel.append(paragraph(note, "required"));
  }

  details.append(panel);
  placeholder.replaceWith(details);
  return details;
}
