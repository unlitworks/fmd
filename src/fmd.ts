export type FmdResult = { meta: Record<string, string>; markdown: string };

const META_LINE = /^([a-z0-9_]+): (.*\S.*)$/;
const KEY = /^[a-z0-9_]+$/;

export function parseFmd(text: string): FmdResult {
	// CRLF is tolerated when matching, but the body is sliced out of the original
	// text — parsing a document must not silently rewrite its line endings.
	const source = text.replace(/^\ufeff/, '');
	const lines = source.split('\n');

	let i = 0;
	while (i < lines.length && isBlank(lines[i])) i++;

	const start = i;
	while (i < lines.length && !isBlank(lines[i])) i++;
	const block = lines.slice(start, i);

	if (block.length === 0 || !block.every((line) => META_LINE.test(line.trimEnd()))) {
		return { meta: {}, markdown: source.trim() };
	}

	const meta: Record<string, string> = {};
	for (const line of block) {
		const [, key, value] = META_LINE.exec(line.trimEnd())!;
		meta[key] = value.trimEnd();
	}

	return { meta, markdown: lines.slice(i).join('\n').trim() };
}

export function stringifyFmd(markdown: string, meta: Record<string, string>): string {
	const lines: string[] = [];

	for (const [key, value] of Object.entries(meta)) {
		if (value === undefined || value === null || value === '') continue;
		if (!KEY.test(key)) {
			throw new TypeError(`Invalid FMD key: ${JSON.stringify(key)}`);
		}
		if (value.includes('\n')) {
			throw new TypeError(`FMD values cannot span multiple lines: ${JSON.stringify(key)}`);
		}
		lines.push(`${key}: ${value}`);
	}

	const body = markdown.trim();
	if (lines.length === 0) return body ? `${body}\n` : '';
	return `${lines.join('\n')}\n\n${body}\n`;
}

function isBlank(line: string): boolean {
	return line.trim() === '';
}
