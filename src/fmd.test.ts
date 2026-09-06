import { describe, expect, it } from 'vitest';
import { parseFmd, stringifyFmd } from './fmd';

describe('parseFmd', () => {
	it('reads a metadata block that opens the document', () => {
		const { meta, markdown } = parseFmd('category: notes\nauthor: ada\n\nThe body starts here.\n');

		expect(meta).toEqual({ category: 'notes', author: 'ada' });
		expect(markdown).toBe('The body starts here.');
	});

	it('keeps an H1 that follows the metadata block in the markdown', () => {
		const { meta, markdown } = parseFmd('category: notes\n\n# Title\n\nThe body starts here.\n');

		expect(meta).toEqual({ category: 'notes' });
		expect(markdown).toBe('# Title\n\nThe body starts here.');
	});

	it('does not look past an H1 for the metadata block', () => {
		const text = '# Title\n\ncategory: notes\n\nThe body starts here.';

		expect(parseFmd(text)).toEqual({ meta: {}, markdown: text });
	});

	it('parses the example from the FMD spec', () => {
		const { meta, markdown } = parseFmd(
			[
				'author: ada',
				'category: notes',
				'date: 2026-08-31',
				'tags: markdown, metadata, parsing',
				'',
				'# Title',
				'',
				'The body starts here.'
			].join('\n')
		);

		expect(meta).toEqual({
			author: 'ada',
			category: 'notes',
			date: '2026-08-31',
			tags: 'markdown, metadata, parsing'
		});
		expect(markdown).toBe('# Title\n\nThe body starts here.');
	});

	it('splits on the first colon only', () => {
		const { meta } = parseFmd('link: https://example.com/post\n\nBody.');

		expect(meta.link).toBe('https://example.com/post');
	});

	it('returns the whole document when it opens with prose', () => {
		const text = 'Just a paragraph.\n\nAnd another one.';

		expect(parseFmd(text)).toEqual({ meta: {}, markdown: text });
	});

	it('does not capture a key-value-looking block further down the document', () => {
		const text = 'Some intro paragraph.\n\nnote: this is prose\nabout: something';

		expect(parseFmd(text)).toEqual({ meta: {}, markdown: text });
	});

	it('does not look past a heading of any level', () => {
		const text = '## Section\n\ncategory: notes\n\nBody.';

		expect(parseFmd(text)).toEqual({ meta: {}, markdown: text });
	});

	it('requires the space after the colon', () => {
		const text = 'category:notes\n\nBody.';

		expect(parseFmd(text)).toEqual({ meta: {}, markdown: text });
	});

	it.each(['Category: x', 'my-key: x', 'my key: x'])(
		'rejects the block for the key in %j',
		(line) => {
			const text = `${line}\n\nBody.`;

			expect(parseFmd(text)).toEqual({ meta: {}, markdown: text });
		}
	);

	it('rejects the whole block when one line is not metadata', () => {
		const text = 'category: notes\nauthor: ada\ndate: 2026-08-31\njust some prose\n\nBody.';

		expect(parseFmd(text)).toEqual({ meta: {}, markdown: text });
	});

	it('rejects the block when a value is empty', () => {
		const text = 'category: \nauthor: ada\n\nBody.';

		expect(parseFmd(text)).toEqual({ meta: {}, markdown: text });
	});

	it('parses CRLF input the same as LF input', () => {
		const crlf = parseFmd('category: notes\r\nauthor: ada\r\n\r\nThe body.\r\n');

		expect(crlf).toEqual(parseFmd('category: notes\nauthor: ada\n\nThe body.\n'));
		expect(crlf.markdown).toBe('The body.');
	});

	it('preserves CRLF line endings inside the body', () => {
		const { meta, markdown } = parseFmd('category: notes\r\n\r\nFirst line.\r\nSecond line.\r\n');

		expect(meta).toEqual({ category: 'notes' });
		expect(markdown).toBe('First line.\r\nSecond line.');
	});

	it('preserves CRLF when there is no metadata block', () => {
		expect(parseFmd('First line.\r\nSecond line.\r\n').markdown).toBe('First line.\r\nSecond line.');
	});

	it('strips a leading BOM', () => {
		const { meta, markdown } = parseFmd('﻿category: notes\n\nBody.');

		expect(meta).toEqual({ category: 'notes' });
		expect(markdown).toBe('Body.');
	});

	it('handles empty and whitespace-only input', () => {
		expect(parseFmd('')).toEqual({ meta: {}, markdown: '' });
		expect(parseFmd('   \n\n\t\n')).toEqual({ meta: {}, markdown: '' });
	});

	it('handles a document that is only a metadata block', () => {
		expect(parseFmd('category: notes\nauthor: ada\n')).toEqual({
			meta: { category: 'notes', author: 'ada' },
			markdown: ''
		});
	});

	it('handles a metadata block followed by an H1 and no body', () => {
		expect(parseFmd('category: notes\n\n# Title\n')).toEqual({
			meta: { category: 'notes' },
			markdown: '# Title'
		});
	});

	it('keeps the last value when a key repeats', () => {
		const { meta } = parseFmd('category: first\ncategory: second\n\nBody.');

		expect(meta.category).toBe('second');
	});

	it('trims trailing whitespace but preserves whitespace inside a value', () => {
		const { meta } = parseFmd('tags: markdown, metadata, parsing  \n\nBody.');

		expect(meta.tags).toBe('markdown, metadata, parsing');
	});
});

describe('stringifyFmd', () => {
	it('writes a metadata block followed by the body', () => {
		const out = stringifyFmd('The body starts here.', { category: 'notes', author: 'ada' });

		expect(out).toBe('category: notes\nauthor: ada\n\nThe body starts here.\n');
	});

	it('preserves insertion order', () => {
		const out = stringifyFmd('Body.', {
			date: '2026-08-31',
			author: 'ada',
			category: 'notes'
		});

		expect(out.split('\n').slice(0, 3)).toEqual([
			'date: 2026-08-31',
			'author: ada',
			'category: notes'
		]);
	});

	it('omits empty values', () => {
		const meta = {
			category: 'notes',
			subtitle: '',
			title: undefined,
			author: null
		} as unknown as Record<string, string>;

		expect(stringifyFmd('Body.', meta)).toBe('category: notes\n\nBody.\n');
	});

	it('writes only the body when there is no metadata', () => {
		expect(stringifyFmd('Body.', {})).toBe('Body.\n');
	});

	it('throws on a key that could not be parsed back', () => {
		expect(() => stringifyFmd('Body.', { 'my-key': 'x' })).toThrow(TypeError);
		expect(() => stringifyFmd('Body.', { Category: 'x' })).toThrow(TypeError);
	});

	it('throws on a multi-line value', () => {
		expect(() => stringifyFmd('Body.', { note: 'one\ntwo' })).toThrow(TypeError);
	});

	it('round-trips through parseFmd', () => {
		const meta = {
			category: 'notes',
			author: 'ada',
			date: '2026-08-31',
			tags: 'markdown, metadata, parsing',
			link: 'https://example.com/post'
		};
		const markdown = '# Title\n\nThe body starts here.\n\n- a list item';

		expect(parseFmd(stringifyFmd(markdown, meta))).toEqual({ meta, markdown });
	});
});
