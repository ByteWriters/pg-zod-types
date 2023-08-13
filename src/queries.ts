export const columns = `
SELECT table_schema schema_name, table_name, column_name name, column_default, is_nullable, udt_name as pg_type
  FROM information_schema.columns
  WHERE table_schema != 'pg_catalog' AND table_schema != 'information_schema'
  ORDER BY table_name, ordinal_position
`;

export const enums = `
SELECT t.typname as name, n.nspname schema_name, string_agg(e.enumlabel, ';') AS values
  FROM pg_type t
  JOIN pg_enum e on t.oid = e.enumtypid
  JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
  GROUP BY name, schema_name
`;

export const keys = `
  SELECT
    tc.table_schema schema_name,
    tc.table_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_schema AS f_schema_name,
    ccu.table_name AS f_table_name,
    ccu.column_name AS f_column_name
  FROM  information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE (tc.constraint_type = 'PRIMARY KEY' or tc.constraint_type = 'FOREIGN KEY')
    AND (ccu.table_schema != 'pg_catalog')
  ORDER BY tc.table_schema, tc.table_name, tc.constraint_type
`;
