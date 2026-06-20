export type ToolName = "odoo" | "notion";

export interface ScreenRegion {
  readonly "anchor-id": string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ScreenObservation {
  readonly stateId: string;
  readonly frame: string;
  readonly visibleText: readonly string[];
  readonly regions: readonly ScreenRegion[];
}

export interface FixtureTransition {
  readonly fromStateId: string;
  readonly action: {
    readonly kind: "click" | "type" | "press-key" | "wait";
    readonly targetAnchorId?: string;
    readonly text?: string;
    readonly key?: string;
  };
  readonly toStateId: string;
}

export interface DeterministicFixture {
  readonly tool: ToolName;
  readonly flowPath: string;
  readonly runId: string;
  readonly cleanSeededDemoData: true;
  readonly startStateId: string;
  readonly terminalStateId: string;
  readonly terminalBusinessState: string;
  readonly observations: readonly ScreenObservation[];
  readonly transitions: readonly FixtureTransition[];
  readonly reviewer: {
    readonly role: "fixture-senior-reviewer";
    readonly name: string;
  };
}

export interface ToolFixture {
  readonly tool: "odoo" | "notion";
  readonly startingVisibleText: readonly string[];
  readonly terminalBusinessState: string;
}

export const odooLikeFixture: ToolFixture = {
  tool: "odoo",
  startingVisibleText: ["pipeline", "demo opportunity", "new"],
  terminalBusinessState: "demo opportunity visible with stage qualified"
};

export const notionLikeFixture: ToolFixture = {
  tool: "notion",
  startingVisibleText: ["project tasks", "demo task", "status: not started"],
  terminalBusinessState: "demo task visible with status ready for review"
};

export const deterministicFixtures: Record<ToolName, DeterministicFixture> = {
  odoo: {
    tool: "odoo",
    flowPath: "flows/odoo/qualify-opportunity.flow.md",
    runId: "fixture-odoo-qualify-001",
    cleanSeededDemoData: true,
    startStateId: "pipeline",
    terminalStateId: "qualified-saved",
    terminalBusinessState: "demo opportunity visible with stage qualified",
    reviewer: {
      role: "fixture-senior-reviewer",
      name: "odoo fixture reviewer"
    },
    observations: [
      {
        stateId: "pipeline",
        frame: "captures/redacted/odoo-qualify-opportunity/frame-0001.png",
        visibleText: ["pipeline", "demo opportunity", "new"],
        regions: [{ "anchor-id": "opportunity-card", x: 112, y: 180, width: 320, height: 90 }]
      },
      {
        stateId: "opportunity-detail",
        frame: "captures/redacted/odoo-qualify-opportunity/frame-0002.png",
        visibleText: ["demo opportunity", "stage", "new", "qualified"],
        regions: [{ "anchor-id": "qualified-stage", x: 540, y: 132, width: 148, height: 44 }]
      },
      {
        stateId: "qualified-unsaved",
        frame: "captures/redacted/odoo-qualify-opportunity/frame-0003.png",
        visibleText: ["demo opportunity", "stage", "qualified", "unsaved changes"],
        regions: [{ "anchor-id": "save-button", x: 34, y: 88, width: 92, height: 40 }]
      },
      {
        stateId: "qualified-saved",
        frame: "captures/redacted/odoo-qualify-opportunity/frame-0004.png",
        visibleText: ["demo opportunity", "stage", "qualified", "saved"],
        regions: []
      }
    ],
    transitions: [
      { fromStateId: "pipeline", action: { kind: "click", targetAnchorId: "opportunity-card" }, toStateId: "opportunity-detail" },
      { fromStateId: "opportunity-detail", action: { kind: "click", targetAnchorId: "qualified-stage" }, toStateId: "qualified-unsaved" },
      { fromStateId: "qualified-unsaved", action: { kind: "click", targetAnchorId: "save-button" }, toStateId: "qualified-saved" }
    ]
  },
  notion: {
    tool: "notion",
    flowPath: "flows/notion/update-task-status.flow.md",
    runId: "fixture-notion-ready-review-001",
    cleanSeededDemoData: true,
    startStateId: "task-list",
    terminalStateId: "ready-for-review-confirmed",
    terminalBusinessState: "demo task visible with status ready for review",
    reviewer: {
      role: "fixture-senior-reviewer",
      name: "notion fixture reviewer"
    },
    observations: [
      {
        stateId: "task-list",
        frame: "captures/redacted/notion-update-task-status/frame-0001.png",
        visibleText: ["project tasks", "demo task", "status: not started"],
        regions: [{ "anchor-id": "demo-task-row", x: 88, y: 210, width: 520, height: 48 }]
      },
      {
        stateId: "task-page",
        frame: "captures/redacted/notion-update-task-status/frame-0002.png",
        visibleText: ["demo task", "status", "not started", "ready for review"],
        regions: [{ "anchor-id": "status-property", x: 260, y: 156, width: 220, height: 42 }]
      },
      {
        stateId: "status-menu",
        frame: "captures/redacted/notion-update-task-status/frame-0003.png",
        visibleText: ["status", "not started", "ready for review"],
        regions: [{ "anchor-id": "ready-for-review-option", x: 294, y: 252, width: 236, height: 38 }]
      },
      {
        stateId: "ready-for-review-confirmed",
        frame: "captures/redacted/notion-update-task-status/frame-0004.png",
        visibleText: ["demo task", "status", "ready for review"],
        regions: []
      }
    ],
    transitions: [
      { fromStateId: "task-list", action: { kind: "click", targetAnchorId: "demo-task-row" }, toStateId: "task-page" },
      { fromStateId: "task-page", action: { kind: "click", targetAnchorId: "status-property" }, toStateId: "status-menu" },
      { fromStateId: "status-menu", action: { kind: "click", targetAnchorId: "ready-for-review-option" }, toStateId: "ready-for-review-confirmed" }
    ]
  }
};

export function getDeterministicFixture(tool: ToolName): DeterministicFixture {
  return deterministicFixtures[tool];
}
