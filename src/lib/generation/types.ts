export interface GenerationLimitState {
  maxGenerations: number | null;
  usedGenerations: number;
}

export interface GenerationDecision {
  allowed: boolean;
  remaining: number | null;
}

export interface StructuredInterpretation {
  changes: string[];
  locked: string[];
  warnings: string[];
}

export interface MasterAssetPromptInput {
  appName: string;
  audience: string;
  desiredMood: string;
  likedColors: string[];
  dislikedColors: string[];
  fontPreferences: string;
  brandNotes: string;
  feedbackInterpretation: Pick<StructuredInterpretation, "changes" | "locked">;
}
