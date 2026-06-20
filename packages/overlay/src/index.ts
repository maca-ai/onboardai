import type { FlowStep, ScreenRegionHint } from "@onboardai/flow";
import { failClosedMessage } from "@onboardai/flow";

export interface OverlayInstruction {
  readonly kind: "instruction";
  readonly message: string;
  readonly highlight: ScreenRegionHint | null;
  readonly canAutomateInput: false;
}

export interface OverlayFailClosed {
  readonly kind: "fail-closed";
  readonly message: typeof failClosedMessage;
  readonly highlight: null;
  readonly canAutomateInput: false;
}

export type OverlayRenderResult = OverlayInstruction | OverlayFailClosed;

export function renderOverlayGuidance(step: FlowStep, confidence: number, threshold = 0.75): OverlayRenderResult {
  if (confidence < threshold) {
    return {
      kind: "fail-closed",
      message: failClosedMessage,
      highlight: null,
      canAutomateInput: false
    };
  }

  const highlight = findHighlight(step);

  return {
    kind: "instruction",
    message: step.instruction.text,
    highlight,
    canAutomateInput: false
  };
}

function findHighlight(step: FlowStep): ScreenRegionHint | null {
  const anchorId = step.instruction["highlight-anchor-id"];
  if (!anchorId) {
    return null;
  }

  return step["expected-state"]["screen-region-hints"]?.find((hint) => hint["anchor-id"] === anchorId) ?? null;
}
