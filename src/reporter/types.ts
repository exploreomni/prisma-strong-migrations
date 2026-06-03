export interface ReportItem {
  ruleName: string;
  severity: "error" | "warning";
  migrationPath: string;
  line: number;
  message: string;
  suggestion: string;
  /** True when the rule can auto-fix this finding via `--fix`. */
  fixable: boolean;
}

export interface JsonReport {
  errors: ReportItem[];
  warnings: ReportItem[];
  totalErrors: number;
  totalWarnings: number;
}
