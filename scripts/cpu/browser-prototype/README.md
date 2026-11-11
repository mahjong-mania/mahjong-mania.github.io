# Local browser Mortal inference prototype

This prototype executes the selected 32x2 v4 sanma neural model in plain JavaScript, including batch normalization, residual blocks, Mish, channel attention, and masked dueling Q scores. It does not execute Python or require a remote inference API.

`export.py` exports the selected checkpoint to `/workspace/mahjong-browser-prototype/` and captures native observation/mask fixtures from six real decision histories. `test-browser.js` runs those inputs in Chromium with page network requests blocked and compares all legal Q values and selected actions with PyTorch. Run with `PLAYWRIGHT_BROWSERS_PATH=/workspace/browser-cache node scripts/cpu/browser-prototype/test-browser.js`.

The model binary and fixtures remain outside public site assets. Model/runtime upstream terms still apply. This is not a complete browser AI integration: replay-to-observation encoding and native legal mask generation are not ported. Do not substitute guessed channels, zero observations, or captured fixtures for live gameplay. Desktop Chromium timing is not mobile WebView timing. The six fixtures are a conversion smoke test, not a new strength evaluation.

Next integration milestone is to port the matching libriichi3p state/observation encoder to WASM or JavaScript, verify it channel-by-channel against native outputs across seats, calls, riichi and round changes, then run full browser games with the existing selected chip policy. Standard offline site CPU remains unchanged until then.

Follow-up validation: 24 recorded games / 121 native inference calls passed Chromium parity, all 121 argmax actions identical, maximum absolute legal Q error 0.0000025183. These fixtures are still native-generated input, not an end-to-end observation-port test.

Source candidate for the encoder: https://github.com/Mateces/mortal-sanma/tree/bf69bc320d6072bbeae2abfdc57bf876a5bab2e3/libriichi-wasm (AGPL-3.0). Its exported PlayerStateHandle supports apply_event, encode_obs(version, at_kan_select), and encode_obs_mask. Its README claims compatibility with Akagi 775x34 / 44 actions; independent channel-level validation is still required. The current tree contains full state encoding despite an older Phase 1a README. No compiled WASM release was found. Local source review is in /workspace/mahjong-browser-prototype/source-review. Rust/cargo are unavailable and remaining disk space is below 400MB; compilation has not been attempted. Do not claim this encoder is integrated or verified.

Build progress (2026-11-11): cloud compilation succeeded using /dev/shm/mahjong-wasm-build (tmpfs) with Rust 1.99.1, wasm32-unknown-unknown, wasm-bindgen 0.2.130. User's local PC is not required. Generated Node/web modules are in /workspace/mahjong-browser-prototype/wasm-node and wasm-web. The source commit is bf69bc320d6072bbeae2abfdc57bf876a5bab2e3. A diagnostic panic hook was changed to console.error; model semantics were not changed.

IMPORTANT compatibility failure: this source actually declares version 4 as 1012 channels but writes 780 channels, triggering its final assertion; version 5 writes 780 successfully. The selected Akagi native model expects version 4 / 775 channels. README interface claims are insufficient. `test-encoder.js` records failure on 121 event histories after removing the dummy fourth seat from scores/tehais/deltas. Do not truncate or zero-pad input to bypass this incompatibility. `wasm-v5-probe.json` contains ten candidate 780-channel observations for analysis, not production model input. Native-generated 775-channel neural browser parity still passes independently.

Rebuild in the prepared temporary environment:
```
export RUSTUP_HOME=/dev/shm/mahjong-wasm-build/rustup
export CARGO_HOME=/dev/shm/mahjong-wasm-build/cargo
export PATH="$CARGO_HOME/bin:$PATH"
cd /dev/shm/mahjong-wasm-build/source/libriichi-wasm
cargo build --target wasm32-unknown-unknown --release -j 2
/dev/shm/mahjong-wasm-build/wasm-bindgen-0.2.130-x86_64-unknown-linux-musl/wasm-bindgen --target web --out-dir /workspace/mahjong-browser-prototype/wasm-web target/wasm32-unknown-unknown/release/libriichi_wasm.wasm
```
The memory-backed build environment is temporary. Preserve source revision and diagnostic patch, not the toolchain, in long-lived data.
