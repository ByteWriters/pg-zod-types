import { RawPgSchema } from './queries';
import { PgSchema } from './schema';
import { CustomTypeName, EnumName } from './types';
import { pascalize, pgTypeMap, pgZodMap } from './util';

export interface PgTypeJson {
	name: string
	variant: 'builtin' | 'enum' | 'custom'
	values?: string[]
	fields?: ReturnType<PgField['toJson']>[]
};

// base class -> native type like 'text', 'uuid', ...
export class PgType {
	name: string
	protected schema: PgSchema

	constructor(name: string, schema: PgSchema) {
		this.name = name;
		this.schema = schema;
	}

	toJson(): PgTypeJson {
		return {
			name: this.name,
			variant: 'builtin',
		}
	}

	toType(): string {
		const [ _, mappedType ] = Object.entries(pgTypeMap).find(
			([ key ]) => this.name.indexOf(key) === 0
		) || [];

		if (!mappedType) throw new Error(`No mapping found for native type "${this.name}"`);

		return mappedType;
	}

	toZodExport(): string {
		throw new Error(`Native postgres-type "${this.name}" has no top-level export`);
	}

	toZod(): string {
		const [ _, mappedType ] = Object.entries(pgZodMap).find(
			([ key ]) => this.name.indexOf(key) === 0
		) || [];

		if (!mappedType) throw new Error(`No mapping found for native type "${this.name}"`);

		return mappedType;
	}
}

// enum class -> custom defined enum
export class PgEnum extends PgType {
	name: EnumName
	getExportName: (_this: PgEnum) => string

	values: string[]

	constructor(
		raw: RawPgSchema['enums'][number],
		schema: PgSchema,
		getName: PgEnum['getExportName'] = _this => pascalize(this.name)
	) {
		super(raw.name, schema);

		this.getExportName = getName;
		this.schema = schema;
		this.values = raw.values.split(';');
	}

	toJson(): PgTypeJson {
		return {
			name: this.name,
			variant: 'enum',
			values: this.values,
		}
	}

	toType() {
		const enumValues = this.values.map(v => `\t${v} = '${v}',`).join('\n');
		return `export enum ${this.getExportName(this)} {\n${enumValues}\n};`
	}

	// top-level export to be referenced by toZod
	// enum happens to be compatible for both TS and zod
	toZodExport() {
		return this.toType();
	}

	toZod() {
		return `z.nativeEnum(${this.getExportName(this)})`;
	}
}

// custom type class -> fully custom defined type
export class PgCustomType extends PgType {
	name: CustomTypeName
	getExportName: (_this: PgCustomType) => string

	fields: PgField[]

	constructor(
		raw: RawPgSchema['types'][number],
		schema: PgSchema,
		getName: PgCustomType['getExportName'] = _this => pascalize(this.name)
	) {
		super(raw.name, schema);
		this.getExportName = getName;

		this.fields = raw.fields.map(field => new PgField(field, schema));
	}

	toJson(): PgTypeJson {
		return {
			name: this.name,
			variant: 'custom',
			fields: this.fields.map(entry => entry.toJson())
		}
	}

	// top-level export to be referenced by toZod
	toZodExport() {
		const fields = this.fields.map(field => `${field.toZod()}`).join('\n');
		return `export const ${this.getExportName(this)} = z.object({\n${fields}\n});`
	}

	toZod() {
		return this.getExportName(this);
	}
}

// Custom type field
export class PgField {
	name: string
	protected schema: PgSchema

	type: PgType

	array: boolean = false
	nullable: boolean = false

	constructor(raw: RawPgSchema['types'][number]['fields'][number], schema: PgSchema) {
		this.name = raw.name;
		this.schema = schema;

		this.array = raw.data_type === 'ARRAY';
		this.nullable = raw.is_nullable === 'YES';

		// unfortunate exception handled poorly xD - function args don't have the '_' at the start, but custom type fields do
		const pg_type = (this.array && raw.pg_type.charAt(0) === '_') ? raw.pg_type.slice(1) : raw.pg_type;
		this.type = this.schema.lookupType(pg_type);
	}

	toJson() {
		return {
			name: this.name,
			type: this.type.toJson(),

			array: this.array,
			nullable: this.nullable,
		}
	}

	toZod(required: boolean = false) {
		const withArray = (type: string) => this.array ? `z.array(${type})` : type;
		let zod = withArray(this.type.toZod());
		if (this.nullable) zod += '.nullable()';
		if (!required) zod += '.optional()';

		return `\t${this.name}: ${zod},`;
	}
}
