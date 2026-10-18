# Focused native pixel instrument re-review

Author: `/root/unreal_capability/sky_capture_diagnosis`,2026-10-11. Authored findings follow.

Focused re-review passes. All earlier material instrument findings are closed; no open findings within the requested scope. Reviewed and rehashed runner SHA`5c6992fa047efba2660e8f7e48efdefbb4fbf0bcbb1d2e34aceaa14ca983d7c6`, tests SHA`a3d5cfa93074149c8c56b4f1651637ea69bc7038222cd1a41ecde59700decab8`.

- Unsupported transparency/critical chunks and misplaced/repeated `IHDR` now reject.
- Missing/nonempty `IEND`, truncated/extra compressed streams, incomplete populations and nonopaque RGBA pixels reject.
- Inflation is bounded by declared population.
- Trailer metadata uses saved PNG end offset independently of scanline decoding.
- Runner requires actual1280×720 dimensions and387,072 sampled pixels for final and warmup images. Executing its exact extracted predicate rejected wrong width, height and population in each lane.

Nine unit tests pass: `python -B -m unittest discover -s tools/unreal -p test_mcp_run.py -v`.

Fresh Pillow12.3.0 again agrees exactly with the revised parser’s central metrics on both unchanged native files. Both retain `passed=False`: median12.6642, approximately48.98% below12. Trailer metadata matches independent audit: crossing167,912bytes SHA`aebce7a483626b79e47d8e73c6b2009ecce75dca10555e39ec4ad143426b49b2`; warmup168,137bytes SHA`c0f9c3dad821612997bb8a1cad52590192cb04e2dd846588d84f1c8fa639ab2c`.

Evidence supports validated native PNG pixel payloads and encoded central luma. It does not certify strict whole-file PNG conformance, photorealism or a complete renderer run. Original interrupted `084901` receipt remains unmodified and uncertified. No engine launched or project files edited.
