# 1435a — Source-evidence finding

Review target: five-file freeze `code-freeze.json`, SHA-256 `f444b4991d8a16252f95a93563ba0412934ecae91dd77de232591e8c3e530013`, base `7e104ed84316debb1c2ac034b6076e605d22516c`. This is a finding round, not final product acceptance.

**1435-F1 (evidence, correction required):** `artifacts/office-band1434/extract-gml.py:6` writes each extract with `Path.write_text`, which translates LF to CRLF on Windows. Line 7 records the preceding `x.encode()` bytes instead of the resulting file. Consequently `source-gml.json` does not pin the three files its paths identify.

| Extract | Actual raw bytes | Actual SHA-256 |
| --- | ---: | --- |
| gml-0.xml | 105977 | 98408bc4aa93a9ae81abad34d82c1a54bccbe5c87486f7d56982840836cdddfe |
| gml-1.xml | 62772 | b47880b5da28e109783459810b0c52e94d4fd8ffdf3aeca65a22c10bc327f91b |
| gml-2.xml | 37492 | 3cd0b1f071b87ed36d31e3d87ae5446a04bca65993a95602827f5a02b0187f85 |

Independent readback confirms that CRLF-to-LF normalization gives the original receipt's exact three byte counts and hashes. The normalized extracts also equal the corresponding complete `<bldg:Building>` spans in the actual original GML. That full file independently hashes to `88dab9e2cc41dc75b37a83ca3ad78dfa0eb1f081b918af56fc79851c80150724`. This is an artifact-identity error, not changed building metadata or a product-code defect.

Disposition requested: preserve the old receipt and all extracts, then add a corrected raw-file receipt describing the line-ending difference. No source or capture rerun is needed for this evidence-only correction. Root accepted the finding and assigned correction; fresh corrected-file readback remains pending for the final review.

Scope: read-only review; no gate, test, browser, GPU, server or CLI reviewer launched. Native original atlas crops inspected: hotel `495d2586e5dfd3d26c2a087fe205e4e1901524221332bba25b78a44eaa937d4a`; office15 `f1cc2b7536e10baa015ac44c7bf5b13cb0dfec026af3334e3467d88e8801a717`; office24 `f6afade1eaa13582306936b8fa048f5cb25c37eef48eed4449941d7d11979c77`. Final geometry, native-capture and integrated-gate verdict is pending.