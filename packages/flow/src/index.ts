import { containsForbiddenPersistedSecret } from "@onboardai/redaction";

export interface FlowDocument {
  readonly frontmatter: Record<string, string | number | boolean>;
  readonly body: string;
  readonly steps: readonly FlowStep[];
}

export interface FlowStep {
  readonly "step-id": string;
  readonly title: string;
  readonly "expected-state": {
    readonly "visible-text"?: readonly string[];
    readonly "screen-region-hints"?: readonly ScreenRegionHint[];
  };
  readonly instruction: {
    readonly text: string;
    readonly "highlight-anchor-id"?: string;
    readonly "allowed-guidance": readonly string[];
    readonly "forbidden-guidance": readonly string[];
  };
  readonly "user-action": {
    readonly kind: string;
    readonly "target-anchor-id"?: string;
    readonly "manual-only": boolean;
  };
  readonly "success-condition": {
    readonly "visible-text"?: readonly string[];
    readonly terminal: boolean;
  };
  readonly fallback: {
    readonly "below-confidence-message": string;
    readonly "restart-from-step"?: string;
  };
}

export interface ScreenRegionHint {
  readonly "anchor-id": string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly "source-frame": string;
}

export interface FlowValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly document?: FlowDocument;
}

export interface FlowSearchMatch {
  readonly field: string;
  readonly value: string;
  readonly tokens: readonly string[];
}

export interface FlowSearchResult {
  readonly path: string;
  readonly score: number;
  readonly matches: readonly FlowSearchMatch[];
}

const requiredFrontmatter = [
  "flow-id",
  "flow-version",
  "tool",
  "terminal-business-state",
  "confidence-threshold",
  "raw-capture-policy",
  "redaction-policy",
  "input-automation-allowed"
] as const;

const requiredStepFields = [
  "step-id",
  "title",
  "expected-state",
  "instruction",
  "user-action",
  "success-condition",
  "fallback"
] as const;

export const failClosedMessage = "screen state not recognized. ask a human or restart this step.";

export function parseFlowMarkdown(markdown: string): FlowDocument {
  if (!markdown.startsWith("---\n")) {
    throw new Error("flow.md must start with yaml frontmatter");
  }

  const end = markdown.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error("flow.md frontmatter is not closed");
  }

  const frontmatterText = markdown.slice(4, end).trim();
  const body = markdown.slice(end + 4).trim();
  const frontmatter = parseSimpleYaml(frontmatterText);
  const steps = extractJsonSteps(body);

  return { frontmatter, body, steps };
}

export function validateFlowMarkdown(markdown: string): FlowValidationResult {
  const errors: string[] = [];
  let document: FlowDocument;

  try {
    document = parseFlowMarkdown(markdown);
  } catch (error) {
    return { valid: false, errors: [error instanceof Error ? error.message : "flow parse failed"] };
  }

  for (const key of requiredFrontmatter) {
    if (!(key in document.frontmatter)) {
      errors.push(`missing frontmatter field: ${key}`);
    }
  }

  if (document.frontmatter["confidence-threshold"] !== 0.75) {
    errors.push("confidence-threshold must be 0.75");
  }

  if (document.frontmatter["input-automation-allowed"] !== false) {
    errors.push("input-automation-allowed must be false");
  }

  if (document.steps.length === 0) {
    errors.push("flow must include at least one embedded json step");
  }

  const terminalStepCount = document.steps.filter((step) => step["success-condition"]?.terminal === true).length;
  if (terminalStepCount !== 1) {
    errors.push("flow must include exactly one terminal step");
  }

  document.steps.forEach((step, index) => validateStep(step, index, errors));

  if (containsForbiddenPersistedSecret(markdown)) {
    errors.push("flow contains a forbidden persisted secret");
  }

  return { valid: errors.length === 0, errors, document };
}

export function searchFlowDocuments(files: ReadonlyArray<{ readonly path: string; readonly content: string }>, query: string): readonly string[] {
  return searchFlowDocumentDetails(files, query).map((result) => result.path);
}

export function searchFlowDocumentDetails(
  files: ReadonlyArray<{ readonly path: string; readonly content: string }>,
  query: string
): readonly FlowSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  const queryTokens = tokenize(normalizedQuery);
  if (queryTokens.length === 0) {
    return [];
  }

  return files
    .map((file) => scoreFlowFile(file, queryTokens, normalizedQuery))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
}

function parseSimpleYaml(input: string): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};

  for (const line of input.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf(":");
    if (separator === -1) {
      throw new Error(`invalid frontmatter line: ${line}`);
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    values[key] = parseScalar(rawValue);
  }

  return values;
}

function parseScalar(rawValue: string): string | number | boolean {
  const unquoted = rawValue.replace(/^"|"$/g, "");

  if (unquoted === "true") {
    return true;
  }

  if (unquoted === "false") {
    return false;
  }

  const numberValue = Number(unquoted);
  if (Number.isFinite(numberValue) && unquoted !== "") {
    return numberValue;
  }

  return unquoted;
}

function extractJsonSteps(body: string): FlowStep[] {
  const steps: FlowStep[] = [];
  const blockPattern = /```json\s*([\s\S]*?)```/g;

  for (const match of body.matchAll(blockPattern)) {
    try {
      steps.push(JSON.parse(match[1]) as FlowStep);
    } catch {
      throw new Error("embedded json step is malformed");
    }
  }

  return steps;
}

function validateStep(step: FlowStep, index: number, errors: string[]): void {
  for (const key of requiredStepFields) {
    if (!(key in step)) {
      errors.push(`step ${index + 1} missing field: ${key}`);
    }
  }

  const regionHints = step["expected-state"]?.["screen-region-hints"] ?? [];
  const anchorIds = new Set<string>();

  if (step.instruction) {
    const instructionText = step.instruction.text.toLowerCase();
    if (/\bsystem\s+(click|type|submit|approve|delete|automate)\b/.test(instructionText)) {
      errors.push(`step ${index + 1} instruction asks the system to automate input`);
    }

    for (const forbidden of step.instruction["forbidden-guidance"] ?? []) {
      if (!["click", "type", "submit", "approve", "delete", "automate"].includes(forbidden)) {
        errors.push(`step ${index + 1} has unexpected forbidden guidance: ${forbidden}`);
      }
    }
  }

  if (step["user-action"] && step["user-action"]["manual-only"] !== true) {
    errors.push(`step ${index + 1} user action must be manual-only`);
  }

  if (step.fallback?.["below-confidence-message"] !== failClosedMessage) {
    errors.push(`step ${index + 1} fallback message must match fail-closed text exactly`);
  }

  for (const hint of regionHints) {
    if (!hint["anchor-id"]) {
      errors.push(`step ${index + 1} anchor is missing anchor-id`);
      continue;
    }

    if (anchorIds.has(hint["anchor-id"])) {
      errors.push(`step ${index + 1} anchor ${hint["anchor-id"]} is duplicated`);
    }
    anchorIds.add(hint["anchor-id"]);

    if (!hint["source-frame"]) {
      errors.push(`step ${index + 1} anchor ${hint["anchor-id"]} is missing source-frame`);
      continue;
    }

    if (hint["source-frame"].startsWith("captures/raw/") || hint["source-frame"].startsWith("captures/unsafe/")) {
      errors.push(`step ${index + 1} anchor ${hint["anchor-id"]} points to unsafe capture`);
    }
  }

  const highlightAnchorId = step.instruction?.["highlight-anchor-id"];
  if (highlightAnchorId && !anchorIds.has(highlightAnchorId)) {
    errors.push(`step ${index + 1} highlight anchor ${highlightAnchorId} is not defined in screen-region-hints`);
  }

  const targetAnchorId = step["user-action"]?.["target-anchor-id"];
  if (targetAnchorId && !anchorIds.has(targetAnchorId)) {
    errors.push(`step ${index + 1} target anchor ${targetAnchorId} is not defined in screen-region-hints`);
  }
}

function scoreFlowFile(
  file: { readonly path: string; readonly content: string },
  queryTokens: readonly string[],
  normalizedQuery: string
): FlowSearchResult {
  const fields = searchableFields(file);
  const matches: FlowSearchMatch[] = [];
  let score = 0;

  for (const field of fields) {
    const normalizedValue = field.value.toLowerCase();
    const matchedTokens = queryTokens.filter((token) => normalizedValue.includes(token));
    if (matchedTokens.length === 0 && !normalizedValue.includes(normalizedQuery)) {
      continue;
    }

    const exactPhraseBonus = normalizedValue.includes(normalizedQuery) ? field.weight * 3 : 0;
    const tokenScore = matchedTokens.reduce((sum) => sum + field.weight, 0);
    score += exactPhraseBonus + tokenScore;
    matches.push({ field: field.name, value: field.value, tokens: matchedTokens });
  }

  return { path: file.path, score, matches };
}

function searchableFields(file: { readonly path: string; readonly content: string }): readonly { readonly name: string; readonly value: string; readonly weight: number }[] {
  const fields: { readonly name: string; readonly value: string; readonly weight: number }[] = [
    { name: "path", value: file.path, weight: 10 }
  ];

  try {
    const document = parseFlowMarkdown(file.content);
    for (const key of ["flow-id", "tool", "terminal-business-state"] as const) {
      const value = document.frontmatter[key];
      if (value !== undefined) {
        fields.push({ name: key, value: String(value), weight: key === "tool" ? 8 : 12 });
      }
    }

    for (const step of document.steps) {
      fields.push({ name: "step-title", value: step.title, weight: 8 });
      fields.push({ name: "instruction", value: step.instruction.text, weight: 8 });
      fields.push({ name: "expected-visible-text", value: (step["expected-state"]["visible-text"] ?? []).join(" "), weight: 5 });
      fields.push({ name: "success-visible-text", value: (step["success-condition"]["visible-text"] ?? []).join(" "), weight: 5 });
    }
  } catch {
    fields.push({ name: "content", value: file.content, weight: 1 });
  }

  return fields;
}

function tokenize(input: string): readonly string[] {
  return [...new Set(input.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 1))];
}
