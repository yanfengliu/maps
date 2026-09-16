import { CONTROL_HARDWARE_FILE, CONTROL_HARDWARE_REBUILD, validateControlHardware, type ControlHardwareData } from "../world/control-hardware.js";
import type { NetworkData } from "../world/network-data.js";

export async function loadControlHardware(network: NetworkData, surfaces: { roads: string; pavements: string }): Promise<ControlHardwareData> {
  let response: Response;
  try { response = await fetch(CONTROL_HARDWARE_FILE); }
  catch (cause) { throw new Error(`Could not fetch ${CONTROL_HARDWARE_FILE}; run ${CONTROL_HARDWARE_REBUILD} and serve the derived scene directory.`, { cause }); }
  if (!response.ok) throw new Error(`${CONTROL_HARDWARE_FILE} returned HTTP ${response.status}; run ${CONTROL_HARDWARE_REBUILD}.`);
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new Error(`${CONTROL_HARDWARE_FILE} is not JSON; run ${CONTROL_HARDWARE_REBUILD} and check the /scene/ mount.`); }
  // Re-encode the already loaded validated object once. No duplicate network
  // fetch, and changes to lane width/support/direction invalidate this recipe.
  const bytes = new TextEncoder().encode(JSON.stringify(network));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const networkCanonical = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return validateControlHardware(data, network, { ...surfaces, networkCanonical });
}
