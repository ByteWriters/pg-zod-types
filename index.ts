import { ClientConfig } from 'pg';

import { getSchema } from './postgres2';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const config: ClientConfig = {
	host: process.env.POSTGRES_HOST || 'localhost',
	user: 'postgres',
	password: 'postgres'
};

(async () => {
	const schema = await getSchema(config);
	const json = schema.toJson();
	const zod = schema.toZod();

	writeFileSync(resolve(__dirname, 'test', 'output.json'), JSON.stringify(json, null, '\t'));
	writeFileSync(resolve(__dirname, 'test', 'output.ts'), zod);

	console.log('done.');
})();
