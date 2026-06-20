import { execFileSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";

const repoRoot = new URL("../../..", import.meta.url);

test("raw capture and unsafe local artifact paths are ignored by git", () => {
  const ignoredPaths = [
    "captures/raw/demo.mov",
    "captures/unsafe/frame.png",
    "captures/tmp/scratch.json",
    "demo.mp4",
    "demo.mov",
    "demo.webm",
    "demo.mkv",
    "network.har",
    ".env",
    ".env.local",
    "secret.pem",
    "secret.key"
  ];

  const output = execFileSync("git", ["check-ignore", ...ignoredPaths], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.deepEqual(output.trim().split("\n"), ignoredPaths);
});
