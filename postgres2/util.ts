export const filterAndMap = <Input extends any[], MappedOutput>(
	input: Input, mapper: (arg: Input[number]) => MappedOutput, skip: string[] = []
) => input.filter(entry => skip.indexOf(entry.name) < 0).map(mapper);

export const pgTypeMap = {
  uuid: 'string',
  serial: 'number',

  bool: 'boolean',

  double: 'number',
	float: 'number',
  int: 'number',

  text: 'string',
  timestamp: 'string',

  json: 'any',
}


export const pgZodMap = {
  uuid: 'z.string().uuid()',
  serial: 'z.number().int().min(1)',

  bool: 'z.boolean()',

  double: 'z.number()',
	float: 'z.number()',
  int: 'z.number().int()',

  text: 'z.string()',
  timestamp: 'z.string().datetime()',

  json: 'z.any()',
}

const spaceChars = [' ', '-', '_'];

export const pascalize = (str: string) => [...str].reduce(
  ({ output, capitalize_next }, char) => {
    if (spaceChars.includes(char)) return { output, capitalize_next: true };
    const next_char = capitalize_next ? char.toUpperCase() : char;
    return { output: output + next_char, capitalize_next: false };
  },
  { output: '', capitalize_next: true }
).output;
