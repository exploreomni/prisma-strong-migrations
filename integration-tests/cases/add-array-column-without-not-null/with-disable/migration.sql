-- prisma-strong-migrations-disable-next-line addArrayColumnWithoutNotNull
ALTER TABLE "LandingPage" ADD COLUMN     "savedColors" TEXT[] DEFAULT ARRAY[]::TEXT[];
