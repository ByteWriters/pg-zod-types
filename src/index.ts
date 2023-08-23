import { ClientConfig } from 'pg';

import { getPgDB } from './postgres';
import { PgSchemaOptions } from './postgres/util';
import { pgSchema2tsFile } from './ts';
import { TsOptions } from './ts/types';

export { getPgDB } from './postgres';

const defaultTemplate = (tsOutput: string) => `import z from 'zod'\n\n${tsOutput}`;

export const pg2ts = async (
  clientConfig: ClientConfig,
  pgOptions: PgSchemaOptions | PgSchemaOptions[] = { name: 'public', skipTables: [] },
  tsOptions: TsOptions = {}
) => {
  const db = await getPgDB(clientConfig, Array.isArray(pgOptions) ? pgOptions : [ pgOptions ]);
  const template = tsOptions.template || defaultTemplate;

  if (Array.isArray(pgOptions)) return db.schemas.map(
    schema => template(pgSchema2tsFile(schema, tsOptions))
  );

  return template(pgSchema2tsFile(db.schemas[0], tsOptions));
}
