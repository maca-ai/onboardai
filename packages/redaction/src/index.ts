export interface RedactionResult {
  readonly text: string;
  readonly replacements: readonly string[];
  readonly businessSensitiveTags: readonly BusinessSensitiveTag[];
}

export interface BusinessSensitiveTag {
  readonly kind: "browser-url" | "file-path" | "business-record-id" | "customer-name" | "internal-object-name";
  readonly value: string;
}

const forbiddenPatterns: ReadonlyArray<{ readonly label: string; readonly pattern: RegExp }> = [
  { label: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { label: "password", pattern: /\b(password|passwd|pwd)\s*[:=]\s*("[^"]+"|'[^']+'|[^\s,;]+)/gi },
  { label: "token", pattern: /\b(token|access_token|refresh_token|bearer)\s*[:=]?\s*("[^"]+"|'[^']+'|[A-Za-z0-9._~+/=-]{12,})/gi },
  { label: "api-key", pattern: /\b(api[_-]?key|secret[_-]?key)\s*[:=]\s*("[^"]+"|'[^']+'|[A-Za-z0-9._~+/=-]{12,})/gi },
  { label: "session-secret", pattern: /\b(session[_-]?secret|sessionid|session_id)\s*[:=]\s*("[^"]+"|'[^']+'|[A-Za-z0-9._~+/=-]{12,})/gi }
];

const businessSensitivePatterns: ReadonlyArray<{ readonly kind: BusinessSensitiveTag["kind"]; readonly pattern: RegExp }> = [
  { kind: "browser-url", pattern: /\bhttps?:\/\/[^\s)]+/gi },
  { kind: "file-path", pattern: /(?:[A-Za-z]:\\|\/Users\/|\/home\/|\/var\/|\/tmp\/)[^\s,;)]+/g },
  { kind: "business-record-id", pattern: /\b(?:opp|task|record)-[0-9]{3,}\b/gi },
  { kind: "customer-name", pattern: /\bcustomer(?:\s+(?:name|label))?\s*[:=]\s*("[^"]+"|'[^']+'|[^\n,;]+)/gi },
  { kind: "internal-object-name", pattern: /\binternal\s+object(?:\s+name)?\s*[:=]\s*("[^"]+"|'[^']+'|[^\n,;]+)/gi }
];

export function redactShareableText(input: string): RedactionResult {
  let text = input;
  const replacements: string[] = [];

  for (const rule of forbiddenPatterns) {
    text = text.replace(rule.pattern, () => {
      replacements.push(rule.label);
      return `[redacted-${rule.label}]`;
    });
  }

  return {
    text,
    replacements,
    businessSensitiveTags: detectBusinessSensitiveTags(text)
  };
}

export function containsForbiddenPersistedSecret(input: string): boolean {
  return forbiddenPatterns.some((rule) => {
    rule.pattern.lastIndex = 0;
    return rule.pattern.test(input);
  });
}

export function detectBusinessSensitiveTags(input: string): readonly BusinessSensitiveTag[] {
  const tags: BusinessSensitiveTag[] = [];

  for (const rule of businessSensitivePatterns) {
    for (const match of input.matchAll(rule.pattern)) {
      tags.push({ kind: rule.kind, value: match[0] });
    }
  }

  return tags;
}
