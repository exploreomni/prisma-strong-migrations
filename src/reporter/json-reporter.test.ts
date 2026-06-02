import { describe, it, expect } from "vitest";
import { jsonReport } from "./json-reporter";
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

const result = (
  name: string,
  severity: "error" | "warning",
  line: number,
  approved?: boolean,
): CheckResult => {
  const statement: ParsedStatement = {
    type: "alterTable",
    raw: `stmt ${line}`,
    line,
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

describe("jsonReport", () => {
  it("excludes approved findings, reporting only errors and warnings", () => {
    const report = jsonReport([
      result("removeColumn", "error", 1),
      result("addJsonColumn", "warning", 2),
      result("renameColumn", "error", 3, true),
    ]);

    expect(report.totalErrors).toBe(1);
    expect(report.totalWarnings).toBe(1);
    expect(report.errors.map((e) => e.ruleName)).toEqual(["removeColumn"]);
    expect(report.warnings.map((w) => w.ruleName)).toEqual(["addJsonColumn"]);
    expect(report).not.toHaveProperty("approved");
  });

  it("reports empty arrays when there are no results", () => {
    const report = jsonReport([]);
    expect(report).toEqual({
      errors: [],
      warnings: [],
      totalErrors: 0,
      totalWarnings: 0,
    });
  });
});
