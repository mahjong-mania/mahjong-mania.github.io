# Browser sanma AI

Selected model: Akagi v2 sanma 32x2 v4, frozen backbone with locally trained DQN head. Original Akagi revision 91cc2993e4e3682248d33d73d93afe055040e700. Selected checkpoint SHA256: 4817d9f067003c616a197b65e94e2c7290cbca4ab453589bfd6dd9e036d30193. Akagi's accompanying license is AGPL-3.0 with Commons Clause; see AKAGI-LICENSE.txt. This notice does not grant additional rights.

Encoder: Gandhara2077/MahjongAI-Sanma-Training revision 93b2fb5ab6aa996ae03bb4bf2620dd1bc87e6b4e, Mortal/libriichi, sanma feature and frozen version-4 deployment ABI. WASM wrapper derived from Mateces/mortal-sanma revision bf69bc320d6072bbeae2abfdc57bf876a5bab2e3. Both derive from Mortal. See ENCODER-LICENSE.txt (AGPL-3.0) and encoder-source.tar.gz for complete compiled Rust source, dependency lock and build configuration.

Build encoder-source with Rust 1.99.1, target wasm32-unknown-unknown, `cargo build --release --target wasm32-unknown-unknown`, then wasm-bindgen-cli 0.2.130 with `--target web`. Neural export, JavaScript implementation, training and validation scripts are in scripts/cpu/ and scripts/cpu/browser-prototype/ in this repository. The model is float32; do not replace it with an unvalidated quantized model.

All live inference executes on the user's device. Model/encoder files are fetched as static assets. No hands are sent to an inference API. Only the exact expert 華4シュバ五等 preset opts in. Four-player remains disabled. Initialization errors, unsupported histories and timeouts use the existing legal CPU.

Validation: 121 recorded inference cases matched native observations and masks exactly; neural Q maximum absolute error 0.00000252. One full static-browser match completed with 121 successful local inferences and one safe fallback. These conversion/integration checks are not a new independent strength study. The earlier +3.57-chip evaluation was of the native hybrid implementation. Physical Android/iOS WebView performance has not been measured.
