import { ClientConfig } from 'pg';

import { getPgDB } from './postgres';
import { PgDbOptions } from './postgres/util';
import { injectPgDbZod } from './zod';
import { PgZodDb } from './zod/types';

export { getPgDB } from './postgres';

export const getPgZod = async (
  clientConfig: ClientConfig,
  options: PgDbOptions = [{ name: 'public', skipTables: [] }]
) => {
  const db = await getPgDB(clientConfig, options);
  injectPgDbZod(db);

  return db as PgZodDb;
}
