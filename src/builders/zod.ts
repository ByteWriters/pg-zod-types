import { PgColumn, PgFunction, PgSchema } from '../postgres/types';
import { BuilderFn, PgOperation, PgTsBuilder, PgTsNamers } from '../types';
import { pascalize } from '../util';

/** Column builder */
const pgTypeMap = {
  uuid: 'z.string().uuid()',
  serial: 'z.number().int().min(1)',

  bool: 'z.boolean()',

  double: 'z.number()',
  int: 'z.number().int()',

  text: 'z.string()',
  timestamp: 'z.string().datetime()',

  json: 'z.any()',
}

const pgColumn2zodString = (
  column: PgColumn,
  operation: PgOperation = 'select',
  { getEnumName, getCustomTypeValidatorName }: PgTsNamers,
  schema: PgSchema,
) => {
  // Any-fallback unless checks below find a mapped type
  let baseType = 'z.any()';
  
  if (column.type.kind === 'enum') {
    const pgEnum = schema.enums.find(e => e.pg_type === column.type.pg_type);
    baseType = `z.nativeEnum(${getEnumName(pgEnum, schema)})`;
  }

  if (column.type.kind === 'custom') {
    const pgType = schema.types.find(t => t.pg_type === column.type.pg_type);
    baseType = getCustomTypeValidatorName(pgType, schema);
  }

  const [ _, mappedType ] = Object.entries(pgTypeMap).find(
    ([ key ]) => column.type.pg_type.indexOf(key) === 0
  ) || [];

  if (mappedType) baseType = mappedType;

  // Add modifiers based on nullability/default & operation type
  const { type: { array, has_default, nullable } } = column;

  const zodBaseType = array ? `z.array(${baseType})` : baseType;
  const zodBase = (nullable ? `${zodBaseType}.nullable()` : zodBaseType);

  const notOptional = (
    (operation === 'insert' && !has_default) ||
    ((operation === 'delete' || operation === 'update') && column.pkey)
  );

  if (notOptional) return zodBase;

  return `${zodBase}.optional()`;
}

/** Per-PG-object builders */
const enumBuilder: PgTsBuilder['pgEnum'] = (_enum, { getEnumName }, schema) => {
  const name = getEnumName(_enum, schema);

  const { values } = _enum;
  const enumValues = values.map(v => `\t${v} = '${v}',`).join('\n');

  return `export enum ${name} {\n${enumValues}\n}`;
}

const customTypeBuilder: PgTsBuilder['pgCustomType'] = (
  pgType,
  namers,
  schema
) => {
  const typeFields = pgType.fields.map(f => {
    const fieldDef = pgColumn2zodString(
      { ...f, pkey: false },
      'select',
      namers,
      schema,
    );
    return `\t${f.name}: ${fieldDef}${f.type.array ? '[]' : ''},`;
  }).join('\n');

  const zodTypeName = namers.getCustomTypeValidatorName(pgType, schema);
  const typeName = namers.getCustomTypeName(pgType, schema);

  const zodType = `export const ${zodTypeName} = z.object({\n${typeFields}\n});`;
  const tsType = `export type ${typeName} = z.infer<typeof ${zodTypeName}>;`;

  return `${zodType}\n${tsType}`;
}

const functionBuilder = (
  { name, args, returns }: PgFunction,
  namers: PgTsNamers,
  schema: PgSchema
) => {
  const argTypes = args.map(
    arg => `\t\t\t${arg.name}: ${pgColumn2zodString(arg, 'insert', namers, schema)},`
  ).join('\n');

  const returnType = pgColumn2zodString(
    { name: '', type: returns }, 'insert', namers, schema
  );

  return `\t'${name}': {\n\t\targs: z.object({\n${argTypes}\n\t\t}),\n\t\treturns: ${returnType}\n\t},`;
}

const functionsBuilder: PgTsBuilder['pgFunctions'] = (
  functions,
  namers,
  schema
) => {
  const functionsString = functions.map(f => functionBuilder(f, namers, schema)).join('\n');
  return `export const functions = {\n${functionsString}\n}`
}

const columnBuilder: BuilderFn<PgColumn> = (
  column,
  namers,
  schema
) => `\t${column.name}: ${pgColumn2zodString(column, 'select', namers, schema)},`

const tableBuilder: PgTsBuilder['pgTable'] = (
  pgTable, getColumns, namers, schema
) => {
  const tableName = namers.getTableName(pgTable, schema);
  const zodName = namers.getTableValidatorName(pgTable, schema);

  const tableTs = `export const ${zodName} = z.object({\n${getColumns(pgTable)}\n});`;
  const typeTs = `export type ${tableName} = z.infer<typeof ${zodName}>;`;

  return `${tableTs}\n${typeTs}`;
}

const defaultTemplate = (tsOutput: string) => `import z from 'zod'\n\n${tsOutput}`;

const defaultNamers: PgTsBuilder['defaultNamers'] = {
  fallback: ({ name }) => pascalize(name),
  pgCustomTypeValidator: ({ name }) => `zod${pascalize(name)}`,
  pgTableValidator: ({ name }) => `zod${pascalize(name)}`
};

/** Exported Zod-builder */
export const zodBuilder: PgTsBuilder = {
  defaultNamers,
  defaultTemplate,
  pgColumn: columnBuilder,
  pgCustomType: customTypeBuilder,
  pgEnum: enumBuilder,
  pgFunctions: functionsBuilder,
  pgTable: tableBuilder,
};
