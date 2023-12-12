export const filterAndMap = <Input extends any[], MappedOutput>(
	input: Input, mapper: (arg: Input[number]) => MappedOutput, skip: string[] = []
) => input.filter(entry => skip.indexOf(entry.name) < 0).map(mapper);
