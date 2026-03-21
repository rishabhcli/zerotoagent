import { defineHook } from "workflow";

/**
 * Pre-defined approval hook type.
 *
 * Note: The orchestrator (patchpilot.ts) currently uses `createHook()` directly
 * with a deterministic token pattern (`approval:${runId}`) for more control.
 * This definition is kept as a reference for the hook's type contract.
 *
 * To use this instead, import in the orchestrator:
 *   const hook = prApprovalHook.create({ token: `approval:${runId}` });
 * And in the approval route:
 *   await prApprovalHook.resume(token, { approved, comment });
 */
export const prApprovalHook = defineHook<{
  approved: boolean;
  comment?: string;
}>();
