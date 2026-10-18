# Independent native pixel instrument review

Author: `/root/unreal_capability/sky_capture_diagnosis`,2026-10-11. Reviewed runner SHA`700b03d5a2493486d15277cf409183738cb96882308a91e4806c81b4949c7460` and tests SHA`b5564b62d8491308e7c94c8b604d04fc0d05e6d6c2886bf1e22f7b81a773d706`.

The preserved pixel payloads are sound, but both crossing images fail the fixed darkness thresholds. The revised parser still needs two acceptance checks before candidate scoring.

1. [P1] Ignored chunks can change displayed pixels without affecting the verdict. The parser accepts repeated/reordered headers and silently ignores other chunks. A CRC-valid RGB80 image containing `tRNS=(80,80,80)` returns `passed=True`, although its displayed pixels are fully transparent. Unknown critical `FAKE`, duplicate `IHDR`, and `IDAT` before `IHDR` also return `passed=True`. Enforce the observed native format: one first `IHDR`, contiguous `IDAT` chunks, one empty `IEND`; reject unsupported chunks. PNG requires those ordering constraints and treats unknown critical chunks as fatal. [W3C PNG specification](https://www.w3.org/TR/png-3/)
2. [P1] The runner does not enforce actual capture dimensions. It accepts helper metrics without requiring actual1280×720 dimensions and387,072 sampled pixels. A32×32 gray image passes the helper. Keep small unit fixtures, but require fixed dimensions/population in the native capture acceptance path.

Earlier missing/nonempty `IEND`, unbounded inflation, extra zlib stream and RGBA transparency findings are fixed in this revision. Eight unit tests pass. The bounded inflater checks `eof`, unused data and unconsumed input; malformed/truncated payloads reject rather than pass.

Used CPython3.13.9 and actual fresh Pillow12.3.0 under `data/runtime/PIL`, with bytecode writes disabled. No engine launched or project files edited. Each native file contains125CRC-valid chunks: one `IHDR`,123`IDAT`, one empty `IEND`. Each zlib stream terminates cleanly with no unused compressed bytes and produces exactly3,687,120scanline bytes. Independently reconstructed all921,600RGBA pixels; all3,686,400channel bytes equal Pillow’s decoder output. Alpha is255 everywhere.

| File | Mean | Median | Below12 | Above245 | Darkness |
|---|---:|---:|---:|---:|---|
| crossing.png |51.636274920428235 |12.6642 |0.4898546006944444 |0 |Failed |
| crossing-warmup.png |51.636994334904095 |12.6642 |0.489715091765873 |0 |Failed |

Pillow and the instrument agree exactly on every metric. Mean difference0.00071941447586 supports this bounded luma convergence check. Original crossing SHA`85bd3c86c88f2b449f03202cd90b0d9b2295e1402a82c05b1a4f1ba720e10a95`; warmup SHA`febcc0082c7605b77efb08d968b46399a05c1d54435f80c3cf3868b8d7c59aca`.

Valid PNG prefixes end at1,005,315 and1,005,090bytes. Files contain167,912 and168,137additional bytes. Displayed-pixel validation succeeds; do not describe complete files as passing strict PNG conformance. Installed `ImageUtils.cpp:1280` serializes `CompressedData.GetAllocatedSize()` rather than used length. Spare allocation serialization is a source-supported explanation. Stop at validated empty `IEND`, preserve original bytes and record trailer length/hash separately.

Held controls observed: black/white fail; gray passes; trailers preserve pixel metrics; missing/nonempty `IEND`, CRC corruption, truncated IDAT, extra zlib streams and incomplete populations reject after fixes. Command: `python -B -m unittest discover -s tools/unreal -p test_mcp_run.py -v`.

Original `084901/report.json` remains `passed=False`, `darkness_gate.status="did-not-run"`, `captures=[]`. This diagnosis cannot certify that interrupted run or missing five views.
