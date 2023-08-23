import { TsOptions, TableBuilderOptions } from './types';
import { pgColumn2zodString } from './zod';
import { PgColumn, PgCustomType, PgEnum, PgSchema, PgTable, } from '../postgres/types';
import { pascalize } from '../util';

const defaultZodTableNamer = (name: string) => `z_${name}`;

/** Default pg/zod typescript string generators */
const defaultEnumBuilder = (
  { pg_type, values }: PgEnum,
  getName = pascalize
) => {
  const enumValues = values.map(v => `\t${v} = '${v}',`).join('\n');

  return `enum ${getName(pg_type)} {\n${enumValues}\n}`;
}

const defaultTypeBuilder = (
  { pg_type, fields }: PgCustomType,
  getEnumName = pascalize,
  getTableName = pascalize,
  getTypeName = pascalize,
) => {
  const typeFields = fields.map(f => {
    const fieldDef = pgColumn2zodString(
      { ...f, pkey: false },
      getTableName,
      getEnumName
    );
    return `\t${f.name}: ${fieldDef}${f.array ? '[]' : ''},`;
  }).join('\n');

  return `const ${getTypeName(pg_type)} = {\n${typeFields}\n}`;
}

const defaultColumnBuilder = (
  getTableName = pascalize,
  getEnumName = pascalize
) => (
  column: PgColumn
) => `\t${column.name}: ${pgColumn2zodString(column, getTableName, getEnumName)},`

const defaultTableBuilder = (
  { name, columns }: PgTable,
  options: TableBuilderOptions
) => {
  const getZodTableName = options.getZodTableName;
  const getTableName = options.getTableName || options.getGlobalName || pascalize;
  const getEnumName = options.getEnumName || options.getGlobalName;

  const columnBuilder = options.columnBuilder || defaultColumnBuilder(
    getTableName, getEnumName
  );

  const columnDefs = columns.map(columnBuilder).join('\n');

  const tableName = getZodTableName ? getZodTableName(name) : getTableName(name);
  const exportType = getZodTableName ? 'const' : ' interface';
  const typeStart = getZodTableName ? 'z.object(' : '';
  const typeEnd = getZodTableName ? '\n});' : '\n}';

  const tableTs = `export ${exportType} ${tableName} = ${typeStart}{\n${columnDefs}${typeEnd}`;

  return getZodTableName
    ? `${tableTs}\n\nexport type ${getTableName(name)} = z.infer<typeof ${getZodTableName(name)}>`
    : tableTs;
}

/** Configurable PgZodSchema to typescript-file generator */
export const pgSchema2tsFile = (
  schema: PgSchema,
  options: TsOptions
) => {
  const getEnumName = options.enumNamer || options.globalNamer;
  const getTableName = options.tableNamer || options.globalNamer;
  const getTypeName = options.typeNamer || options.globalNamer;
  const getGlobalName = options.globalNamer;

  const enumTypes = schema.enums.map(e => {
    if (options.enumBuilder) return options.enumBuilder(e);

    return defaultEnumBuilder(e, getEnumName);
  }).join('\n\n');

  const customTypes = schema.types.map(t => {
    if (options.typeBuilder) return options.typeBuilder(t);

    return defaultTypeBuilder(t, getEnumName, getTableName, getTypeName);
  }).join('\n\n');

  const tables = schema.tables.map(t => {
    if (options.tableBuilder) return options.tableBuilder(t);

    return defaultTableBuilder(t, {
      columnBuilder: options.columnBuilder || defaultColumnBuilder(
        getTableName,
        getEnumName
      ),
      getEnumName,
      getGlobalName,
      getTableName,
      getZodTableName: defaultZodTableNamer
    });
  }).join('\n\n');

  const tsOutput = `${enumTypes}\n\n${customTypes}\n\n${tables}`;

  if (options.template) return options.template(tsOutput);
  return tsOutput;
}
