# Reusable outfit inputs

`neutral/`: accepted/simple Neutral source art, fitted leg and original fit metadata.
`sources/`: pre-colour matched images, preserved for deterministic palette regeneration.
`recipes/`: current material configs, with versioned scratch outputs under ignored drafts.
`guides/`: historical garment guide templates; update joint landmarks to current v5 before reuse.
`examples/`: successful Time Travel leg source images and exact prompts, not universal recipes.
`checkpoint-manifest.json`: reorganization copies/moves and source hashes.
These provenance hashes describe the original source bytes before Git text normalization;
the active runtime manifest separately verifies exact published PNG bytes.

Approved full bodies remain under `assets/approved/`. Active colour-matched images are
under `assets/rigs/` and character heads under `assets/characters/`.
Read `docs/outfit-pipeline/tooling.md` for recipe order and quality checks.
