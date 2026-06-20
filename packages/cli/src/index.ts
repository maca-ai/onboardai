#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { searchFlowDocuments, validateFlowMarkdown } from "@onboardai/flow";

const args = process.argv.slice(2);

if (args[0] === "flow" && args[1] === "validate") {
  const target = args[2] ?? "flows";
  const files = listFlowFiles(target);
  const failures: string[] = [];

  for (const file of files) {
    const result = validateFlowMarkdown(readFileSync(file, "utf8"));
    if (!result.valid) {
      failures.push(`${file}: ${result.errors.join("; ")}`);
    }
  }

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`validated ${files.length} flow file(s)`);
  }
} else if (args[0] === "flow" && args[1] === "search") {
  const query = args.slice(2).join(" ");
  const files = listFlowFiles("flows").map((path) => ({ path, content: readFileSync(path, "utf8") }));
  console.log(searchFlowDocuments(files, query).join("\n"));
} else if (args[0] === "eval" && args[1] === "run") {
  const tool = args[2];
  if (tool !== "odoo" && tool !== "notion") {
    console.error("usage: onboardai eval run <odoo|notion>");
    process.exitCode = 1;
  } else {
    console.error(`eval runner for ${tool} is not implemented in milestone 1`);
    process.exitCode = 2;
  }
} else {
  console.log("usage: onboardai flow validate <path> | flow search <query> | eval run <odoo|notion>");
}

function listFlowFiles(root: string): string[] {
  const entries = safeReadDir(root);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...listFlowFiles(path));
    } else if (path.endsWith(".flow.md") || path.endsWith("flow.md")) {
      files.push(path);
    }
  }

  return files;
}

function safeReadDir(root: string): string[] {
  try {
    return readdirSync(root);
  } catch {
    return [];
  }
}
