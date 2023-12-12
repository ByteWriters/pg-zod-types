import { ClientConfig } from 'pg';

import { queryPgSchema } from './queries';
import { PgSchema, PgSchemaOptions } from './schema';

export async function getSchema(
	config: ClientConfig,
	options: PgSchemaOptions = { name: 'public' },
) {
	const rawSchema = await queryPgSchema(config, options.name);
	const schema = new PgSchema(rawSchema, options.skip);

	return schema;
}
