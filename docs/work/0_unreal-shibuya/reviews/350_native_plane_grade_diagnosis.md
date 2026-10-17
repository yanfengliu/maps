# Lane 53 grade arithmetic: confirmed false refusal

Bound: read-only investigation of the frozen current-corridor diagnostic, not Source3 geometry or native acceptance. No product files changed and no suite, producer, Surface construction or engine ran. Inputs and exact arithmetic are retained in observations.json.

The defect is support_source3.py:36–41, called by surface_network.py:1165: independently rounded absolute endpoint heights are subtracted before dividing by a very small positive distance. Lane 53 uses the same unchanged, admitted road source11/mesh0/primitive0/triangle3861 at both points. I independently hash-checked data/prepared/roads/data68.glb, decoded that face, applied the specified float32-centimetre conversion, and derived its exact plane with rational arithmetic. Its plane evaluations equal both exact height fractions in the diagnostic, rather than merely agreeing with its displayed gradient.

The points differ only in northing: 3.355502637860143 to 3.3555026378601434 metres, a positive span of 4.440892098500626e-16 m. The exact native-plane height delta is 8.464171486873497e-18 m and its directional grade is 0.01905961977714173, below 0.2. Rounding the two absolute heights to binary64 puts them in adjacent height bins, producing a one-ULP delta of 2.220446049250313e-16 m and the false grade 0.5. This is an arithmetic artifact on unchanged geometry, not evidence that the plane is too steep.

| Recorded case | Span m | Exact native-plane height delta magnitude m | Exact grade | Decision at 0.2 |
| --- | ---: | ---: | ---: | --- |
| lane-33 | 2.028530293021789e-8 | 0.1038254695969231 | 5118260.740501936 | Refuse |
| lane-53 | 4.440892098500626e-16 | 8.464171486873497e-18 | 0.01905961977714173 | Accept this grade only |
| lane-62 | 0.00019513154556085322 | 0.06873396763166617 | 352.2442639098094 | Refuse |

The smallest sound API correction for this observed case is to give the grade seam both admitted in-process hit identities and access to their actual native face. On an ordinary positive-span grade refusal, if both hits bind the same source record SHA/generation and flattened triangle, calculate the directional height delta A*dx+B*dy from that actual native triangle's plane. This avoids subtracting a shared absolute elevation. It needs no published format or source lineage change. Source metadata that merely describes a gradient is insufficient; derive the plane from the consumed vertices, with the existing axis and centimetre conversion.

A bounded exact rational comparison in this rare same-face fallback is sufficient: dz² <= maximum²*(dx²+dy²). It avoids both square roots and division; use the same grade threshold without increasing it. Retain the existing zero-distance unequal-height refusal before the fallback. Retain the current cross-triangle/provider discontinuity checks. A smaller change using only the already-rounded XYZ values cannot recover the lost plane-height delta or distinguish it from a real discontinuity.

Do not collapse nearby sample positions, snap query XY, or add a distance/height epsilon. The positive-length policy still applies at every scale. Lane 33 and lane 62 remain material geometry failures under exact heights; all66 finite-body passes do not waive them. This finding does not accept Source3 publication, native placement, source geometry, or performance.
