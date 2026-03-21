const SECRET_PATTERNS = [
  /\b(?:sk|sb|ghp|gho|github_pat)_[A-Za-z0-9_\-]{12,}\b/g,
  /\bBearer\s+[A-Za-z0-9._\-+=/]{10,}\b/gi,
  /\b(?:eyJ[A-Za-z0-9_\-]+=*\.[A-Za-z0-9_\-]+=*\.?[A-Za-z0-9_\-+/=]*)\b/g,
  /\b(?:[A-Fa-f0-9]{32,}|[A-Za-z0-9+/]{32,}={0,2})\b/g,
  /-----BEGIN [A-Z ]+-----[\s\S]+?-----END [A-Z ]+-----/g,
  /\b(?:password|secret|token|api[_-]?key|private[_-]?key|cookie)\s*[:=]\s*["']?[^"'\s]+["']?/gi,
];

export function redactSensitiveText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return SECRET_PATTERNS.reduce((current, pattern) => {
    return current.replace(pattern, "[REDACTED]");
  }, value);
}

export function redactUnknown<T>(value: T): T {
  if (typeof value === "string") {
    return redactSensitiveText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactUnknown(entry)])
    ) as T;
  }

  return value;
}

export function truncateForReceipt(value: string | null | undefined, max = 4000) {
  const safe = redactSensitiveText(value);
  if (safe.length <= max) {
    return safe;
  }
  return `${safe.slice(0, max)}\n… (truncated)`;
}
