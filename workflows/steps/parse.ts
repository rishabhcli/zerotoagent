import { generateText, Output } from "ai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { getPrimaryModel } from "@/lib/ai/models";
import { buildArtifactModelContent } from "@/lib/patchpilot/artifacts";
import type { ReProWorkflowInput } from "../patchpilot";

const ParsedIncidentSchema = z.object({
  normalizedSummary: z.string().describe("A clear, normalized summary of the incident"),
  suspectedRootCause: z.string().describe("The most likely root cause based on evidence"),
  severity: z.enum(["sev0", "sev1", "sev2", "unknown"]).describe("Estimated severity"),
  likelyComponents: z.array(z.string()).describe("Components, modules, or services likely involved"),
  recentChangeThatMatters: z.string().describe("What recent change appears most relevant"),
  knownUnknowns: z.array(z.string()).describe("What could still be wrong or missing"),
  requestsForMissingInformation: z.array(z.string()).describe("Information the user could provide if the issue is not reproducible"),
  reproductionRecipe: z.object({
    steps: z.array(z.string()).describe("Steps to reproduce the issue"),
    expected: z.string().describe("What should happen vs what does happen"),
  }),
  constraints: z.object({
    mustNotDo: z.array(z.string()).describe("Things the fix must avoid"),
    assumptions: z.array(z.string()).describe("Assumptions made during triage"),
  }),
  confidenceDrivers: z.object({
    boosters: z.array(z.string()),
    reducers: z.array(z.string()),
  }),
});

export type ParsedIncident = z.infer<typeof ParsedIncidentSchema>;

export async function parseIncidentStep(
  input: ReProWorkflowInput
): Promise<ParsedIncident> {
  "use step";
  const artifactParts = await buildArtifactModelContent(
    input.incident.artifacts.map((artifact) => ({
      kind: artifact.kind,
      filename: artifact.filename,
      mimeType: artifact.mimeType,
      storagePath: artifact.storagePath,
    }))
  );

  const result = await generateText({
    model: getPrimaryModel(),
    system: SYSTEM_PROMPTS.parseIncident,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Incident summary: ${input.incident.summaryText}`,
              `Repository: ${input.repo.owner}/${input.repo.name} (branch: ${input.repo.defaultBranch})`,
              input.incident.artifacts.length > 0
                ? `Attached evidence count: ${input.incident.artifacts.length}`
                : "No files attached.",
              "Analyze this incident and extract structured triage information with explicit known unknowns.",
            ].join("\n"),
          },
          ...artifactParts,
        ],
      },
    ],
    output: Output.object({ schema: ParsedIncidentSchema }),
    providerOptions: {
      google: { thinkingConfig: { thinkingLevel: "high" } },
    },
    experimental_include: {
      requestBody: false,
      responseBody: false,
    },
  });

  if (!result.output) {
    throw new Error("Model failed to produce structured incident parse output");
  }
  return result.output;
}
