import { Client, ClientConfig } from 'pg';

interface PostgresOptions {
  schemas: string[]
}

export const describeDB = async (
  clientConfig: ClientConfig,
  options: PostgresOptions
) => {
  const client = new Client(clientConfig);

  await client.connect();

  const getTable = async (name: string, enums: any[]) => {
    const { rows: columnRows } = await client.query(`
      SELECT *
        FROM information_schema.columns
        WHERE table_name = '${name}'
        ORDER BY ordinal_position
    `);

    const { rows: fkeyRows } = await client.query(`
      SELECT
        tc.table_schema, 
        tc.constraint_type,
        tc.constraint_name,
        tc.table_name, 
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM  information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE (tc.constraint_type = 'PRIMARY KEY' or tc.constraint_type = 'FOREIGN KEY') AND tc.table_name='${name}';
    `);

    console.log(fkeyRows)
  }

  const getSchema = async (name: string) => {
    const { rows: tableRows } = await client.query(`
      SELECT * FROM information_schema.tables
      WHERE table_schema = '${name}' ORDER BY table_name
    `);

    const { rows: enums } = await client.query(`
      SELECT t.typname as name, concat('"', string_agg(e.enumlabel, '","'), '"') AS values
        FROM pg_type t
        JOIN pg_enum e on t.oid = e.enumtypid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = '${name}'
        GROUP BY name
    `);

    const tableNames = tableRows.map(({ table_name }) => table_name);
    const tables =  await Promise.all(tableNames.map(tableName => getTable(tableName, enums)));

    return { name, tables };
  }

  const schemas = await Promise.all(options.schemas.map(getSchema));
  await client.end();
}
