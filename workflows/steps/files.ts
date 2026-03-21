import { generateText, Output } from "ai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { getPrimaryModel } from "@/lib/ai/models";

const FileExtractionSchema = z.object({
  candidates: z.array(
    z.object({
      path: z.string().describe("File path relative to repo root"),
      reason: z.string().describe("Why this file is suspected"),
      confidence: z.number().min(0).max(1).describe("Confidence 0-1"),
    })
  ),
  searchNotes: z.array(z.string()).describe("Notes about the search process"),
});

export type FileExtraction = z.infer<typeof FileExtractionSchema>;

export async function extractFilesStep(input: {
  runId: string;
  repo: { owner: string; name: string; defaultBranch: string };
  parsedIncident: {
    suspectedRootCause: string;
    likelyComponents: string[];
    reproductionRecipe: { steps: string[] };
  };
}): Promise<FileExtraction> {
  "use step";

  const prompt = [
    `Repository: ${input.repo.owner}/${input.repo.name}`,
    `Suspected root cause: ${input.parsedIncident.suspectedRootCause}`,
    `Likely components: ${input.parsedIncident.likelyComponents.join(", ")}`,
    `Reproduction steps: ${input.parsedIncident.reproductionRecipe.steps.join("; ")}`,
    "",
    "Based on the incident analysis above, identify the files in this repository most likely to contain the bug.",
    "Consider common project structures, naming conventions, and the error signatures described.",
  ].join("\n");

  const result = await generateText({
    model: getPrimaryModel(),
    system: SYSTEM_PROMPTS.extractFiles,
    prompt,
    output: Output.object({ schema: FileExtractionSchema }),
    providerOptions: {
      google: { thinkingConfig: { thinkingLevel: "medium" } },
    },
  });

  if (!result.output) {
    throw new Error("Model failed to produce structured file extraction output");
  }
  return result.output;
}
