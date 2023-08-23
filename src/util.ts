const spaceChars = [' ', '-', '_'];

export const pascalize = (str: string) => [...str].reduce(
  ({ output, capitalize_next }, char) => {
    if (spaceChars.includes(char)) return { output, capitalize_next: true };
    const next_char = capitalize_next ? char.toUpperCase() : char;
    return { output: output + next_char, capitalize_next: false };
  },
  { output: '', capitalize_next: true }
).output;
