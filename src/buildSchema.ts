import { AnyPgObject, PgTsBuilder, PgTsNamersOption, TsBuilderOptions } from './types';
import { PgSchema, PgTable } from './postgres/types';
import { pascalize } from './util';

const PLZGIMMEANAME: PgTsNamersOption['fallback'] = ({ name }) => pascalize(name);

export const buildSchema = (
  schema: PgSchema,
  builder: PgTsBuilder,
  options: TsBuilderOptions
) => {
  const optionNamers = options.namers || {};
  const optionOverrides = options.overrides || {};

  const getNamer = <Namer extends keyof PgTsNamersOption>(
    namer: Namer
  ): PgTsNamersOption[Namer] => optionNamers[namer]
    || builder.defaultNamers[namer]
    || optionNamers.fallback
    || builder.defaultNamers.fallback
    || PLZGIMMEANAME;

  const namers = {
    getEnumName: getNamer('pgEnum'),
    getCustomTypeName: getNamer('pgCustomType'),
    getCustomTypeValidatorName: getNamer('pgCustomTypeValidator'),
    getTableName: getNamer('pgTable'),
    getTableValidatorName: getNamer('pgTableValidator')
  };

  const hasOverride = (
    type: keyof TsBuilderOptions['overrides'], { name }: AnyPgObject
  ) => optionOverrides[type] && (name in optionOverrides[type]);

  const getOverride = (
    type: keyof TsBuilderOptions['overrides'], { name }: AnyPgObject
  ) => optionOverrides[type][name];

  const enumTypes = schema.enums.map(e => hasOverride('pgEnum', e)
    ? getOverride('pgEnum', e)
    : builder.pgEnum(e, namers, schema)
  ).join('\n\n');

  const customTypes = schema.types.map(t => hasOverride('pgCustomType', t)
    ? getOverride('pgCustomType', t)
    : builder.pgCustomType(t, namers, schema)
  ).join('\n\n');

  const functions = builder.pgFunctions(schema.functions, namers, schema);

  const getTableColumns = (pgTable: PgTable) => pgTable.columns.map(
    c => hasOverride('pgColumn', c)
      ? getOverride('pgColumn', c)
      : builder.pgColumn(c, namers, schema)
  ).join('\n');

  const tables = schema.tables.map(
    t => builder.pgTable(t, getTableColumns, namers, schema)
  ).join('\n\n');

  const tsOutput = `${enumTypes}\n\n${customTypes}\n\n${functions}\n\n${tables}`;

  return tsOutput;
}
