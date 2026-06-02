import chalk from "chalk";
import { relative } from "node:path";
import type { CheckResult } from "../rules/types";

export const consoleReport = (results: CheckResult[]): void => {
  const violations = results.filter((r) => !r.approved);
  const approved = results.filter((r) => r.approved);

  if (violations.length === 0 && approved.length === 0) {
    console.log(chalk.green("✓ No issues found"));
    return;
  }

  const byFile = Map.groupBy(violations, (r) => r.statement.migrationPath ?? "unknown");

  for (const [filePath, fileResults] of byFile) {
    console.log();
    console.log(chalk.cyan.bold(relative(process.cwd(), filePath)));

    for (const { rule, statement, message, suggestion } of fileResults) {
      const severity = rule.severity === "error" ? chalk.red("error") : chalk.yellow("warning");

      console.log();
      console.log(`${severity} [${chalk.bold(rule.name)}] ${chalk.dim(`line ${statement.line}`)}`);
      console.log(`  ${chalk.white(message)}`);
      console.log();
      console.log(
        chalk.dim(
          suggestion
            .split("\n")
            .map((l) => `  ${l}`)
            .join("\n"),
        ),
      );
      console.log(chalk.dim("─".repeat(60)));
    }
  }

  const errors = violations.filter((r) => r.rule.severity === "error").length;
  const warnings = violations.filter((r) => r.rule.severity === "warning").length;
  const approvedNote = approved.length > 0 ? chalk.green(`, ${approved.length} approved`) : "";

  console.log();
  if (errors > 0) {
    console.log(
      chalk.red(`✗ ${errors} error${errors !== 1 ? "s" : ""}`) +
        (warnings > 0 ? chalk.yellow(`, ${warnings} warning${warnings !== 1 ? "s" : ""}`) : "") +
        approvedNote,
    );
  } else if (warnings > 0) {
    console.log(chalk.yellow(`⚠ ${warnings} warning${warnings !== 1 ? "s" : ""}`) + approvedNote);
  } else {
    console.log(chalk.green("✓ No issues found") + chalk.dim(` (${approved.length} approved)`));
  }
};
