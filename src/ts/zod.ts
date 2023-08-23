import { PgColumn } from '../postgres/types';
import { pascalize } from '../util';

export const pgColumn2zodString = (
  column: PgColumn,
  getTableName = pascalize,
  getEnumName = pascalize,
) => {
  let baseType = '';

  switch(column.type.pg_type) {
    case 'uuid': baseType = 'z.string().uuid()'; break;
    case 'serial': baseType = 'z.number().int().min(1)'; break;

    case 'bool': baseType = 'z.boolean()'; break;

    case 'double': baseType = 'z.number()'; break;
    case 'int': baseType = 'z.number().int()'; break;

    case 'text': baseType = 'z.string()'; break;
    case 'timestamp': baseType = 'z.string().datetime()'; break;

    case 'json': baseType = 'z.any()'; break;

    default: {
      switch(column.type.kind) {
        case 'enum': baseType = `z.nativeEnum(${getEnumName(column.type.pg_type)})`; break;
        default: baseType = 'z.any()'; break;
      }
    }
  }

  const { array, type: { has_default, nullable } } = column;

  const zodBaseType = array ? `z.array(${baseType})` : baseType;
  const zodBase = nullable ? `${zodBaseType}.nullable()` : zodBaseType;

  // return (nullable || has_default) ? `${zodBase}.optional()` : zodBase;
  return `${zodBase}.optional()`;

  // switch(operation) {
  //   case 'delete': return pkey ? zodBase : `${zodBase}.optional()`;
  //   case 'insert': return (nullable || has_default) ? `${zodBase}.optional()` : zodBase;
  //   case 'update': return pkey ? zodBase : `${zodBase}.optional()`;
  //   default: return `${zodBase}.optional()`;
  // }
}
