# Root correction to the proposed instrument change

This addendum narrows the proposal in REPORT.md before independent review. No source edit or additional native run occurred. The original report and its first handoff freeze remain unchanged.

Five crash arms already repeated successful outer accounting for up to 500 ms while retaining the original owner process and thread handles, and they reached zero. The 19 non-crash arms performed exactly one immediate query with those handles retained. Termination mode and repeated observation differ together. Therefore run 01 does not establish that retained references cause the failures or that releasing those references is necessary. The ActiveProcesses documentation is a lead, not a measured causal explanation.

The smallest proposal for independent review is to preserve the same original handles, original-owner wait and exact zero oracle, add raw exit-code/accounting observations, and repeat successful outer accounting observations before scoring and before rescue. This aligns the two existing scoring paths without changing process authority. An accounting error stays unknown/failed; a nonzero population stays failed/pending, and timeout cannot produce success. The negative controls, 28-arm denominator and creation-window UNAVAILABLE stay unchanged. No handle-release causal claim follows from a pass of this narrower change.

Any later comparison that releases completed original-owner handles, or any additional survivor-liveness instrumentation, remains a distinct proposal requiring independent review before native execution. Existing outer rescue and final census observations prove cleanup within their stated bounds; they do not settle the accounting cause or independently validate the raw EXPECTED_RED labels.
