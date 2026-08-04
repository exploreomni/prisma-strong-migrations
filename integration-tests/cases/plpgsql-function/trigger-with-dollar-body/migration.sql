-- Full-text search trigger. The function body is dollar-quoted, so the semicolons
-- and statements inside it are not migration statements.
CREATE FUNCTION "documents_tsv_update"() RETURNS trigger AS $$
BEGIN
  DELETE FROM "documents_stale";
  NEW."tsv" :=
    to_tsvector('simple', coalesce(NEW."title", '') || ' ' || coalesce(NEW."body", '') || ' ' || coalesce(NEW."author", '') || ' ' || coalesce(NEW."tags", '') || ' ' || coalesce(NEW."summary", '') || ' ' || coalesce(NEW."notes", '') || ' ' || coalesce(NEW."slug", ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "documents_tsv_trigger"
BEFORE INSERT OR UPDATE ON "documents"
FOR EACH ROW EXECUTE FUNCTION "documents_tsv_update"();

ALTER TABLE "documents" DROP COLUMN "legacy_body";
