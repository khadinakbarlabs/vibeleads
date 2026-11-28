// Parse each item independently so a large authorized download only buffers one row.
export async function* recordArray(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let opened = false,
    closed = false,
    depth = 0,
    quoted = false,
    escaped = false,
    afterComma = false;
  let fragments: string[] = [];
  try {
    for (;;) {
      const chunk = await reader.read();
      const text = decoder.decode(chunk.value, { stream: !chunk.done });
      let start = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (!opened || closed) {
          if (/\s/.test(char)) {
            start = i + 1;
            continue;
          }
          if (opened || char !== "[") throw Error("Invalid saved list");
          opened = true;
          start = i + 1;
          continue;
        }
        if (quoted) {
          if (escaped) escaped = false;
          else if (char === "\\") escaped = true;
          else if (char === '"') quoted = false;
        } else if (char === '"') quoted = true;
        else if (char === "{" || char === "[") depth++;
        else if (char === "}" || (char === "]" && depth)) {
          if (--depth < 0) throw Error("Invalid saved record");
        } else if (!depth && (char === "," || char === "]")) {
          fragments.push(text.slice(start, i));
          const item = fragments.join("").trim();
          if (item) yield JSON.parse(item) as unknown;
          else if (char === "," || afterComma)
            throw Error("Missing saved record");
          fragments = [];
          start = i + 1;
          afterComma = char === ",";
          closed = char === "]";
        }
      }
      if (!closed && opened && start < text.length)
        fragments.push(text.slice(start));
      if (chunk.done) break;
    }
    if (!closed) throw Error("Incomplete saved list");
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
