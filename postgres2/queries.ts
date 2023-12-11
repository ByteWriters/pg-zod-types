import { Client, ClientConfig } from 'pg';

import { ColumnName, EnumName, FunctionName, SchemaName, TableName, CustomTypeName } from './types';

export interface PgFieldResult {
	index?: number,
	name: string,
	pg_type: string,
	data_type: string,
	is_nullable: 'YES' | 'NO'
}

export interface PgColumnResult {
	name: ColumnName
	table_name: TableName
	column_default: string | null
	is_nullable: 'YES' | 'NO'
	pg_type: string
	data_type: string
}

const q_columns = `
SELECT table_name, column_name name, column_default, is_nullable, udt_name as pg_type, data_type
  FROM information_schema.columns
  WHERE table_schema = $1
  ORDER BY table_name, ordinal_position
`;

export interface PgEnumResult {
	name: EnumName
	pg_type: string
	values: string
}

const q_enums = `
SELECT t.typname as "name", t.typname as "pg_type", string_agg(e.enumlabel, ';') AS values
  FROM pg_type t
  JOIN pg_enum e on t.oid = e.enumtypid
  JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = $1
  GROUP BY t.typname, n.nspname
`;


export interface PgPrimaryForeignKeyResult {
	table_name: TableName
	column_name: ColumnName
	constraint_type: 'PRIMARY KEY' | 'FOREIGN KEY'
	f_schema_name: SchemaName
	f_table_name: TableName
	f_column_name: ColumnName
}

const q_pkeys_fkeys = `
  SELECT
    tc.table_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_schema AS f_schema_name,
    ccu.table_name AS f_table_name,
    ccu.column_name AS f_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE (tc.constraint_type = 'PRIMARY KEY' or tc.constraint_type = 'FOREIGN KEY')
    AND (tc.table_schema = $1)
  ORDER BY tc.table_schema, tc.table_name, tc.constraint_type
`;


export interface PgCustomTypeResult {
	name: CustomTypeName
	pg_type: string
	fields: PgFieldResult[]
}

const q_custom_types = `
SELECT udt_name "name", udt_name "pg_type", array_agg(json_build_object(
  'name', attribute_name,
  'is_nullable', is_nullable,
  'pg_type', attribute_udt_name,
  'data_type', data_type,
  'index', ordinal_position
)) AS fields
  FROM information_schema.attributes
  WHERE udt_schema = $1
  GROUP BY udt_schema, udt_name
`;

export interface PgFunctionResult {
	name: FunctionName
	args: string
	return_type: string
}

const q_functions = `
  SELECT
    p.proname AS name,
    pg_get_function_arguments(p.oid) AS args,
    pg_get_function_result(p.oid) AS return_type
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = $1
    AND p.probin is null
    AND (pg_get_function_result(p.oid) != 'trigger')
`;

export interface RawPgSchema {
	name: SchemaName
	columns: PgColumnResult[]
	enums: PgEnumResult[]
	functions: PgFunctionResult[]
	pkeysFkeys: PgPrimaryForeignKeyResult[]
	types: PgCustomTypeResult[]
	tableNames: TableName[]
}

export async function queryPgSchema(
	config: ClientConfig,
	schema_name: string,
): Promise<RawPgSchema> {
	const client = new Client(config);
	await client.connect();

	// Build output per-schema
	const runQuery = <ReturnType>(text: string) => client.query<ReturnType>(text, [schema_name]);

	// Collect everything in one go for faster querying & have all info in advance (fkey-relations)
	const { rows: columns } = await runQuery<PgColumnResult>(q_columns);
	const { rows: enums } = await runQuery<PgEnumResult>(q_enums);
	const { rows: functions } = await runQuery<PgFunctionResult>(q_functions);
	const { rows: pkeysFkeys } = await runQuery<PgPrimaryForeignKeyResult>(q_pkeys_fkeys);
	const { rows: types } = await runQuery<PgCustomTypeResult>(q_custom_types);

	await client.end();

	const tableNames = columns.reduce((list, { table_name }) => {
		if (list.indexOf(table_name) >= 0) return list;
		return [...list, table_name];
	}, [] as TableName[]).sort();

	return {
		name: schema_name,
		columns,
		enums,
		functions,
		pkeysFkeys,
		types,
		tableNames,
	};
}
