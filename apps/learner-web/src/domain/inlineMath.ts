export interface InlineTextSegment {
  kind: "text" | "math";
  value: string;
}

const latexCommand = /\\[A-Za-z]+/g;
const inlineMathCharacter = /[A-Za-z0-9\\{}[\]()^_+\-*/=.,:|<>!\s]/;

export function splitInlineMath(value: string): InlineTextSegment[] {
  const segments: InlineTextSegment[] = [];
  let cursor = 0;
  latexCommand.lastIndex = 0;

  for (let match = latexCommand.exec(value); match; match = latexCommand.exec(value)) {
    let start = match.index;
    let end = latexCommand.lastIndex;

    while (start > cursor && inlineMathCharacter.test(value[start - 1])) start -= 1;
    while (end < value.length && inlineMathCharacter.test(value[end])) end += 1;
    while (start < match.index && /\s/.test(value[start])) start += 1;
    while (end > latexCommand.lastIndex && /\s/.test(value[end - 1])) end -= 1;

    if (start > cursor) {
      segments.push({ kind: "text", value: value.slice(cursor, start) });
    }
    segments.push({ kind: "math", value: value.slice(start, end) });
    cursor = end;
    latexCommand.lastIndex = end;
  }

  if (cursor < value.length) {
    segments.push({ kind: "text", value: value.slice(cursor) });
  }
  return segments.length ? segments : [{ kind: "text", value }];
}
