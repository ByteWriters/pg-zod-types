import { RawPgSchema } from './queries';
import { ColumnName, CustomTypeName, EnumName, FunctionName, SchemaName, TableName } from './types';
import { PgCustomType, PgEnum, PgField, PgType, PgTypeJson } from './dataTypes';
import { filterAndMap, pascalize } from './util';

interface PgColumnJson {
	name: ColumnName
	type: PgTypeJson
	array: boolean
	nullable: boolean
	key_type: 'none' | 'primary' | 'foreign'
	references?: PgColumnJson & { table_name: string }
}

class PgColumn extends PgField {
	name: ColumnName
	table: PgTable
	default: string | null

	constructor(raw: RawPgSchema['columns'][number], schema: PgSchema, table: PgTable) {
		super(raw, schema);
		this.table = table;
		this.default = raw.column_default;
	}

	toJson(): PgColumnJson {
		return { ...super.toJson(), key_type: 'none' };
	}

	toZod(optional = false) {
		const required = optional ? false : !this.default;
		return super.toZod(required);
	}
}

class PgPrimaryColumn extends PgColumn {
	constructor(raw: RawPgSchema['columns'][number], schema: PgSchema, table: PgTable) {
		super(raw, schema, table);
	}

	toJson(): PgColumnJson {
		return { ...super.toJson(), key_type: 'primary' };
	}

	toType() {
		return `\t${this.name}: string & { _${this.table.name}: any },`;
	}
}

class PgForeignColumn extends PgColumn {
	references: PgColumn

	constructor(raw: RawPgSchema['columns'][number], schema: PgSchema, table: PgTable) {
		super(raw, schema, table);
	}

	setReferences(rawKey: RawPgSchema['pkeysFkeys'][number]) {
		this.references = this.schema.lookupColumn(rawKey.f_table_name, rawKey.f_column_name);
	}

	toType() {
		return `\t${this.name}: string & { _${this.references.table.name}: any },`;
	}

	toJson(): PgColumnJson {
		return {
			...super.toJson(),
			key_type: 'foreign',
			references: {
				table_name: this.references.table.name,
				...this.references.toJson(),
			},
		};
	}
}

class PgTable {
	name: string
	protected schema: PgSchema
	columns: PgColumn[]

	constructor(name: string, schema: PgSchema) {
		this.name = name;
		this.schema = schema;
	}

	setColumns(columns: PgColumn[]) {
		this.columns = columns;
	}

	toJson(skipColumns: ColumnName[] = []) {
		return {
			name: this.name as TableName,
			columns: filterAndMap(this.columns, entry => entry.toJson(), skipColumns)
		};
	}

	toZod() {
		const columns = this.columns.map(column => column.toZod()).join('\n');
		return `export const zod${pascalize(this.name)} = z.object({\n${columns}\n});`;
	}
}

class PgFunction {
	name: string
	protected schema: PgSchema
	arguments: PgField[]
	returnType: PgField

	constructor(raw: RawPgSchema['functions'][number], schema: PgSchema) {
		this.name = raw.name;
		this.schema = schema;

		const argParts = raw.args.split(', ');
		this.arguments = argParts.map((argStr, index) => {
			const [ name, arg_type ] = argStr.split(' ');
			const is_array = arg_type.endsWith('[]');

			return new PgField({
				name,
				pg_type: is_array ? arg_type.slice(0, -2) : arg_type,
				data_type: is_array ? 'ARRAY' : arg_type,
				is_nullable: 'NO',
				index: index + 1,
			}, schema);
		});

		const return_is_array = raw.return_type.endsWith('[]');
		this.returnType = new PgField({
			name: `returns`,
			data_type: return_is_array ? 'ARRAY' : raw.return_type,
			is_nullable: 'YES',
			pg_type: return_is_array ? raw.return_type.slice(0, -2) : raw.return_type
		}, schema);
	}

	toJson() {
		return {
			name: this.name,
			arguments: this.arguments.map(entry => entry.toJson()),
			returnType: this.returnType.toJson(),
		}
	}

	toZod() {
		const args = this.arguments.map(a => `\t${a.toZod(true)}`).join('\n');
		return `export const ${this.name} = {\n\targuments: {\n${args}\n\t},\n${this.returnType.toZod(true)}\n};`
	}
}

export interface PgSchemaOptions {
	name: SchemaName
	skip?: {
		columns?: Record<TableName, ColumnName[]>
		functions?: FunctionName[]
		tables?: TableName[]
		types?: (CustomTypeName | EnumName)[]
	}
}

export class PgSchema {
	private raw: RawPgSchema

	name: string;
	skip: PgSchemaOptions['skip'];

	functions: PgFunction[] = [];
	types: PgType[] = [];
	tables: PgTable[] = [];
	pkeys: PgPrimaryColumn[] = [];

	constructor(rawPgSchema: RawPgSchema, skip?: PgSchemaOptions['skip']) {
		this.raw = rawPgSchema;
		this.name = rawPgSchema.name;
		this.skip = skip;

		// Fill members in order of dependency
		this.types = this.raw.enums.map(entry => new PgEnum(entry, this));
		this.types.push(...this.raw.types.map(entry => new PgCustomType(entry, this)));

		this.functions = this.raw.functions.map(entry => new PgFunction(entry, this));

		this.tables = this.raw.tableNames.map(({ name: table_name }) => {
			// Construct table so it can be passed to columns
			const table = new PgTable(table_name, this);

			const rawColumns = this.raw.columns.filter(col => col.table_name === table_name);
			const columns = rawColumns.map(col => {
				// fetch pkey/fkey-info from postgres query-result / use to construct derived column classees
				const keyInfo = this.raw.pkeysFkeys.find(
					entry => entry.table_name === table_name && entry.column_name === col.name
				);

				if (!keyInfo) return new PgColumn(col, this, table);

				if (keyInfo.constraint_type === 'PRIMARY KEY') {
					const pkeyColumn = new PgPrimaryColumn(col, this, table);
					this.pkeys.push(pkeyColumn);
					return pkeyColumn;
				}

				if (keyInfo.constraint_type === 'FOREIGN KEY') {
					return new PgForeignColumn(col, this, table);
				}
			});

			// Set columns on table (want references to each other in both)
			table.setColumns(columns);
			return table;
		});

		// Inject fkey-references
		// (during column construction we don't know if the reference-column already exists)
		const fkeyEntries = this.raw.pkeysFkeys.filter(
			({ constraint_type }) => constraint_type === 'FOREIGN KEY'
		);

		for (const { column_name, table_name, f_column_name, f_table_name } of fkeyEntries) {
			const column = this.lookupColumn(table_name, column_name);
			const references = this.lookupColumn(f_table_name, f_column_name);

			(column as PgForeignColumn).references = references;
		}
	}

	lookupType(pg_type: string): PgType {
		const findByName = (({ name }) => pg_type === name);

		const foundType = this.types.find(findByName);
		if (foundType) return foundType;

		const newType = new PgType(pg_type, this);
		this.types.push(newType);

		return newType;
	}

	lookupTable(table_name: TableName) {
		return this.tables.find(({ name }) => name === table_name);
	}

	lookupColumn(table_name: TableName, column_name: ColumnName) {
		const table = this.lookupTable(table_name);
		return table.columns.find(({ name }) => name === column_name);
	}

	toJson() {
		return {
			name: this.name as SchemaName,
			types: filterAndMap(this.types, entry => entry.toJson(), this.skip?.types),
			functions: filterAndMap(this.functions, entry => entry.toJson(), this.skip?.functions),
			tables: filterAndMap(this.tables, entry => entry.toJson((this.skip?.columns || {})[entry.name]), this.skip?.tables),
			pkeys: this.pkeys.map(entry => ({ table_name: entry.table.name, ...entry.toJson() })),
		}
	}

	toZod() {
		// @TODO overrides (only for columns?)
		const enumZodExports = this.types.filter(t => t instanceof PgEnum).map(e => e.toZodExport()).join('\n\n');
		const customTypeZodExports = this.types.filter(t => t instanceof PgCustomType).map(c => c.toZodExport()).join('\n\n');
		const tables = this.tables.map(t => t.toZod()).join('\n\n');
		const functions = this.functions.map(f => f.toZod()).join('\n\n');

		return `/** THIS FILE IS AUTO-GENERATED! Don't edit manually :)*/

import z from 'zod';

/** User-defined enums */
${enumZodExports}

/** User-defined custom postgres types */
${customTypeZodExports}

/** User-defined functions */
${functions}

/** Tables */
${tables}`;
	}
}
