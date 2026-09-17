/**
 * The GPU the appearance frames were drawn on, as the machine itself reports it.
 *
 * Why this exists. Until 2026-09-16 the 44-frame appearance set was captured on
 * SwiftShader, and the argument for that was that a pixel set captured on one
 * renderer cannot inherit a review written for another. The owner's instruction
 * — "if you can use GPU, don't use CPU" — replaced the trade: the frames are now
 * this machine's GPU pixels, drawn about fifty times faster, and what was
 * genuinely lost is that they are *those* pixels rather than any machine's.
 *
 * What pays for that is this file. The browser's own `WEBGL_debug_renderer_info`
 * string names the GPU but no driver, and a driver update is exactly the kind of
 * change that can move a frame; so the certificate carries the vendor's own
 * answer, read from the machine that ran the capture, beside the renderer string
 * the browser reported. A later run on a different GPU or a different driver
 * therefore fails the binding check rather than quietly reusing a review:
 * `gpuBindingRefusal` requires the browser's renderer string to name the GPU the
 * machine reports, and `verify-output.ts` refuses to certify when no identity can
 * be read at all.
 *
 * Bound: the identity is read once, at `--begin`, from the machine running the
 * gate — the earlier of the two facts the certificate binds, the scene and the
 * harness being digests of files on disk. It says nothing about the frames
 * themselves, and a driver replaced between that read and the capture is outside
 * what it can report.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** What the machine says its display adapter is. */
export interface GpuIdentity {
  /** The adapter's name, as the vendor's own tool or the OS reports it. */
  name: string;
  /** The driver version, in the source's own numbering. */
  driverVersion: string;
  /**
   * Which tool answered — `nvidia-smi` (the vendor's numbering, e.g. `616.64`) or
   * Windows' own device record (the WDDM numbering, e.g. `32.0.16.1664`). Two
   * numbering schemes that look alike, so the certificate says which one it has.
   */
  source: "nvidia-smi" | "win32-video-controller";
}

const PROBE_TIMEOUT_MS = 10_000;

/**
 * Ask the machine what GPU it has and which driver it is running.
 *
 * `nvidia-smi` first, because it is the vendor's own answer and it is the tool
 * that names the NVIDIA driver version people quote. Windows' own device record
 * is the fallback, and it answers for any adapter rather than only NVIDIA's.
 * Returns null when neither answers, which the caller reports rather than papers
 * over: an unnamed GPU is a certificate that cannot say what drew its frames.
 */
export async function probeGpuIdentity(): Promise<GpuIdentity | null> {
  const smi = await probeNvidiaSmi();
  if (smi !== null) return smi;
  return probeWindowsAdapter();
}

async function probeNvidiaSmi(): Promise<GpuIdentity | null> {
  try {
    const { stdout } = await run(
      "nvidia-smi",
      ["--query-gpu=name,driver_version", "--format=csv,noheader"],
      { timeout: PROBE_TIMEOUT_MS, windowsHide: true },
    );
    // One line per adapter. The gate draws on the first, which is the one
    // Chromium's D3D11 path takes on a single-GPU machine.
    const first = stdout.split(/\r?\n/).find((line) => line.trim() !== "");
    if (first === undefined) return null;
    const [name, driverVersion] = first.split(",").map((part) => part.trim());
    if (name === undefined || name === "" || driverVersion === undefined || driverVersion === "") {
      return null;
    }
    return { name, driverVersion, source: "nvidia-smi" };
  } catch {
    return null;
  }
}

async function probeWindowsAdapter(): Promise<GpuIdentity | null> {
  try {
    const { stdout } = await run(
      "powershell",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Get-CimInstance Win32_VideoController | Select-Object -First 1 Name,DriverVersion | ConvertTo-Json -Compress",
      ],
      { timeout: PROBE_TIMEOUT_MS, windowsHide: true },
    );
    const parsed: unknown = JSON.parse(stdout.trim());
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    const name = typeof record["Name"] === "string" ? record["Name"].trim() : "";
    const driverVersion =
      typeof record["DriverVersion"] === "string" ? record["DriverVersion"].trim() : "";
    if (name === "" || driverVersion === "") return null;
    return { name, driverVersion, source: "win32-video-controller" };
  } catch {
    return null;
  }
}

/** Why this identity cannot bind a frame set, or null when it can. */
export function gpuIdentityRefusal(identity: GpuIdentity | null, where: string): string | null {
  if (identity === null) {
    return (
      `${where} could not read the GPU and driver version from this machine. The 44 appearance frames are ` +
      "this GPU's pixels since 2026-09-16, and the certificate names the adapter and driver beside them so " +
      "a review stays bound to the hardware it was written for; a certificate with no GPU identity cannot " +
      "be compared with the next run's. The probe asks `nvidia-smi --query-gpu=name,driver_version` first " +
      "and falls back to Windows' own device record, so install or repair one of those before running the " +
      "gate."
    );
  }
  if (identity.name.trim() === "" || identity.driverVersion.trim() === "") {
    return (
      `${where} read a GPU identity with no name or no driver version (${JSON.stringify(identity)}), which ` +
      "cannot bind a frame set to the hardware that drew it."
    );
  }
  return null;
}

/**
 * Why this renderer string cannot be the pixel lane's *for this machine*, or null
 * when it can.
 *
 * The positive half of the renderer requirement. `pixelLaneRefusal` refuses a
 * software rasteriser by name and fires within seconds; this one refuses a
 * Chromium that drew on some other GPU, and it needs the machine's own answer to
 * do it. Both are needed: a denylist cannot tell "the RTX 4090 this run pinned"
 * from "an AMD card", and only the browser can say what it actually used.
 *
 * The comparison is a case-insensitive substring of the adapter name, because
 * Chromium's unmasked string spells the adapter with its own prefix and suffix
 * ("ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0,
 * D3D11)"). It is deliberately not a token match: a string that merely mentions
 * the model somewhere is not evidence that ANGLE ran on it.
 */
export function gpuBindingRefusal(
  renderer: string,
  identity: GpuIdentity,
  where: string,
): string | null {
  const named = identity.name.trim().toLowerCase();
  if (named !== "" && renderer.toLowerCase().includes(named)) return null;
  return (
    `${where} reports the renderer "${renderer}", which does not name the GPU this run pinned: ` +
    `"${identity.name}" (driver ${identity.driverVersion}, from ${identity.source}). The appearance frames ` +
    "are this GPU's pixels and are certified as such, so a run that drew them elsewhere — a different " +
    "adapter, a remote session, or a Chromium that ignored the launch flags — has to be re-run on the " +
    "machine the certificate names rather than certified against another machine's review."
  );
}
