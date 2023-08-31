import { PgColumn } from '../postgres/types';
import { pascalize } from '../util';
import { PgOperation } from './types';

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

export const pgColumn2zodString = (
  column: PgColumn,
  operation: PgOperation = 'select',
  override: string = '',
  getEnumName = pascalize,
) => {
  if (override && override.indexOf('z.') === 0) return override;

  // Any-fallback unless checks below find a mapped type
  let baseType = 'z.any()';
  
  if (column.type.kind === 'enum') {
    baseType = `z.nativeEnum(${getEnumName(column.type.pg_type)})`;
  }

  const [ _, mappedType ] = Object.entries(pgTypeMap).find(
    ([ key ]) => column.type.pg_type.indexOf(key) === 0
  ) || [];

  if (mappedType) baseType = mappedType;

  // Add modifiers based on nullability/default & operation type
  const { array, type: { has_default, nullable } } = column;

  const zodBaseType = array ? `z.array(${baseType})` : baseType;
  const zodBase = (nullable ? `${zodBaseType}.nullable()` : zodBaseType) + override;

  const notOptional = (
    (operation === 'insert' && !has_default) ||
    ((operation === 'delete' || operation === 'update') && column.pkey)
  );

  if (notOptional) return zodBase;

  return `${zodBase}.optional()`;
}
