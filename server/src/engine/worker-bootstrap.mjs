// Plain JS on purpose: `new Worker()` loads this file directly, and a worker
// thread's own module loader does not inherit tsx's ESM loader hooks (an
// execArgv/`--import` combination was tried empirically and still failed
// with ERR_UNKNOWN_FILE_EXTENSION on the .ts entry). `tsx/esm/api`'s
// `tsImport` is tsx's own supported way to load a TS module programmatically
// from plain JS, and does work here — verified empirically.
import { tsImport } from "tsx/esm/api";

await tsImport("./wasm-worker.ts", import.meta.url);
