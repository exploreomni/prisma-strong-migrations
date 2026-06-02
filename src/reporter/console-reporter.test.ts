import { describe, it, expect, vi, afterEach } from "vitest";
import { consoleReport } from "./console-reporter";
import type { CheckResult, Rule } from "../rules/types";
import type { ParsedStatement } from "../parser/types";

const rule = (name: string, severity: "error" | "warning"): Rule => ({
  name,
  severity,
  description: `${name} description`,
  detect: () => true,
  message: () => `${name} message`,
  suggestion: () => `${name} suggestion`,
});

const result = (name: string, severity: "error" | "warning", approved?: boolean): CheckResult => {
  const statement: ParsedStatement = {
    type: "alterTable",
    raw: `ALTER TABLE "users" DROP COLUMN "${name}"`,
    line: 1,
    migrationPath: "migration.sql",
  };
  return {
    rule: rule(name, severity),
    statement,
    message: `${name} message`,
    suggestion: `${name} suggestion`,
    approved: approved ?? false,
  };
};

const captureOutput = (results: CheckResult[]): string => {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {});
  consoleReport(results);
  const output = spy.mock.calls.map((c) => c.join(" ")).join("\n");
  return output;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("consoleReport", () => {
  it("shows the approved count only in the summary, not per-finding details", () => {
    const output = captureOutput([result("removeColumn", "error", true)]);
    expect(output).not.toContain("removeColumn");
    expect(output).not.toContain("1 error");
    expect(output).toContain("1 approved");
  });

  it("counts only non-approved findings as errors", () => {
    const output = captureOutput([
      result("removeColumn", "error"),
      result("renameColumn", "error", true),
    ]);
    expect(output).toContain("1 error");
    expect(output).toContain("1 approved");
  });

  it("shows no-issues message when there are no results", () => {
    const output = captureOutput([]);
    expect(output).toContain("No issues found");
  });
});
