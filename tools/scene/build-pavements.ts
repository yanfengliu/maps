/** Rebuild the bounded reviewed pavement presentation and its source ledgers. */
import { readFile } from "node:fs/promises";
import { buildPavementPresentation, writePavementPresentation } from "./pavement-recipe.ts";

const built = await buildPavementPresentation(await readFile("data/scene/terrain.mesh"), await readFile("data/scene/roads.mesh"), console.log);
await writePavementPresentation("data/scene", built);
console.log(JSON.stringify(built.report.output));
