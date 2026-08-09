import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL ?? (() => {
  const user = encodeURIComponent(process.env.DB_USER ?? 'tickets');
  const password = encodeURIComponent(process.env.DB_PASSWORD ?? 'tickets');
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '3306';
  const database = encodeURIComponent(process.env.DB_NAME ?? 'tickets');
  return `mysql://${user}:${password}@${host}:${port}/${database}`;
})();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'npm run seed' },
  datasource: { url: databaseUrl }
});
