import { NETWORK_FILE, type NetworkData } from "../world/network-data.ts";
import { validateNetwork } from "./validate.ts";

export async function loadNetwork(url = NETWORK_FILE): Promise<NetworkData> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Movement network ${url} returned HTTP ${response.status}; run npm run data:network and serve data/network at /network/.`);
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new Error(`Movement network ${url} is not JSON; run npm run data:network and check the /network/ static mount.`); }
  validateNetwork(data);
  return data;
}
