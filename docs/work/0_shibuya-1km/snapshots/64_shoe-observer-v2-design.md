# F34 repair: inner and outer finite contact

Owner: `shoe_contact_repair`. Base: `d7c8eea43c1cbfc6e85bcd01306fd43898be6b66`. This design was sent to root before implementation and accepted. The original candidate and Review60 remain unchanged. The first instrument is the existing `artifacts/contact/check.mjs` actual-source runner, copied byte for byte; separate public-API analytic cases cover the uncertainty defect it missed.

## Contract

The selected support triangles and the supplied `loadPoint` are exact inputs to this finite query. `packingErrorM` bounds the Euclidean error of each supplied shoe vertex relative to its packed position, in world metres. It does not bound the load point, select a support, or cover an omitted triangle. A caller with an uncertain load point must not describe that point as exact. No new load-error parameter or source policy is introduced here.

The two physical thresholds remain strict normal distance below 0.015 m and planted Euclidean displacement below 0.005 m. The existing arithmetic guard remains separate from packing error: `epsilon = packingErrorM + 128 * Number.EPSILON * extent`. This guard is the existing finite double-precision convention, not a formal directed-rounding certificate. Support planes remain fixed upward height fields. Nominal patch vertices and their center remain evidence, but never establish a guaranteed hull boundary.

## Geometry

Represent a point on a shoe triangle by its barycentric weights. Applying the same weights to any allowed perturbed vertices moves that point by at most the maximum vertex error, by the triangle inequality. Orthogonal projection onto a fixed support plane is nonexpansive. Discarding Y is also nonexpansive. Thus the projected X/Z point moves by at most that same error, and its signed distance to any unit support-edge half-plane changes by at most the error. Signed normal distance to the support plane has the same bound.

The inner polygon clips the nominal shoe triangle against each support edge inset by epsilon, and both normal-band edges inset by epsilon. Every retained barycentric point has a corresponding actual contact point under every allowed vertex perturbation. Its nominal projected position is only a representative: the actual point can still move by epsilon. The code therefore builds the candidate passing hull from resolved positive-area inner polygons and requires the exact load point to be more than epsilon inside every hull edge. The band inset preserves contact membership; the hull inset separately pays for contact-point displacement. Neither changes a physical threshold or spends an unstated load-point budget.

The existing area uncertainty expression, perimeter times epsilon plus pi times epsilon squared, bounds the declared positive-area decision. A collapsed or unresolved inner polygon cannot establish contact by itself. Closed clipping retains the boundary, but the arithmetic guard in epsilon leaves slack beyond the measured packing error before the strict physical band. Nominal patches retain their old geometric records; their `verdict` now reports only whether the corresponding inner region resolves positive area. They must not be used as the passing hull.

The outer polygon clips against support edges expanded by epsilon and the normal band expanded by epsilon. Any actual contact has a nominal barycentric preimage inside this polygon. Therefore the actual contact hull lies within epsilon of the hull of all outer projected vertices. A load farther than epsilon from that outer hull definitely lacks support under this contract. A load between the inner and outer decisions is uncertain. Point and segment outer hulls remain possible contact evidence because vertex perturbation may open a collapsed nominal region; they are not discarded on area alone. Empty outer geometry establishes failure. Required banks use the same resolved-inner versus nonempty-outer distinction.

No division by the angle between shoe and support planes occurs. In the nearly parallel F34 case, clipping the inset band directly moves the inner boundary by the amplified amount that the old center-based check missed.

## Scope and verification

Whole-triangle height-field clearance, uncovered nominal pieces, plant sample identity and Euclidean drift retain their previous algorithms. This repair establishes the bounded contact/hull uncertainty behavior, not a broader proof of arbitrary uncertain collision geometry. It does not introduce force, ankle motion, anatomy, continuous collision, actual-city stance, gait lifecycle, shader or visual acceptance.

Both Review60 counterexamples must fail the new regression assertions against the exact old source, then become uncertain under the repair. Their displaced or actually rounded poses remain negative controls. Interior and outside-possible-hull neighbors must remain useful positive and negative controls. Additional cases cover the lower band, support-edge expansion, strict thresholds and collapsed inner/outer sets. All eight old unit cases and all 49 unchanged actual-source controls must retain their expected outcomes. Focused strict types must pass. Root owns full gates, independent review and any integration.
