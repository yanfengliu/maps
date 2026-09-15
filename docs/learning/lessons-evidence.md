# Lessons evidence

## Bone corrections must match the delivered reference pose

**Anchor:** [Review 6](../work/0_shibuya-1km/reviews/6_implementation.md), accepted F6/F7, 2026-09-12. The reviewed controller is SHA-256 `368d7d6ce7cb913687c43ab3932e6dbafd6b0ce8d4a9407cf82fdde51410503c`; its rendered manifest is `182a0b635a91e9b991b4891fd953b99aa88855937e05c5ac8e48ed3521ecd29b`.

**Gate:** compare all drawn vertices with independently evaluated source geometry under an explicit quantization bound, then reconstruct the matching reference palette and test both zero correction and a controlled single-joint perturbation. Reintroducing the bind/idle reference mismatch must fail. This gate is not complete; the current probe is one near-LOD variant and no production repair is accepted.

The contact planner added corrected-bind skin minus bind skin to VAT that already contained an authored idle pose. Near-LOD head vertices carried about 35 mm of idle root drop, while dominant thigh/calf differences reached 109–136 mm and larger body residuals reached 431–576 mm. Soles still met the recorded flat-contact bounds across 378 cases: maximum planted drift 3.583476 mm and stance height 9.132385 mm. Those numbers remain valid within that instrument's scope; they did not validate the reference frame or full-body posture. Native full-mesh review exposed crouch and idle arms.

Zero correction alone can subtract the same wrong palette from itself and pass. Matching the evaluated Blender source, exact joint order, weights, mesh bind transforms, coordinate conversion and modifiers must precede that identity check. The 65 mm extra pelvis floor and fixed swing timing are separate F7 findings; removing the floor was not demonstrated as a complete repair and cannot substitute for the reference check.

## Process ancestry needs live identity

**Anchor:** Candidate 7b process-owner/process-cleanup evidence, 2026-09-12. Capture started 16:22:18 local. Windows process rows 8812/csrss and 4624/winlogon carried ParentProcessId 20264; 26020/fontdrvhost and 11712/dwm were children of 4624. All were created at 08:13:28 local. PID 20264 was later reused by a capture child. A PID-only transitive closure treated the old system rows as new descendants, and Stop-Process attempts were mislabeled as successful cleanup. Fresh inventory showed the four foreign processes still alive; they were preserved. No actual browser/server remained.

**Gate:** `test/process-ownership.test.ts` uses fake CIM rows only. The old closure explicitly admits all four wrong rows; the current classifier rejects older children, younger children of exited/reused parents and changed executable identities, while retaining positively known live orphans. Five tests pass on Windows and are visibly skipped elsewhere. A missing helper initially looked like an empty result because PowerShell continued after an execution-policy error; the test now uses a process-local script policy and stops on loading errors, without changing machine policy. The reviewed wrapper must pin each live parent and actual child process handle, revalidate exact creation/name/path identity, and terminate through those held objects, never by resolving the PID again. Native capture with confirmed cleanup remains the additional live bound before this lesson can retire.
