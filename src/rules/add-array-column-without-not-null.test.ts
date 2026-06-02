import { describe, it, expect } from "vite-plus/test";
import { addArrayColumnWithoutNotNullRule } from "./add-array-column-without-not-null";
import type { ParsedStatement } from "../parser/types";
import type { CheckContext } from "./types";

const mockContext: CheckContext = {
  statements: [],
  migrationPath: "test.sql",
  config: {
    disabledRules: [],
    ignoreMigrations: [],
    customRulesDir: "",
    customRules: [],
    warningsAsErrors: false,
    failOnWarning: false,
    failOnError: true,
    migrationsDir: "",
  },
};

const arrayColumn = (overrides: Partial<ParsedStatement> = {}): ParsedStatement => ({
  type: "alterTable",
  action: "addColumn",
  raw: 'ALTER TABLE "LandingPage" ADD COLUMN "savedColors" TEXT[] DEFAULT ARRAY[]::TEXT[];',
  line: 1,
  table: "LandingPage",
  column: "savedColors",
  dataType: "text[]",
  hasDefault: true,
  ...overrides,
});

describe("addArrayColumnWithoutNotNullRule", () => {
  describe("detect", () => {
    it("detects an array column with a default but no NOT NULL", () => {
      expect(addArrayColumnWithoutNotNullRule.detect(arrayColumn(), mockContext)).toBe(true);
    });

    it("does not detect when NOT NULL is present", () => {
      expect(
        addArrayColumnWithoutNotNullRule.detect(arrayColumn({ notNull: true }), mockContext),
      ).toBe(false);
    });

    it("detects an array column without a default (Prisma lists are non-nullable)", () => {
      const stmt = arrayColumn({
        raw: 'ALTER TABLE "Post" ADD COLUMN "tags" TEXT[];',
        column: "tags",
        hasDefault: false,
      });
      expect(addArrayColumnWithoutNotNullRule.detect(stmt, mockContext)).toBe(true);
    });

    it("does not detect a non-array column", () => {
      expect(
        addArrayColumnWithoutNotNullRule.detect(arrayColumn({ dataType: "text" }), mockContext),
      ).toBe(false);
    });
  });

  describe("fix", () => {
    it("inserts NOT NULL before an existing DEFAULT", () => {
      const result = addArrayColumnWithoutNotNullRule.fix?.(arrayColumn());
      expect(result?.statements).toEqual([
        'ALTER TABLE "LandingPage" ADD COLUMN "savedColors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]',
      ]);
      expect(result?.requiresDisableTransaction).toBe(false);
    });

    it("adds NOT NULL and an empty-array default when none exists", () => {
      const result = addArrayColumnWithoutNotNullRule.fix?.(
        arrayColumn({ raw: 'ALTER TABLE "Post" ADD COLUMN "tags" TEXT[];', hasDefault: false }),
      );
      expect(result?.statements).toEqual([
        `ALTER TABLE "Post" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}'`,
      ]);
    });
  });
});
