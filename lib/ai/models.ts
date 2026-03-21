/**
 * Centralized AI model configuration.
 *
 * Priority:
 * 1. Direct Google provider (if GOOGLE_GENERATIVE_AI_API_KEY is set) — no billing gatekeeping
 * 2. AI Gateway (if AI_GATEWAY_API_KEY is set) — requires Vercel billing
 * 3. AI Gateway via OIDC (if VERCEL_OIDC_TOKEN is set) — requires Vercel billing
 */
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/**
 * Primary model for all workflow steps.
 * Prefers direct Google API key to avoid gateway billing requirements.
 */
export function getPrimaryModel(): LanguageModel | string {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google("gemini-3.1-pro-preview");
  }
  // Fall back to AI Gateway (requires credit card on Vercel)
  return "google/gemini-3.1-pro-preview";
}

export const PRIMARY_MODEL_ID = "google/gemini-3.1-pro-preview" as const;

export const FALLBACK_MODELS = [
  "anthropic/claude-sonnet-4.6",
  "google/gemini-3-flash",
] as const;
