/** Cached preparation only. Importing this entry never produces assets or starts Blender. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePreparationArguments, runPreparation } from './command.mjs';
import { CURRENT_776_PROFILE, assertInputProfile } from './profile.mjs';
import { FEMALE_SOURCE_INPUT, BAKER_INPUT, FEMALE_INPUTS } from './input-contract.mjs';
import { ownedDataPath, readPinned } from './paths.mjs';
import { LOCAL_WALK_PACKET_DIRECTORY, readLocalWalkPacket } from './packet.ts';

export async function ensureLocalWalk(options) {
  if (options.profile !== CURRENT_776_PROFILE.id) {
    throw Error(`Default walker preparation requires --profile ${CURRENT_776_PROFILE.id}; received ${String(options.profile)}. Run npm run data:local-walk.`);
  }
  const project = path.resolve(options.project);
  const directory = ownedDataPath(project, LOCAL_WALK_PACKET_DIRECTORY);
  try {
    assertInputProfile(project, options.profile);
    for (const input of [FEMALE_SOURCE_INPUT, BAKER_INPUT, ...FEMALE_INPUTS]) readPinned(project, input);
  } catch (error) {
    throw Error(`Default walker cached prerequisite is unavailable or differs: ${String(error)}. Restore the exact reviewed scene/network, commuter-female source and delivered LOD cache described in README.md, then run npm run data:local-walk.`);
  }
  if (fs.existsSync(directory)) {
    const files = readLocalWalkPacket(directory);
    return { status: 'verified-existing', directory, files: files.size, bytes: [...files.values()].reduce((sum, bytes) => sum + bytes.length, 0), productionReady: false };
  }
  // The unchanged producer refuses an existing reference directory, linked
  // output ancestors and missing Blender before extraction. It never installs a blob.
  await runPreparation(options);
  const files = readLocalWalkPacket(directory);
  return { status: 'prepared', directory, files: files.size, bytes: [...files.values()].reduce((sum, bytes) => sum + bytes.length, 0), productionReady: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ensureLocalWalk(parsePreparationArguments(process.argv.slice(2)))
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => { console.error(error); process.exitCode = 1; });
}
