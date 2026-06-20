export type EvalAccessMode = "screen-observation" | "simulated-low-level-input";

export interface EvalHarnessPolicy {
  readonly allowed: readonly EvalAccessMode[];
  readonly forbidden: readonly string[];
}

export const deterministicHarnessPolicy: EvalHarnessPolicy = {
  allowed: ["screen-observation", "simulated-low-level-input"],
  forbidden: ["llm-inference", "dom-inspection", "browser-selectors", "api-access", "backend-access", "database-access", "target-tool-mcp"]
};

export function assertNoPrivilegedProofAccess(accesses: readonly string[]): void {
  const forbidden = new Set(deterministicHarnessPolicy.forbidden);
  const violation = accesses.find((access) => forbidden.has(access));

  if (violation) {
    throw new Error(`forbidden eval proof access: ${violation}`);
  }
}
