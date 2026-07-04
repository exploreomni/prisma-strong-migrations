import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return (
    statement.type === "alterTable" &&
    statement.action === "addColumn" &&
    statement.notNull === true &&
    !statement.hasDefault
  );
};

const message = (statement: ParsedStatement): string => {
  return `Adding NOT NULL column "${statement.column}" on table "${statement.table}" without a default value will fail on a table with existing rows`;
};

const suggestion = (statement: ParsedStatement): string => {
  return `
❌ Bad: A NOT NULL column without a default value is unsafe:
   - Adding it fails on a table that already has rows
   - To remove the column later you mark its field @ignore; Prisma Client then omits it
     from INSERTs, and with no default those inserts fail — so the column cannot be dropped safely

✅ Good (option 1 — a sensible constant applies to every existing row):
   Give the column a default value. On PostgreSQL 11+ a constant default is a fast,
   metadata-only change even on large tables:
      ALTER TABLE "${statement.table}" ADD COLUMN "${statement.column}" <type> NOT NULL DEFAULT <value>;
   You can also add @default(...) to the field in schema.prisma before generating the migration.

✅ Good (option 2 — each row needs an application-supplied value, e.g. a foreign key):
   Don't invent a default. Add the column as nullable, backfill it, then enforce NOT NULL
   in a separate migration:
   1. ALTER TABLE "${statement.table}" ADD COLUMN "${statement.column}" <type>;
   2. Backfill existing rows (application code or a batched UPDATE)
   3. ALTER TABLE "${statement.table}" ALTER COLUMN "${statement.column}" SET NOT NULL;
      (in a separate migration — the setNotNull rule then guides you to do this without a long lock)

To approve this operation (reviewed and intentional), add above the statement:
   -- prisma-strong-migrations-approve-next-line addNotNullWithoutDefault

Or to skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line addNotNullWithoutDefault
`.trim();
};

export const addNotNullWithoutDefaultRule: Rule = {
  name: "addNotNullWithoutDefault",
  severity: "error",
  description:
    "A NOT NULL column without a default value fails on existing rows and blocks safe removal via @ignore",
  detect,
  message,
  suggestion,
};
