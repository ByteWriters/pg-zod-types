import { ClientConfig } from 'pg';

import { getSchema } from './postgres2';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const config: ClientConfig = {
	host: process.env.POSTGRES_HOST || 'localhost',
	user: 'postgres',
	password: 'postgres'
};

(async () => {
	const schema = await getSchema(config);
	const json = schema.toJson();

	writeFileSync(resolve(__dirname, 'test', 'output.json'), JSON.stringify(json, null, '\t'));

	console.log('done.');
})();
