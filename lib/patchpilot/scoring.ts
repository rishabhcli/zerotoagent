import type { ConfidenceBreakdown } from "@/lib/patchpilot/contracts";

export function computePatchConfidence(input: {
  reproduced: boolean;
  testsPassed: boolean;
  flaky: boolean;
  diffLineCount: number;
  ciPassed: boolean | null;
  missingInfoCount?: number;
}): ConfidenceBreakdown {
  let score = 40;
  const boosters: string[] = [];
  const reducers: string[] = [];

  if (input.reproduced) {
    score += 20;
    boosters.push("Reproducible issue before patch");
  } else {
    reducers.push("Issue was not reproducible");
  }

  if (input.testsPassed) {
    score += 20;
    boosters.push("Sandbox verification passed");
  } else {
    score -= 25;
    reducers.push("Sandbox verification failed");
  }

  if (input.ciPassed === true) {
    score += 10;
    boosters.push("GitHub Actions passed");
  } else if (input.ciPassed === false) {
    score -= 15;
    reducers.push("GitHub Actions failed");
  } else {
    reducers.push("GitHub Actions result unavailable");
  }

  if (input.flaky) {
    score -= 20;
    reducers.push("Flaky verification detected");
  }

  if (input.diffLineCount <= 40) {
    score += 5;
    boosters.push("Small diff size");
  } else if (input.diffLineCount > 200) {
    score -= 10;
    reducers.push("Large diff size");
  }

  if ((input.missingInfoCount ?? 0) > 0) {
    score -= Math.min(15, (input.missingInfoCount ?? 0) * 5);
    reducers.push("Missing incident context reduced certainty");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    boosters,
    reducers,
  };
}

export function computeReproducibilityScore(input: {
  reproduced: boolean;
  replayCount: number;
  successfulReplays: number;
  flaky: boolean;
}): ConfidenceBreakdown {
  let score = input.reproduced ? 55 : 15;
  const boosters: string[] = [];
  const reducers: string[] = [];

  if (input.reproduced) {
    boosters.push("Initial sandbox reproduction succeeded");
  } else {
    reducers.push("Initial sandbox reproduction failed");
  }

  if (input.replayCount > 0) {
    const replayRate = input.successfulReplays / input.replayCount;
    score += Math.round(replayRate * 30);
    boosters.push(
      `Replay verification succeeded ${input.successfulReplays}/${input.replayCount} time(s)`
    );
  }

  if (input.flaky) {
    score -= 25;
    reducers.push("Replay outcomes were inconsistent");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    boosters,
    reducers,
  };
}

export function computeObservabilityCoverage(stepCount: number, receiptCount: number) {
  if (stepCount === 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((receiptCount / stepCount) * 100)));
}
