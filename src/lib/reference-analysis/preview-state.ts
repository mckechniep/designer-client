export interface ReferencePreviewState {
  errorMessage?: string;
  sourceUrls: string[];
  status: "idle" | "skipped" | "succeeded" | "failed";
  summary?: string;
}
