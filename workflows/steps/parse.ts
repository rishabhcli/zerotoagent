import { generateText, Output } from "ai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { getPrimaryModel } from "@/lib/ai/models";
import type { PatchPilotWorkflowInput } from "../patchpilot";

const ParsedIncidentSchema = z.object({
  normalizedSummary: z.string().describe("A clear, normalized summary of the incident"),
  suspectedRootCause: z.string().describe("The most likely root cause based on evidence"),
  severity: z.enum(["sev0", "sev1", "sev2", "unknown"]).describe("Estimated severity"),
  likelyComponents: z.array(z.string()).describe("Components, modules, or services likely involved"),
  reproductionRecipe: z.object({
    steps: z.array(z.string()).describe("Steps to reproduce the issue"),
    expected: z.string().describe("What should happen vs what does happen"),
  }),
  constraints: z.object({
    mustNotDo: z.array(z.string()).describe("Things the fix must avoid"),
    assumptions: z.array(z.string()).describe("Assumptions made during triage"),
  }),
});

export type ParsedIncident = z.infer<typeof ParsedIncidentSchema>;

export async function parseIncidentStep(
  input: PatchPilotWorkflowInput
): Promise<ParsedIncident> {
  "use step";

  const artifactDescriptions = input.incident.artifacts
    .map((a) => `- [${a.kind}] ${a.ref}${a.mimeType ? ` (${a.mimeType})` : ""}`)
    .join("\n");

  const prompt = [
    `Incident summary: ${input.incident.summaryText}`,
    `Repository: ${input.repo.owner}/${input.repo.name} (branch: ${input.repo.defaultBranch})`,
    artifactDescriptions ? `\nAttached evidence:\n${artifactDescriptions}` : "",
    `\nAnalyze this incident and extract structured triage information.`,
  ].join("\n");

  const result = await generateText({
    model: getPrimaryModel(),
    system: SYSTEM_PROMPTS.parseIncident,
    prompt,
    output: Output.object({ schema: ParsedIncidentSchema }),
    providerOptions: {
      google: { thinkingConfig: { thinkingLevel: "high" } },
    },
  });

  if (!result.output) {
    throw new Error("Model failed to produce structured incident parse output");
  }
  return result.output;
}
