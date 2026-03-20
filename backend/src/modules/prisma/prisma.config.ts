
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "src/modules/prisma/schema.prisma",
  migrations: {
    path: "src/modules/prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
