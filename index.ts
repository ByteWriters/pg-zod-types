import { ClientConfig } from 'pg';

import { getSchema } from './postgres2';

const config: ClientConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  user: 'postgres',
  password: 'postgres'
};

(async () => {
  const schema = await getSchema(config);
  const json = schema.toJson();

  console.log('done.');
})();
