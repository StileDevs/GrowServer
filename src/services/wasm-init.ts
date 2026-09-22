import { init as initWasmCore } from "growtopia.wasm";
import { WASM_BINARY_BASE64 } from "./wasm-binary";

/**
 * Initializes the growtopia.wasm WebAssembly module using the statically embedded binary.
 * Ensures 100% compatibility with standalone single-executable binaries (`bun build --compile`).
 */
export async function init(): Promise<void> {
  const wasmBuffer = Buffer.from(WASM_BINARY_BASE64, "base64");
  await initWasmCore({ module_or_path: wasmBuffer });
}
