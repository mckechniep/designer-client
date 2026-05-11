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
  iconSubjects: string[];
  paletteSystem: string;
  referenceAnalysis: string;
  referenceLinks: string[];
  selectedDirection: {
    summary: string;
    title: string;
  };
  visualDislikes: string;
  brandNotes: string;
  feedbackInterpretation: Pick<StructuredInterpretation, "changes" | "locked">;
}

export interface ThemeSpec {
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    heading: string;
    body: string;
  };
  notes: string[];
}

export interface ButtonSpec {
  normal: Record<string, string>;
  pressed: Record<string, string>;
  disabled: Record<string, string>;
  css: string;
}
