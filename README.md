# FMD — Fenceless Markdown

Frontmatter as plain `key: value` lines, no YAML, every value a string.

```markdown
author: ada
category: notes
date: 2026-08-31
tags: markdown, metadata, parsing

# Title

The body starts here.
```

The metadata block sits at the very top of the document — the same position as YAML frontmatter, minus the fence. It's the first blank-line-delimited run of `key: value` lines; a blank line ends it, and everything after, including the H1, is body.

To a Markdown parser that has never heard of FMD, that block is an ordinary paragraph. Nothing breaks, no stray horizontal rule appears, and nothing leaks into the rendered page.

## Why

YAML frontmatter works, but it's borrowed weight — a full YAML parser runs before the document starts being itself, and it brings baggage that has nothing to do with what frontmatter is for:

- The Norway Problem — `NO` silently becomes `false` under YAML 1.1.
- Numbers lose trailing zeros (`1.20` → `1.2`).
- Dates get auto-cast into `Date` objects when a plain string was wanted.
- A `---` block renders unpredictably in plain Markdown viewers.

None of that is a metadata problem. It's a type-inference problem, inherited for free by choosing YAML as the container. FMD has no type inference to get wrong: every value is a string, always. Whether `date` becomes a `Date` or `tags` becomes an array is the consuming application's decision, not the format's.

Constraint is the rest of it. YAML's expressiveness is exactly what lets the same data drift into five valid encodings. FMD has one way to write a value — flat, one line, a string.

## Rules

- **Keys:** `[a-z0-9_]+` only. No camelCase, no kebab-case, no ambiguity about which convention wins.
- **Separator:** `key: value` — the space after the colon is required, which keeps parsing a single deterministic split rather than a tolerant guess.
- **Values:** always strings. Only the *first* colon splits, so `link: https://example.com/post` keeps its value intact.
- **No nesting.** Flat key-value only.
- **No folding, no multi-line values.** One line, one value. Long text belongs in the body.
- **Termination:** a blank line ends the block.

## Usage

```sh
npm install @unlitworks/fmd
```

```ts
import { parseFmd, stringifyFmd } from '@unlitworks/fmd';

const { meta, markdown } = parseFmd(document);
//    meta     → { author: 'ada', category: 'notes', date: '2026-08-31', … }
//    markdown → '# Title\n\nThe body starts here.'

const document = stringifyFmd(markdown, meta);
```

```ts
type FmdResult = { meta: Record<string, string>; markdown: string };

function parseFmd(text: string): FmdResult;
function stringifyFmd(markdown: string, meta: Record<string, string>): string;
```

The fields are `meta` / `markdown` rather than gray-matter's `data` / `content` — this is its own format with its own vocabulary. Zero dependencies, no Node or browser APIs.

## Behavior

- **Positional detection.** The block is the document's first block, full stop — leading blank lines are skipped, nothing else is. A run of `key: value` lines further down the document is prose.
- **All-or-nothing.** One non-matching line disqualifies the whole block; there is no partial capture. A document with no valid block returns `{ meta: {}, markdown: <whole text, trimmed> }`.
- **`parseFmd` never throws.** Malformed input is simply a document without metadata.
- **Line endings are preserved.** CRLF is tolerated when matching metadata lines, but the body is sliced from the original text — parsing a document must not silently rewrite it.
- **A leading BOM is stripped.** Duplicate keys: last wins. Values are trimmed at the end only.
- **`stringifyFmd` throws** `TypeError` on a key failing `[a-z0-9_]+` or a value containing a newline, rather than emitting a document that would reparse differently. It skips `null`, `undefined`, and empty-string values.
- **Round trip holds:** `parseFmd(stringifyFmd(markdown, meta))` deep-equals the inputs.

Two things to know before adopting it:

- A body that opens with `key: value` lines becomes metadata if the document has no block of its own. That's unavoidable given fenceless detection, and the format accepts it — in practice output always emits at least one key, so it only bites hand-written input.
- **Lists are the consumer's problem.** FMD has no array type. The usual convention is comma-joined (`tags: markdown, metadata, parsing`), which means a value containing a comma cannot round-trip. Refuse at serialization rather than silently splitting.

## What FMD is not trying to be

FMD doesn't compete with YAML frontmatter as a general-purpose data format. It has no ambition toward nested structures, types, or expressive schemas. It exists for a narrower and more common case: small, flat sets of facts about a document, expressed with the least machinery necessary, in a shape that never needs a special parser to look right — and never needs a fence.

A heading is a heading. A fact is a line.

## Versions

**v1.1** — current. The metadata block sits at the top of the document.

**v1.0** — briefly placed the block *after* the H1, so a note read straight into its title. Reverted: metadata is edited far more often than it's admired, and reaching it without scrolling won. The fence is still gone — that part stays.

## License

MIT for the implementation. The specification is CC BY, with an explicit grant to implement it freely in any language, under any license, without attribution in the resulting software.
