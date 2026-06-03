import type { CheckResult } from "../rules/types";
import type { JsonReport, ReportItem } from "./types";

export const jsonReport = (results: CheckResult[]): JsonReport => {
  const toItem = (result: CheckResult): ReportItem => ({
    ruleName: result.rule.name,
    severity: result.rule.severity,
    migrationPath: result.statement.raw,
    line: result.statement.line,
    message: result.message,
    suggestion: result.suggestion,
    fixable: result.rule.fix !== undefined,
  });

  const violations = results.filter((r) => !r.approved);
  const errors = violations.filter((r) => r.rule.severity === "error").map(toItem);
  const warnings = violations.filter((r) => r.rule.severity === "warning").map(toItem);

  return {
    errors,
    warnings,
    totalErrors: errors.length,
    totalWarnings: warnings.length,
  };
};
