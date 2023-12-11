import { RawPgSchema } from './queries';
import { PgSchema } from './schema';
import { CustomTypeName, EnumName } from './types';

export interface PgTypeJson {
	name: string
	type: 'native' | 'enum' | 'custom'
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
      type: 'native',
    }
  }
}

// enum class -> custom defined enum
export class PgEnum extends PgType {
  name: EnumName

  values: string[]

  constructor(raw: RawPgSchema['enums'][number], schema: PgSchema) {
    super(raw.name, schema);

    this.schema = schema;
    this.values = raw.values.split(';');
  }

  toJson(): PgTypeJson {
    return {
      name: this.name,
      type: 'enum',
      values: this.values,
    }
  }
}

// custom type class -> fully custom defined type
export class PgCustomType extends PgType {
  name: CustomTypeName
  fields: PgField[]

  constructor(
    raw: RawPgSchema['types'][number],
    schema: PgSchema,
  ) {
    super(raw.name, schema);

    this.fields = raw.fields.map(field => new PgField(field, schema));
  }

  toJson(): PgTypeJson {
    return {
      name: this.name,
      type: 'custom',
      fields: this.fields.map(entry => entry.toJson())
    }
  }
}

// Custom type field
export class PgField {
  name: string
  protected schema: PgSchema

  type: PgType

  array: boolean = false
  nullable: boolean = false

  private raw: RawPgSchema['types'][number]['fields'][number];

  constructor(raw: RawPgSchema['types'][number]['fields'][number], schema: PgSchema) {
    this.name = raw.name;
    this.schema = schema;
    this.raw = raw;

    this.array = raw.data_type === 'ARRAY';
    this.nullable = raw.is_nullable === 'YES';

    this.type = this.getType();
  }

  private getType() {
    const lookupName = this.array ? this.raw.pg_type.slice(1)
      : this.raw.pg_type;

    return this.schema.lookupType(lookupName);
  }

  toJson() {
    return {
      name: this.name,
      type: this.type.toJson(),

      array: this.array,
      nullable: this.nullable,
    }
  }
}
