import { RawPgSchema } from './queries';
import { ColumnName, TableName } from './types';
import { PgCustomType, PgEnum, PgField, PgType, PgTypeJson } from './dataTypes';

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
}

class PgPrimaryColumn extends PgColumn {
	constructor(raw: RawPgSchema['columns'][number], schema: PgSchema, table: PgTable) {
		super(raw, schema, table);
	}

	toJson(): PgColumnJson {
		return { ...super.toJson(), key_type: 'primary' };
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

	toJson() {
		return {
			name: this.name,
			columns: this.columns.map(entry => entry.toJson())
		};
	}
}

export class PgSchema {
	private raw: RawPgSchema

	name: string;
	types: PgType[] = [];
	tables: PgTable[] = [];

	constructor(rawPgSchema: RawPgSchema) {
		this.raw = rawPgSchema;
		this.name = rawPgSchema.name;

		// Fill members in order of dependency
		this.types = this.raw.enums.map(entry => new PgEnum(entry, this));
		this.types.push(...this.raw.types.map(entry => new PgCustomType(entry, this)));

		this.tables = this.raw.tableNames.map(table_name => {
			const table = new PgTable(table_name, this);

			const rawColumns = this.raw.columns.filter(col => col.table_name === table_name);
			const columns = rawColumns.map(col => {
				const keyInfo = this.raw.pkeysFkeys.find(
					entry => entry.table_name === table_name && entry.column_name === col.name
				);

				if (!keyInfo) return new PgColumn(col, this, table);

				if (keyInfo.constraint_type === 'PRIMARY KEY') {
					return new PgPrimaryColumn(col, this, table);
				}

				if (keyInfo.constraint_type === 'FOREIGN KEY') {
					return new PgForeignColumn(col, this, table);
				}
			});

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
			name: this.name,
			types: this.types.map(entry => entry.toJson()),
			tables: this.tables.map(entry => entry.toJson()),
		}
	}
}
