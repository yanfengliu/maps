/**
 * The pieces of a third style, as text, for the registry probe.
 *
 * The probe adds a real option to the real registry and builds the real app, so
 * what it needs from here is the entry itself. It is written as a patch of
 * `src/world/styles.ts` rather than as a new module on purpose: the claim under
 * test is "adding a registry entry is all it takes", and a mechanism that also
 * needs a new import would not be that claim.
 *
 * The style is deliberately not a recolour of the two that ship: a distinct
 * facade mode, zero signage and zero bloom. If the dropdown offered the entry and
 * the renderer ignored it, the probe's frame comparison would show the same
 * picture as the style it replaced.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** The id the probe's style takes, and the label the dropdown must show for it. */
export const PROBE_STYLE_ID = "world-style-probe";
export const PROBE_STYLE_LABEL = "World style probe";

const ENTRY = `  Object.freeze({
    id: "${PROBE_STYLE_ID}", label: "${PROBE_STYLE_LABEL}", description: "A third registry entry, added by the registry probe.",
    facade: "procedural" as const,
    palette: Object.freeze({ ground: 0x2b2f3a, road: 0x14161c, sidewalk: 0x3a4150, building: 0x59617a, roof: 0x2a3040, window: 0x9fd8ff, vegetation: 0x24402f }),
    signage: 0, bloom: 0, wetness: 0,
  }),
]`;

/**
 * Add the probe entry to a tree's registry.
 *
 * Fails by name when the anchor it patches is gone, rather than writing a file
 * that no longer holds what the probe is about to claim about it.
 */
export async function addProbeStyle(tree: string): Promise<string> {
  const path = join(tree, "src", "world", "styles.ts");
  const source = await readFile(path, "utf8");
  if (source.includes(PROBE_STYLE_ID)) return path;
  const anchor = "]);\n\nexport const DEFAULT_WORLD_STYLE_ID";
  if (!source.includes(anchor)) {
    throw new Error(
      `src/world/styles.ts no longer ends its registry with the shape this probe patches. ` +
        `Expected to find ${JSON.stringify(anchor)}; the registry itself is what moved, so update the probe rather than the claim.`,
    );
  }
  await writeFile(path, source.replace(anchor, `${ENTRY}\n\nexport const DEFAULT_WORLD_STYLE_ID`), "utf8");
  const patched = await readFile(path, "utf8");
  if (!patched.includes(PROBE_STYLE_ID)) throw new Error(`Patching ${path} did not add ${PROBE_STYLE_ID}.`);
  return path;
}
