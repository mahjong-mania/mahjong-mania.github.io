# Mortal CPU improvement run — 2026-11-11 JST

User scope: strengthen **four-player hard mode** and **three-player 華4シュバ五等**, using Mortal as the base. Deadline **2026-11-11 10:00 Asia/Tokyo = 2026-11-11 01:00 UTC**. Save learning data at least every **15 minutes**, including if chat tokens are exhausted. No paid resources or public deployment requested.

## Current implementation and limits

- Source: `/workspace/mahjong-mania`, branch `cpu/mortal-house-rules`. Original expert CPU baseline: `33451ecdc58e38a3aa37ff138a85b1a148aa416c`.
- Real four-player and three-player Mortal inference works. Runtime: `/workspace/mortal-runtime/venv/bin/python`. Three CPU cores, no GPU.
- The downloaded Akagi v2 models are explicitly **small/weak reference models**, not the strong hosted Mortal models. They are not a strength guarantee. Source pinned to `shinkuan/Akagi@91cc2993e4e3682248d33d73d93afe055040e700`; every downloaded asset has a SHA256 in `assets.json`. Reproducible fetcher: `scripts/cpu/fetch-runtime.py`.
- Akagi v2 carries **AGPL-3.0 + Commons Clause**; upstream Mortal is AGPL. Local experiments and backup only. The model binaries are outside the public site/repository; do not upload them as site assets. Before any public inference service or model distribution, resolve the actual model/code terms and required source/attribution.
- Mortal provides discard/riichi action scores. Game legality, wins, north extraction, calls, and unsupported cases still use the existing rule engine/CPU. This is a hybrid, not complete custom-rule Mortal training.
- Frozen Mortal backbone embeddings feed an experimentally trained DQN output layer. Teacher distillation uses legal expert CPU choices; a small clipped Monte Carlo chip-return loss and a base-model anchor accompany it. No backbone retraining or full GRP/self-play RL pipeline is claimed. Training loss is not playing strength.
- The correction considers shanten/live waits, furiten, public threats, actual conditional gem/chip scoring, and shuba risk/cost. Known losing discards against exposed open-riichi hands are excluded when alternatives exist. Probabilities and future chip estimates remain heuristics.
- Non-public other hands, wall contents and hidden ura are excluded from inference/correction. Sanma's native input uses its expected four-slot wire format with a dummy fourth slot; its model itself is the three-player model. An all-flower indicator set is unsupported and explicitly counted as a fallback.

## Exact target rules

Four-player: `nekkyou:true, cpuLevel:'expert'`, engine's default hard gem selection, four seats rotated in evaluation.

Sanma matches the UI's **華4シュバ五等** preset:

```js
{house: E.Sanma.H.PRESET,
 flowerCopies: 1, pocchiTypes: ['normal'], pocchiIppatsuDice: false,
 flowerRules: {spring:'tulip', summer:'rank', autumn:'double', winter:'dice'},
 cpuLevel: 'expert'}
```

The early wrong-flower bootstrap run is quarantined under `training/archive/v0-wrong-sanma-flower-settings`; never pool it into evaluation. Study v1 validated the exact rules; v2 added a strict exposed-hand safety filter, model SHA tracking, and seed-cluster intervals. v1 final state is retained under each mode's `versions/`. Current trials use distinct trial/seed ranges after the source change. Their public decision traces remain useful training inputs.

## Running jobs and data

Data root: `/workspace/mahjong-training`. Each mode has `state.json`, `runner.lock`, append-only `games.jsonl`, `trials.jsonl`, compressed `trace-*.json.gz`, `models/*.pth`, `models/training-state.pth`, and `models/latest.json`. Each completed paired comparison fsyncs its record and atomically replaces its state. Failed games are separate records; fail-fast after 20 failures.

```bash
node scripts/cpu/continuous.js four
node scripts/cpu/continuous.js sanma
python scripts/cpu/report.py
```

Two processes are already running. **Read PID from each lock and verify it before starting anything.** Do not start a second runner on the same mode. If a process is dead, inspect its runner/failure log, fix the cause, remove only the stale lock, and restart to resume. SIGTERM is handled between paired games; wait for lock release before restarting. New source/policy versions must not be mixed into existing trial results: record the code hash, archive state, reset the active trial and use a new trial number/seed range.

The controller alternates correction search and independent confirmation. It retrains the output head on accumulated public traces approximately every 15 minutes when between screening trials, and compares immutable head snapshots. Reservoir sampling caps head-training memory. Final-evaluation traces are excluded from head training.

Before the deadline's last 30 minutes, freeze the incumbent. During that window, run independent final evaluation with no further tuning; combine fixed-candidate final batches. Objective: **rank chips + bonus chips**. Intervals cluster all seats sharing a wall seed and use an approximate Student-t correction. Repeated exploratory confirmations are not final strength evidence. The final adoption flag also requires enough independent seeds, at least 98% actual inference coverage, and no game failures. Do not deploy from a positive screening score or falling training loss.

`report.py` writes `/workspace/mahjong-training/report.json`; actual counts and errors are there. As of the initial setup, both modes have trained output-head snapshots, over 2,000 baseline/candidate matches have completed, and no independent final improvement is yet proven.

## Fifteen-minute checkpoint and recovery

An independent process `python scripts/cpu/checkpoint.py` saves every **900 seconds** through the deadline. It keeps running independently of chat inference while this environment remains running. Verify PID via `/workspace/shared/mahjong-checkpoints/watchdog.json` and check `latest.json`/`history.jsonl`. If a snapshot is over 15 minutes old, repair the watchdog and save immediately. Use SIGTERM and wait for the watchdog lock to release before replacing it.

```bash
python scripts/cpu/checkpoint.py --once
python scripts/cpu/checkpoint.py --restore /workspace/shared/mahjong-checkpoints/ARCHIVE.tar.gz --to /tmp/mahjong-recovery
```

Snapshots include source, data, seeds, optimizer state, learned/base weights, native extensions and dependency versions. Large immutable files are deduplicated by SHA256 under `objects/`; **keep that directory with the tar archives**. The restore command validates every object and refuses a non-empty destination. Restore into a separate directory; do not overwrite a running experiment. JSONL files are append-only; if a crash interrupted the last line, recover only complete JSON lines. Atomic state can resume from the last complete pair; an in-flight pair may be replayed with its recorded seed.

This protects against **chat token exhaustion**, not deletion of the entire managed environment. Local snapshots and the hourly task are not a guarantee that a deleted environment or an unavailable service can be restored.

An hourly continuation task is scheduled for 02:00–10:00 JST. It should inspect health, repair/restart jobs if needed, make evidence-driven improvements, and report at the deadline. At 10:00, do not start new trials; let an already started pair finish, confirm both runners stopped, make a final checkpoint, and report measured outcomes and limitations.

## Browser integration and validation

The browser bridge is opt-in. Static `mortal-config.js` disables inference so the existing public CPU remains the default. The loopback-only test server supplies same-origin configuration and a real inference endpoint:

```bash
/workspace/mortal-runtime/venv/bin/python scripts/cpu/serve.py --experimental
# http://127.0.0.1:8790/index.html?setup=1 or /sanma.html
```

Only expert/hard four-player or the target sanma preset uses it. Inference timeout/failure falls back to legal existing CPU decisions. Three-player async replies are invalidated on menu/pump/new-game changes. No public deployment has been performed.

Verified:

- `npm run test:cpu`: tile identities, meld conversion, hidden-hand/wall isolation, legal masking, exposed-hand safety.
- `python scripts/cpu/test-checkpoint.py`: autonomous periodic snapshots, actual model/data restore, partial-file exclusion, corruption detection.
- Real Python inference smoke matches for every seat in both modes.
- `PLAYWRIGHT_BROWSERS_PATH=/workspace/browser-cache node scripts/cpu/test-browser.js`: actual four-player UI inference, sanma preset inference, unavailable-service legal fallback.
- Existing UI, CPU-level, and sanma browser smoke tests pass. Commands use `SMOKE_ROOT=.` and, where applicable, `SMOKE_BASE=/` because this repository serves files from its root.
- `node scripts/build-pwa.js` updates pinned asset versions and offline cache. Keep runtime/log/test artifacts out of this build.

If re-provisioning, create the runtime venv, install CPU PyTorch/dependencies from `scripts/cpu/requirements-cpu.txt` using the official CPU wheel index, then run the pinned asset fetcher. Respect the managed environment's networking/package instructions.
