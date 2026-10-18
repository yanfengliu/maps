# Native PNG allocation-tail repair review

Author: `/root/unreal_capability/sky_capture_diagnosis`,2026-10-11. Reviewed helper SHA`5b3f7c02fbc69d3d31e363764dcda65d71fd68615d68a584214582a64faafce1`. Authored findings follow.

Scoped review passes with no open findings. `_native_png_prefix` validates signature, chunk bounds, CRCs and empty `IEND`, then returns an exact slice of original bytes. Bad signatures, CRC corruption, truncated IDAT/IEND, missing `IEND` and nonempty `IEND` all rejected in executed controls.

AST-extracted actual helper into a standard-library namespace and tested both preserved `084901` files. Fresh Pillow12.3.0 decoded original and returned prefix identically: all3,686,400RGBA channel bytes matched for each1280×720image.

| File | Retained prefix bytes | Removed bytes | Prefix SHA256 |
|---|---:|---:|---|
| Crossing |1,005,315 |167,912 |05cea1f96e9605ee518dd05f0423269fe337f92f93e19e92e01e7a4d2a4f2ec2 |
| Warmup |1,005,090 |168,137 |cd423129176acad2956f9afdf8ad860ae3f19a46caac0a104baa0f18cbdccd1e |

`export_capture` records original native hash and removed-tail count/hash before returning retained prefix hash. Executing its actual AST-extracted body against in-memory output objects confirmed written bytes, reported hashes and tail accounting agree for both fixtures. No raster decoding, recompression or pixel edits occur.

The helper validates framing and preserves bytes; it is not a complete PNG image validator. Previously reviewed host parser supplies chunk order, compressed population, opacity and capture-dimension checks. This review does not cover new photo dispatch/camera diagnostics or certify the active engine run. Original fixtures remained unchanged. No engine launched or files edited.
