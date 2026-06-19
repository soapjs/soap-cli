import { BrunoGenerationAnalysis } from "../commands/generate/bruno-analysis";
import { PromptAdapter } from "./prompt-adapter";

export type GenerateBrunoMode = "missing" | "all" | "e2e" | "abort";

export interface GenerateBrunoPromptAnswers {
  mode: GenerateBrunoMode;
}

export async function promptGenerateBruno(
  prompt: PromptAdapter,
  analysis: BrunoGenerationAnalysis
): Promise<GenerateBrunoPromptAnswers> {
  const mode = await prompt.select<GenerateBrunoMode>({
    message: "Bruno generation mode",
    choices: [
      {
        label: `Generate missing only (${analysis.missingCount})`,
        value: "missing",
        disabled: analysis.missingCount === 0 ? "No missing Bruno files" : undefined,
      },
      { label: "Regenerate all unmodified generated files", value: "all" },
      { label: "Generate E2E flow", value: "e2e" },
      { label: "Abort", value: "abort" },
    ],
    defaultValue: analysis.missingCount > 0 ? "missing" : "all",
  });

  return { mode };
}
