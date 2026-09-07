/**
 * Who the map data belongs to, and what each licence obliges. Plan item 8.
 *
 * Data, not presentation: `src/ui/attribution.ts` puts it on the screen. Every
 * string here is quoted from the rights holder's own terms page — the Japanese
 * forms in particular are the exact wording MLIT and GSI publish as their
 * required credit, so they are reproduced rather than translated.
 *
 * Both PLATEAU and GSI require two lines, not one: a source credit, and a
 * separate statement that the data was edited or processed. This project
 * reprojects, clips, retextures and converts, which is squarely 加工, so the
 * second line is not optional. GSI is explicit that processed data must not be
 * presented as if the agency made it.
 *
 * The provenance behind each choice — dataset ids, URLs, byte counts, checksums
 * — is in `docs/work/0_shibuya-1km/design.md` and `tools/data/manifest.ts`.
 */

export interface SourceAttribution {
  /** Short label for the collapsed credit line. */
  label: string;
  /** What this source supplies in the scene. */
  role: string;
  /** Licence name, as the rights holder states it. */
  licence: string;
  /** Where the terms live. */
  licenceUrl: string;
  /** One-line English credit. */
  credit: string;
  /**
   * The rights holder's own required wording, where they publish one.
   *
   * `source` is the credit and `modified` is the separate processing statement.
   * Both are required together wherever the data has been edited.
   */
  required?: { source: string; modified: string };
  /** Anything a reader or a later phase needs to know beyond the credit. */
  notes?: readonly string[];
}

export const SOURCES: readonly SourceAttribution[] = [
  {
    label: "PLATEAU",
    role: "Buildings and terrain",
    licence: "PDL 1.0, with CC BY 4.0 expressly permitted",
    licenceUrl: "https://www.mlit.go.jp/plateau/site-policy/",
    credit:
      "3D City Model (Project PLATEAU), Shibuya-ku FY2025 — Ministry of Land, Infrastructure, " +
      "Transport and Tourism, Japan. Modified: clipped to the area of interest, reprojected to " +
      "JGD2011 / Japan Plane Rectangular CS IX, and converted for real-time rendering.",
    required: {
      source: "出典：国土交通省 PLATEAUウェブサイト（https://www.mlit.go.jp/plateau/）",
      modified:
        "「3D都市モデル（Project PLATEAU）渋谷区（2025年度）」（国土交通省）" +
        "（https://www.geospatial.jp/ckan/dataset/plateau-13113-shibuya-ku-2025）を加工して作成",
    },
    notes: [
      "Copyright in the open 3D city model sits with the local authority, not with MLIT.",
      "No share-alike obligation, and commercial use is allowed.",
    ],
  },
  {
    label: "OpenStreetMap",
    role: "Road, sidewalk and crossing network",
    licence: "Open Database Licence 1.0 (ODbL)",
    licenceUrl: "https://www.openstreetmap.org/copyright",
    credit:
      "Map data from OpenStreetMap, licensed under the Open Database Licence (ODbL). " +
      "The scene itself is this project's work and is not OpenStreetMap's.",
    notes: [
      "The rendered scene is a Produced Work, so no share-alike attaches to it.",
      "The road network graph built from this data is a Derivative Database. ODbL section 4.6 " +
        "obliges this project to offer recipients that graph, or a description of how it was " +
        "made, once the app is published. It is kept in files of its own, separate from the " +
        "PLATEAU geometry, so that offer stays cheap to honour — see plan item 23.",
    ],
  },
  {
    label: "GSI",
    role: "Elevation cross-check",
    licence: "PDL 1.0, attribution only, no Survey Act application required",
    licenceUrl: "https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html",
    credit:
      "Elevation tiles from the Geospatial Information Authority of Japan, used to check " +
      "PLATEAU's terrain against an independent survey. Modified: decoded and sampled. No GSI " +
      "elevation data is drawn in this scene.",
    required: {
      source:
        "出典：国土地理院ウェブサイト（https://maps.gsi.go.jp/development/ichiran.html）",
      modified: "地理院タイル（標高タイル（基盤地図情報数値標高モデル））を加工して作成",
    },
    notes: [
      "Credited even though nothing from GSI is rendered, because the data was used and the " +
        "terms ask for a credit for use, not for display.",
    ],
  },
];

/** One line for the collapsed credit, naming every source and its licence in brief. */
export const SHORT_CREDIT =
  "Map data: PLATEAU (PDL 1.0 / CC BY 4.0) · OpenStreetMap (ODbL) · GSI — modified";
