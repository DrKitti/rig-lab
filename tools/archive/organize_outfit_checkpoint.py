"""Archived one-time checkpoint organization. Do not rerun on the current layout.

Bulk mechanical path migration: current user rigs are re-read at execution time.
Copy promoted art first, then archive snapshots. No source image is overwritten.
Every move stays inside the validated repository, and the manifest records provenance.
"""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAPPING = {
    'hero-c3-B7': 'shared-master',
    'neutral-skeleton-c-v1': 'neutral',
    'time-travel-torso-fresh-master-v3': 'time-travel',
}
MANIFEST = ROOT/'assets/pipeline/checkpoint-manifest.json'
if MANIFEST.exists():
    raise SystemExit('Checkpoint organization already ran; refusing to overwrite provenance')
records = []

def inside(path):
    path = path.resolve()
    if path == ROOT or ROOT not in path.parents:
        raise ValueError(f'Unsafe target: {path}')
    return path

def copy(source, target, reason):
    source, target = inside(ROOT/source), inside(ROOT/target)
    if target.exists():
        raise FileExistsError(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    records.append(dict(source=source.relative_to(ROOT).as_posix(),
        target=target.relative_to(ROOT).as_posix(), purpose=reason,
        sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    return target

def move(source, target):
    source, target = inside(ROOT/source), inside(ROOT/target)
    if target.exists():
        raise FileExistsError(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(target))
    records.append(dict(source=source.relative_to(ROOT).as_posix(),
        target=target.relative_to(ROOT).as_posix(), purpose='archive/move'))

def write(path, obj):
    path = inside(ROOT/path)
    if path.exists():
        raise FileExistsError(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False)+'\n', encoding='utf8')

# Snapshot current editor data, including the current shared-library file.
rigs = {old: json.loads((ROOT/f'src/data/{old}.rig.json').read_text(encoding='utf8')) for old in MAPPING}
for old, rig in rigs.items():
    write(f'assets/experiments/checkpoint-before-organization/{old}.rig.json', rig)
copy('src/data/animations/neutral-c-v5.animations.json',
     'assets/experiments/checkpoint-before-organization/neutral-c-v5.animations.json', 'shared clips backup')

# Stable runtime artwork. Head identity is kept outside outfits.
copied_heads = set()
for old, rig in rigs.items():
    new = MAPPING[old]
    for key, source in list(rig['textures'].items()):
        if key == 'head':
            target = f'assets/characters/{"master-hero" if new == "shared-master" else "shared-hero"}/head.png'
            if target not in copied_heads:
                copy(source, target, 'runtime character head')
                copied_heads.add(target)
        else:
            name = {'torso_B': 'torso', 'arm_F': 'arm-f', 'arm_B': 'arm-b',
                    'leg_F': 'leg-f', 'leg_B': 'leg-b'}.get(key, key)
            target = f'assets/rigs/{new}/{name}.png'
            copy(source, target, 'active runtime texture')
        rig['textures'][key] = target
    rig['name'] = new
    rig.pop('clips', None)  # The shared library is authoritative; export resolves it.
    rig.pop('animationLibraryRevision', None)
    write(f'src/data/{new}.rig.json', rig)

# Preserve colour-pass source images and reproducible recipes, not runtime draft paths.
for outfit, folder, config_name in [
    ('time-travel', 'time-travel-material-match-v4', 'config.json'),
    ('neutral', 'neutral-material-match-v1', 'gray-config.json'),
]:
    base = ROOT/'assets/drafts'/folder
    cfg = json.loads((base/config_name).read_text())
    for job in cfg['parts']:
        stem = job['output'].split('-matched-')[0].split('-gray-')[0].replace('_', '-').lower()
        source = (base/job['source']).resolve().relative_to(ROOT).as_posix()
        target = f'assets/pipeline/sources/{outfit}/{stem}.png'
        copy(source, target, 'pre-palette source')
        job['source'] = f'../sources/{outfit}/{stem}.png'
        job['output'] = f'../../drafts/{outfit}-palette-rebuild/{stem}-{"gray" if outfit == "neutral" else "matched"}.png'
    if outfit == 'time-travel':
        cfg['reference'] = '../../approved/time-travel-neutral-ease-v1/fullbody.png'
        name = 'time-travel.materials.json'
    else:
        cfg['reference'] = '../sources/neutral/arm-f.png'
        name = 'neutral-gray.materials.json'
    write(f'assets/pipeline/recipes/{name}', cfg)

skin = json.loads((ROOT/'assets/drafts/neutral-material-match-v1/skin-config.json').read_text())
skin['reference'] = '../../characters/shared-hero/head.png'
for job in skin['parts']:
    stem = job['output'].split('-matched-')[0].replace('_', '-').lower()
    job['source'] = f'../../drafts/neutral-palette-rebuild/{stem}-gray.png'
    job['output'] = f'../../drafts/neutral-palette-rebuild/{stem}-matched.png'
write('assets/pipeline/recipes/neutral-skin.materials.json', skin)

for source, target in [
    ('assets/drafts/neutral-leg-simple-v1/leg-v1.png', 'assets/pipeline/neutral/leg-source.png'),
    ('assets/drafts/neutral-leg-simple-v1/leg-fitted-v1.png', 'assets/pipeline/neutral/leg-fitted.png'),
    ('assets/drafts/neutral-leg-simple-v1/prompt.txt', 'assets/pipeline/neutral/leg.prompt.txt'),
    ('assets/drafts/neutral-leg-simple-v1/leg-fitted-v1.json', 'assets/pipeline/neutral/leg-fit.json'),
    ('assets/drafts/neutral-parts-refresh-v1/torso-v4.png', 'assets/pipeline/neutral/torso-source.png'),
    ('assets/drafts/neutral-arm_B-fresh-v7/assembled/arm_F.png', 'assets/pipeline/neutral/arm-f-source.png'),
    ('assets/drafts/neutral-arm_B-fresh-v7/assembled/arm_B.png', 'assets/pipeline/neutral/arm-b-source.png'),
    ('assets/drafts/time-travel-leg-guide-v2/leg_F-prompt.txt', 'assets/pipeline/examples/time-travel/leg-f.prompt.txt'),
    ('assets/drafts/time-travel-leg-guide-v2/leg_B-prompt.txt', 'assets/pipeline/examples/time-travel/leg-b.prompt.txt'),
    ('assets/drafts/time-travel-leg-guide-v2/leg_F-v1.png', 'assets/pipeline/examples/time-travel/leg-f-source.png'),
    ('assets/drafts/time-travel-leg-guide-v2/leg_B-v1.png', 'assets/pipeline/examples/time-travel/leg-b-source.png'),
    ('assets/drafts/kolahon-outfit-pipeline-infographic-v1/pipeline-v2.png', 'docs/outfit-pipeline/figures/pipeline-overview.png'),
    ('assets/drafts/kolahon-outfit-pipeline-infographic-v1/prompt.txt', 'docs/outfit-pipeline/figures/pipeline-overview.prompt.txt'),
    ('assets/drafts/kolahon-outfit-pipeline-infographic-v1/edit-prompt-v2.txt', 'docs/outfit-pipeline/figures/pipeline-overview.edit-prompt.txt'),
    ('assets/drafts/shots/time-travel-material-match-v4-setup.png', 'docs/outfit-pipeline/figures/time-travel-color-before-after.png'),
    ('assets/drafts/shots/neutral-material-match-v1.png', 'docs/outfit-pipeline/figures/neutral-color-before-after.png'),
    ('assets/drafts/shots/foot-load-knee52-feet.png', 'docs/outfit-pipeline/figures/foot-load-comparison.png'),
    ('assets/drafts/time-travel-leg-comparison-v1/leg_F-comparison.png', 'assets/experiments/evidence/time-travel-leg-iterations.png'),
    ('assets/drafts/time-travel-leg-guide-v2/review/leg_F-v1-annotated.png', 'assets/experiments/evidence/time-travel-leg-review.png'),
]:
    copy(source, target, 'accepted reference, recipe or curated experiment evidence')

for version in ('v1', 'v2'):
    folder = ROOT/f'assets/drafts/leg-garment-envelope-guide-{version}'
    for path in folder.iterdir():
        if path.is_file():
            copy(path.relative_to(ROOT), f'assets/pipeline/guides/leg-envelope-{version}/{path.name}', 'historical guide example; update landmarks before reuse')

# Archive all obsolete rig definitions; they are data-only history, not build inputs.
for source in list((ROOT/'src/data').glob('*.rig.json')):
    if source.stem.removesuffix('.rig') in MAPPING.values():
        continue
    move(source.relative_to(ROOT), f'assets/experiments/rigs/{source.name}')

# Previously committed draft evidence gets an explicit archive location.
tracked = subprocess.check_output(['git', 'ls-files', 'assets/drafts'], cwd=ROOT, text=True).splitlines()
for path in tracked:
    if path.endswith('.gitkeep'):
        continue
    move(path, 'assets/experiments/history/'+path.removeprefix('assets/drafts/'))

for source, target in [
    ('assets/rigs/hero-c3', 'assets/experiments/runtime-origins/hero-c3'),
    ('assets/rigs/neutral-c-v4', 'assets/experiments/runtime-origins/neutral-c-v4'),
    ('assets/rigs/time-travel/leg_F.png', 'assets/experiments/runtime-origins/time-travel/leg_F.png'),
    ('assets/rigs/time-travel/leg_B.png', 'assets/experiments/runtime-origins/time-travel/leg_B.png'),
    ('assets/rigs/time-travel/README.md', 'assets/experiments/runtime-origins/time-travel/README.md'),
    ('docs/character-pipeline.md', 'docs/archive/character-pipeline-history.md'),
    ('docs/neutral-pipeline.md', 'docs/archive/neutral-pipeline-history.md'),
    ('docs/handoff.md', 'docs/archive/handoff-history.md'),
    ('docs/current-character-standard.md', 'docs/outfit-pipeline/standard.md'),
    ('tools/shared_animations.mjs', 'src/server/animation-store.mjs'),
    ('tools/test_shared_animations.mjs', 'tests/server/animation-store.test.mjs'),
    ('tools/test_match_materials.py', 'tests/pipeline/test_match_materials.py'),
    ('tools/test_blend_preview.ts', 'tests/editor/blend-preview.test.ts'),
    ('tools/test_mesh_settings.ts', 'tests/editor/mesh-settings.test.ts'),
    ('tools/promote_shared_c.py', 'tools/archive/promote_shared_c.py'),
    ('tools/lock_shared_arm_placement.py', 'tools/archive/lock_shared_arm_placement.py'),
    ('tools/compose_neutral_visible_arm.py', 'tools/archive/compose_neutral_visible_arm.py'),
    ('tools/extract_neutral_arms.py', 'tools/archive/extract_neutral_arms.py'),
    ('tools/prepare_neutral_leg.py', 'tools/archive/prepare_neutral_leg.py'),
    ('tools/verify_shared_c.py', 'tools/archive/verify_shared_c_history.py'),
]:
    move(source, target)

write('assets/pipeline/checkpoint-manifest.json', dict(
    checkpoint='outfit-pipeline-v5', aliases=MAPPING,
    notes=['Runtime copies are byte-identical to selected draft images.',
           'Archived experiments are not active build inputs; some reference local-only drafts.',
           'No approved source images were modified or moved.'], files=records))
print(f'Organized {len(records)} artifacts. No images overwritten. Manifest: {MANIFEST}')
