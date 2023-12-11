import { ClientConfig } from 'pg';

import { queryPgSchema } from './queries';
import { SchemaName } from './types';
import { PgSchema } from './schema';

interface PgOptions {
  name: SchemaName
}

export async function getSchema(
  config: ClientConfig,
  options: PgOptions = { name: 'public' },
) {
  const rawSchema = await queryPgSchema(config, options.name);
  const schema = new PgSchema(rawSchema);

  return schema;
}
