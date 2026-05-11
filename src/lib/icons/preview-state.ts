export interface IconSubjectPreviewState {
  errorMessage?: string;
  inputSignature?: string;
  status: "generated" | "idle" | "failed";
  subjects?: string[];
}
