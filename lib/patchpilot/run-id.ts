import { nanoid } from "nanoid";

export const REPRO_RUN_ID_PATTERN = /^PP-\d{4}-\d{2}-\d{2}-[A-Za-z0-9_-]{6}$/;

export function createReProRunId(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `PP-${yyyy}-${mm}-${dd}-${nanoid(6)}`;
}

export function isReProRunId(value: string) {
  return REPRO_RUN_ID_PATTERN.test(value);
}

export function createApprovalToken(runId: string) {
  return `approval-${runId}-${nanoid(16)}`;
}
