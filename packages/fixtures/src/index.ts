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
