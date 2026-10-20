# Lessons

- A restored GeoJSON source does not prove its custom 3D layer survived graphics-context loss: MapLibre serializes standard layers only. The idempotent attachment path now recreates custom detail independently and passed actual loss/restoration with full readiness. Retiring gate: a reusable browser recovery check that first fails with the source-exists early return restored, then passes with the custom layer reattached; the current private successful flow alone does not retire it.

- Camera input checks must settle earlier animation before attributing a later change to a new control. The first auxiliary search-focus probe sampled an unfinished tilt; a settled comparison passed without a product fix. Retiring gate: a reusable real-browser input-isolation check with an intentionally ongoing prior flight, a stable pre-input pose and a wrong early-sample negative observed red. The corrected private flow alone does not retire that gate.
