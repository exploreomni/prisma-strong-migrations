import { describe, it, expect } from "vite-plus/test";
import { parseSql } from "./sql-parser";

describe("parseSql", () => {
  describe("ALTER TABLE", () => {
    it("DROP COLUMN → dropColumn", () => {
      const results = parseSql(`ALTER TABLE "users" DROP COLUMN "name";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "dropColumn",
        table: "users",
        column: "name",
        line: 1,
      });
    });

    it("ADD COLUMN → addColumn with dataType", () => {
      const results = parseSql(`ALTER TABLE "users" ADD COLUMN "email" text;`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "addColumn",
        table: "users",
        column: "email",
        dataType: "text",
      });
    });

    it("RENAME COLUMN → renameColumn", () => {
      const results = parseSql(`ALTER TABLE "users" RENAME COLUMN "name" TO "full_name";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "renameColumn",
        table: "users",
        column: "name",
      });
    });

    it("ALTER COLUMN TYPE → alterColumnType", () => {
      const results = parseSql(`ALTER TABLE "users" ALTER COLUMN "age" TYPE bigint;`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "alterColumnType",
        table: "users",
        column: "age",
        dataType: "bigint",
      });
    });

    it("SET NOT NULL → alterColumnSetNotNull", () => {
      const results = parseSql(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "alterColumnSetNotNull",
        table: "users",
        column: "email",
      });
    });

    it("ADD CONSTRAINT FOREIGN KEY → addConstraint, foreignKey", () => {
      const results = parseSql(
        `ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");`,
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "addConstraint",
        constraintType: "foreignKey",
        table: "posts",
      });
      expect(results[0].notValid).toBeUndefined();
    });

    it("ADD CONSTRAINT CHECK NOT VALID → notValid: true", () => {
      const results = parseSql(
        `ALTER TABLE "users" ADD CONSTRAINT "users_age_check" CHECK (age > 0) NOT VALID;`,
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "addConstraint",
        constraintType: "check",
        table: "users",
        notValid: true,
      });
    });

    it("ADD CONSTRAINT UNIQUE → addConstraint, unique", () => {
      const results = parseSql(
        `ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");`,
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "addConstraint",
        constraintType: "unique",
        table: "users",
      });
    });

    it("ADD CONSTRAINT EXCLUDE → addConstraint, exclusion", () => {
      const results = parseSql(
        `ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist (room WITH =, during WITH &&);`,
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "addConstraint",
        constraintType: "exclusion",
        table: "bookings",
      });
    });

    it("RENAME TO → renameTable", () => {
      const results = parseSql(`ALTER TABLE "users" RENAME TO "accounts";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "renameTable",
        table: "users",
      });
    });
  });

  describe("CREATE INDEX", () => {
    it("without CONCURRENTLY → concurrently: false", () => {
      const results = parseSql(`CREATE INDEX "users_email_idx" ON "users"("email");`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "createIndex",
        table: "users",
        indexName: "users_email_idx",
        concurrently: false,
        unique: false,
      });
    });

    it("with CONCURRENTLY → concurrently: true", () => {
      const results = parseSql(`CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "createIndex",
        concurrently: true,
      });
    });

    it("UNIQUE → unique: true", () => {
      const results = parseSql(`CREATE UNIQUE INDEX "users_email_key" ON "users"("email");`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "createIndex",
        unique: true,
        concurrently: false,
      });
    });

    it("includes columns list", () => {
      const results = parseSql(`CREATE INDEX "idx" ON "users"("first_name", "last_name");`);
      expect(results[0].columns).toEqual(["first_name", "last_name"]);
    });
  });

  describe("DROP INDEX", () => {
    it("without CONCURRENTLY → concurrently: false", () => {
      const results = parseSql(`DROP INDEX "users_email_idx";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "dropIndex",
        indexName: "users_email_idx",
        concurrently: false,
      });
    });

    it("with CONCURRENTLY → concurrently: true", () => {
      const results = parseSql(`DROP INDEX CONCURRENTLY "users_email_idx";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "dropIndex",
        concurrently: true,
      });
    });
  });

  describe("DROP TABLE", () => {
    it("single table → one dropTable", () => {
      const results = parseSql(`DROP TABLE "users";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "dropTable",
        table: "users",
        line: 1,
      });
    });

    it("multiple tables → one dropTable per table", () => {
      const results = parseSql(`DROP TABLE "a", "b", "c";`);
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.table)).toEqual(["a", "b", "c"]);
      for (const result of results) {
        expect(result.type).toBe("dropTable");
        expect(result.line).toBe(1);
        expect(result.raw).toBe(`DROP TABLE "a", "b", "c";`);
      }
    });

    it("multiple tables in the slow path → one dropTable per table", () => {
      // The NOT VALID constraint makes the whole-file parse fail, forcing the
      // per-statement fallback path.
      const sql = `ALTER TABLE "orders" ADD CONSTRAINT "c" CHECK ("total" > 0) NOT VALID;
DROP TABLE "a", "b";`;
      const results = parseSql(sql);
      const dropped = results.filter((r) => r.type === "dropTable");
      expect(dropped.map((r) => r.table)).toEqual(["a", "b"]);
      expect(dropped.map((r) => r.line)).toEqual([2, 2]);
    });

    it("disable comment applies to every table in a multi-table drop", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line dropTable
DROP TABLE "a", "b";`;
      const results = parseSql(sql);
      expect(results).toHaveLength(2);
      for (const result of results) {
        expect(result.disabled).toEqual(["dropTable"]);
      }
    });
  });

  describe("disable comment", () => {
    it("disable-next-line → disabled populated for next stmt", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results).toHaveLength(1);
      expect(results[0].disabled).toEqual(["remove_column"]);
    });

    it("multiple rules in comment → array", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column rename_column
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column", "rename_column"]);
    });

    it("no rule name → disable all (empty array)", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual([]);
    });

    it("comment not before statement → no disabled", () => {
      const sql = `ALTER TABLE "users" DROP COLUMN "name";
-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "users" ADD COLUMN "email" text;`;
      const results = parseSql(sql);
      expect(results[0].disabled).toBeUndefined();
      expect(results[1].disabled).toEqual(["remove_column"]);
    });

    it("reason after -- is captured in disableReason", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column -- コード削除済み
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column"]);
      expect(results[0].disableReason).toBe("コード削除済み");
    });

    it("no reason → disableReason is undefined", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column"]);
      expect(results[0].disableReason).toBeUndefined();
    });

    it("reason with multiple rules on one line", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column, rename_column -- デプロイ完了後に適用
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column", "rename_column"]);
      expect(results[0].disableReason).toBe("デプロイ完了後に適用");
    });

    it("multiple disable comment lines merged for same statement", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column -- コード削除済み
-- prisma-strong-migrations-disable-next-line rename_column -- 後方互換性のため
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column", "rename_column"]);
      expect(results[0].disableReason).toBe("コード削除済み, 後方互換性のため");
    });

    it("multiple disable comment lines without reason merged correctly", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column
-- prisma-strong-migrations-disable-next-line rename_column
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column", "rename_column"]);
      expect(results[0].disableReason).toBeUndefined();
    });
  });

  describe("approve comment", () => {
    it("approve-next-line → approved populated for next stmt", () => {
      const sql = `-- prisma-strong-migrations-approve-next-line removeColumn
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results).toHaveLength(1);
      expect(results[0].approved).toEqual(["removeColumn"]);
      expect(results[0].disabled).toBeUndefined();
    });

    it("no rule name → approve all (empty array)", () => {
      const sql = `-- prisma-strong-migrations-approve-next-line
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].approved).toEqual([]);
    });

    it("reason comment after -- is ignored but the rule is still approved", () => {
      const sql = `-- prisma-strong-migrations-approve-next-line removeColumn -- レビュー済み
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].approved).toEqual(["removeColumn"]);
    });

    it("disable and approve comments coexist on the same statement", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line renameColumn
-- prisma-strong-migrations-approve-next-line removeColumn
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results).toHaveLength(1);
      expect(results[0].disabled).toEqual(["renameColumn"]);
      expect(results[0].approved).toEqual(["removeColumn"]);
    });

    it("approve comment not before statement → no approved", () => {
      const sql = `ALTER TABLE "users" DROP COLUMN "name";
-- prisma-strong-migrations-approve-next-line removeColumn
ALTER TABLE "users" ADD COLUMN "email" text;`;
      const results = parseSql(sql);
      expect(results[0].approved).toBeUndefined();
      expect(results[1].approved).toEqual(["removeColumn"]);
    });
  });

  describe("line numbers", () => {
    it("assigns correct line number to each statement", () => {
      const sql = `ALTER TABLE "users" DROP COLUMN "name";
ALTER TABLE "posts" DROP COLUMN "title";`;
      const results = parseSql(sql);
      expect(results[0].line).toBe(1);
      expect(results[1].line).toBe(2);
    });

    it("accounts for multi-line statements", () => {
      const sql = `ALTER TABLE "posts"
  ADD CONSTRAINT "posts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].line).toBe(1);
      expect(results[1].line).toBe(4);
    });
  });

  describe("multiple statements", () => {
    it("parses multiple statements from one file", () => {
      const sql = `ALTER TABLE "users" DROP COLUMN "name";
ALTER TABLE "posts" RENAME COLUMN "title" TO "subject";
CREATE INDEX CONCURRENTLY "idx" ON "orders"("status");`;
      const results = parseSql(sql);
      expect(results).toHaveLength(3);
      expect(results[0].action).toBe("dropColumn");
      expect(results[1].action).toBe("renameColumn");
      expect(results[2].type).toBe("createIndex");
    });
  });

  describe("ALTER SCHEMA", () => {
    it("RENAME TO → alterSchema", () => {
      const results = parseSql(`ALTER SCHEMA "public" RENAME TO "private";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterSchema",
      });
    });
  });

  describe("VALIDATE CONSTRAINT", () => {
    it("VALIDATE CONSTRAINT → validateConstraint", () => {
      const results = parseSql(`ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_user_id_fkey";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "validateConstraint",
        table: "orders",
        constraintName: "orders_user_id_fkey",
        line: 1,
      });
    });

    it("unquoted constraint name", () => {
      const results = parseSql(`ALTER TABLE "users" VALIDATE CONSTRAINT chk_age;`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "validateConstraint",
        table: "users",
        constraintName: "chk_age",
      });
    });
  });

  describe("UPDATE", () => {
    it("UPDATE without WHERE → updateStatement with hasWhere: false", () => {
      const results = parseSql(`UPDATE "users" SET "name" = 'foo';`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "updateStatement",
        table: "users",
        hasWhere: false,
        line: 1,
      });
    });

    it("UPDATE with WHERE → updateStatement with hasWhere: true", () => {
      const results = parseSql(`UPDATE "users" SET "name" = 'foo' WHERE id = 1;`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "updateStatement",
        table: "users",
        hasWhere: true,
      });
    });
  });

  describe("DELETE FROM", () => {
    it("DELETE FROM without WHERE → deleteStatement with hasWhere: false", () => {
      const results = parseSql(`DELETE FROM "users";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "deleteStatement",
        table: "users",
        hasWhere: false,
        line: 1,
      });
    });

    it("DELETE FROM with WHERE → deleteStatement with hasWhere: true", () => {
      const results = parseSql(`DELETE FROM "users" WHERE id = 1;`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "deleteStatement",
        table: "users",
        hasWhere: true,
      });
    });
  });

  describe("dollar-quoted bodies", () => {
    // CREATE TRIGGER makes the whole-file parse throw, so these all take the
    // per-statement splitting path.
    const migration = (tag: string, body: string) => `CREATE FUNCTION f() RETURNS trigger AS ${tag}
BEGIN
${body}
END;
${tag} LANGUAGE plpgsql;

CREATE TRIGGER t BEFORE INSERT ON "docs" FOR EACH ROW EXECUTE FUNCTION f();
ALTER TABLE "users" DROP COLUMN "name";`;

    it("does not report statements from inside a $$ body", () => {
      const body = `  DELETE FROM "audit_log";\n  DELETE FROM "sessions";`;
      const results = parseSql(migration("$$", body));
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ type: "createTrigger", table: "docs", line: 8 });
      expect(results[1]).toMatchObject({ type: "alterTable", action: "dropColumn", line: 9 });
    });

    it("does not report statements from inside a named $tag$ body", () => {
      const body = `  DELETE FROM "audit_log";\n  DELETE FROM "sessions";`;
      const results = parseSql(migration("$fn$", body));
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ type: "createTrigger", table: "docs" });
      expect(results[1]).toMatchObject({ type: "alterTable", action: "dropColumn" });
    });

    const concat = (count: number) =>
      Array.from({ length: count }, (_, i) => `coalesce(NEW.c${i},'')`).join(" || ' ' || ");

    // A body cut mid-expression sends pgsql-ast-parser exponential: 6 `||` terms took
    // ~46s, and real full-text-search trigger migrations have more.
    it("stays fast on a body with many || terms", () => {
      const body = `  NEW.tsv := to_tsvector('simple', ${concat(12)});`;
      const results = parseSql(migration("$$", body));
      expect(results).toHaveLength(2);
      expect(results[1]).toMatchObject({ type: "alterTable", action: "dropColumn" });
    }, 5000);

    it("does not hang on an unterminated $$ body", () => {
      const sql = `CREATE FUNCTION f() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector('simple', ${concat(12)});
  RETURN NEW;`;
      expect(parseSql(sql)).toEqual([]);
    }, 5000);

    it("treats $1 as a placeholder, not a dollar quote", () => {
      const sql = `CREATE FUNCTION f(int) RETURNS int AS 'SELECT $1' LANGUAGE sql;
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ type: "alterTable", action: "dropColumn", line: 2 });
    });
  });
});
