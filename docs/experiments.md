# Experiment lessons: what failed, what we kept, what to test next

Current rules: [standard](outfit-pipeline/standard.md). Exact historical logs:
[archive](archive/README.md). This summary prevents repeating rejected approaches.

| Observation / failed approach | Why it mattered | Current decision |
|---|---|---|
| Repeatedly repainting a rejected whole sheet | Already-good parts drifted and accumulated errors | One complete part per call, stable refs; improve guide/prompt when retrying |
| Tracing tight Neutral contours into clothing | Trousers read as leggings or muscle-shaped fabric | Neutral is underlying anatomy; use garment envelope and internal folds |
| Inflating all widths to compensate | Balloon thighs/calves exceeded approved full-body design | Garment-specific volume; no universal widening ratio |
| Full-body standing foot angle used literally for both legs | Pair/perspective looked wrong for compact 2D motion | Mild right-facing 3/4 foot; separate F/B costume drawings |
| Torso's near shoulder looked like a wing; far side had extra connector mass | Double sleeves/sockets made assembly ambiguous | Accepted torso v4 has smooth receiving sides; moving sleeve belongs to arm |
| Arm_B bone started near shoulder edge and image was snapped to it | Far-arm elbow/attachment looked wrong | Accepted center-joint geometry; independent +12.2/-6 artwork anchor |
| Legacy drawn-pose toggle/rest-arm script | Confused saved setup versus what was being displayed | Removed; saved setup is authoritative |
| Old knee around 57%; trial 47% | Too-low versus too-high knee affected balance | User selected 52%, preserving total hip-to-ankle length |
| Vertical foot helper / foot following shin during a crouch | Sole angle/contact was wrong and art collapsed | Horizontal anatomical foot bone + planted/airborne control |
| Moving ankle to top of boot / using rigid rise | Solved stiffness in the wrong place; cuff/ankle looked too rigid | Pivot restored to malleolus, rigid rise removed; load capped at 4% |
| Colour families treated as materials | Skin, leather and gold can share similar hue bands | Explicit per-material regions with a shared palette reference |
| Different per-rig clips and ignored-draft texture paths | Cross-outfit editing and clean clone were unreliable | Shared library with revision conflict checks; stable runtime assets |

The earlier verbal explanation reversed the knee-percent direction once: a lower percentage
means a shorter thigh and a **higher** knee. The current JSON/spec/tests are the authority.

The maintained Pixi [crouch comparison](outfit-pipeline/figures/maintained-rigs-plant.png)
also exposes remaining shear in the older Shared Master's boot cuffs. Finite mesh vertices and
correct sole contact do not prove attractive costume deformation. Review artwork, transition
weights and motion range separately; do not move the frozen skeleton to hide an old-art problem.

## Selected art versus complete pipeline proof

Time Travel demonstrates that the shared setup, Neutral scaffold, garment guide and material
workflow can yield a reviewed outfit. It does not demonstrate universal one-shot generation,
universal guide contours or a completed game-ready animation set. A prompt must be read with
its actual input images; historical prompts contain older geometry numbers.

The complete accepted leg source/prompt pair is preserved under `assets/pipeline/examples/`.
Leg iteration and annotated review images are curated in `assets/experiments/evidence/`.
The infographic's character turnarounds are explanatory art, not additional required output views.

## Next experiment, in order

1. Integrate runtime rendering into Phaser with parity against Pixi, or run the second-outfit
   authoring proof in Rig Lab first if that better fits the main project's plan.
2. Generate a genuinely different second outfit end-to-end on the unchanged v5 skeleton.
3. Diagnose any failure by category: anatomy drift, garment ownership/overlap, fit, mesh weights,
   alpha, material masks or renderer implementation. Keep the skeleton frozen for this proof.
4. After passing, choose production resolution/atlas layout and animation locomotion policy.
5. Explore front/back accessory layers and independently moving cloth with explicit ownership.

Maintain a new experiment folder and written decision for each trial. Do not relabel a draft
as approved based only on a measurement report or an agent's enthusiastic visual review.
