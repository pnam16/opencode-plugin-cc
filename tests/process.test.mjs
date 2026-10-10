import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runCommand, spawnDetached } from "../plugins/opencode/scripts/lib/process.mjs";

describe("process", () => {
  it("runCommand captures stdout", async () => {
    const { stdout, exitCode } = await runCommand("echo", ["hello"]);
    assert.equal(stdout.trim(), "hello");
    assert.equal(exitCode, 0);
  });

  it("runCommand captures exit code on failure", async () => {
    const { exitCode } = await runCommand("false", []);
    assert.notEqual(exitCode, 0);
  });

  it("runCommand captures stderr", async () => {
    const { stderr, exitCode } = await runCommand("sh", ["-c", "echo err >&2"]);
    assert.ok(stderr.includes("err"));
  });

  // The background worker gets the whole task text as one --task-text arg.
  it("spawnDetached passes a multi-word node arg through intact", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spawn-detached-"));
    const logFile = path.join(dir, "out.log");
    const text = 'In the repo D:\\ws\\app, edit "a b" & c';
    spawnDetached(
      "node",
      ["-e", "console.log(JSON.stringify(process.argv.slice(1)))", text],
      { logFile },
    );
    // The child is unref'd, so its exit event cannot hold the test open: poll
    // the log instead.
    let out = "";
    for (let i = 0; i < 50 && !out.includes("\n"); i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      out = fs.readFileSync(logFile, "utf8");
    }
    assert.deepEqual(JSON.parse(out), [text]);
  });
});
