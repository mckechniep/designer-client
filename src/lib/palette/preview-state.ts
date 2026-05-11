import type { PaletteSystem } from "./spec";

export interface PalettePreviewState {
  errorMessage?: string;
  inputSignature?: string;
  palette?: PaletteSystem;
  status: "failed" | "generated" | "idle";
}
