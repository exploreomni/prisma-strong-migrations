import type { ParsedStatement } from "../parser/types";
import type { CheckContext, FixResult, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return (
    statement.type === "alterTable" &&
    statement.action === "addColumn" &&
    statement.dataType?.endsWith("[]") === true &&
    statement.notNull !== true
  );
};

const message = (statement: ParsedStatement): string => {
  return `Array column "${statement.column}" in table "${statement.table}" is missing NOT NULL; Prisma list fields are always non-nullable`;
};

const suggestion = (statement: ParsedStatement): string => {
  return `
❌ Bad: Prisma list fields (e.g. String[]) are always non-nullable, but this column has no
   NOT NULL constraint, so it is nullable in the database. That lets NULL slip into a column
   the application never expects to be null.

✅ Good: Add NOT NULL. Keep an empty-array default so existing rows stay valid:
   ALTER TABLE "${statement.table}" ADD COLUMN "${statement.column}" <type>[] NOT NULL DEFAULT '{}';

To approve this operation (reviewed and intentional), add above the statement:
   -- prisma-strong-migrations-approve-next-line addArrayColumnWithoutNotNull

Or to skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line addArrayColumnWithoutNotNull
`.trim();
};

const fix = (statement: ParsedStatement): FixResult => {
  const raw = statement.raw.replace(/;\s*$/, "");
  // When a default already exists, keep it and just add NOT NULL; otherwise add an
  // empty-array default too so the NOT NULL is safe on tables with existing rows.
  const fixed = /\bDEFAULT\b/i.test(raw)
    ? raw.replace(/\bDEFAULT\b/i, "NOT NULL DEFAULT")
    : `${raw} NOT NULL DEFAULT '{}'`;
  return { statements: [fixed], requiresDisableTransaction: false };
};

export const addArrayColumnWithoutNotNullRule: Rule = {
  name: "addArrayColumnWithoutNotNull",
  severity: "error",
  description: "Array columns must be NOT NULL because Prisma list fields are always non-nullable",
  detect,
  message,
  suggestion,
  fix,
};
