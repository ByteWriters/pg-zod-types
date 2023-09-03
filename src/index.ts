import { ClientConfig } from 'pg';

import { getPgDB } from './postgres';
import { PgSchema, PgSchemaOptions } from './postgres/types';
import { TsBuilderOptions } from './types';
import { buildSchema } from './buildSchema';
import { builders } from './builders';
import { writeFileSync } from 'fs';

export { getPgDB } from './postgres';

export type DbBuilderOptions = PgSchemaOptions & TsBuilderOptions

export const PgSchema2String = (
  schema: PgSchema,
  options: DbBuilderOptions = {} as DbBuilderOptions
) => {
  const builder = options.builder || builders.zod;

  const template = options.template || builder.defaultTemplate || (s => s);
  const output = template(buildSchema(schema, builder, options), schema);

  if (options.outFile) writeFileSync(options.outFile, output);

  return output;
}

export const PgDb2String = async (
  clientConfig: ClientConfig,
  options: DbBuilderOptions | DbBuilderOptions[]
) => {
  const schemas = await getPgDB(
    clientConfig,
    Array.isArray(options) ? options : [ options ]
  );

  if (Array.isArray(options)) return schemas.map(
    (s, i) => PgSchema2String(s, options[i])
  );

  return PgSchema2String(schemas[0], options);
}
