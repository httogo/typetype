# Custom Word Lists And Unified Display Design

## Goal

Build the first product-grade customization slice for TypeType: users can create custom word lists, assign reusable highlight style templates, enable multiple lists with priority, and see the resulting merged highlights in both reading and typing experiences.

## Scope

This slice covers:

- Reusable highlight style templates, separate from word lists.
- User word lists with words and fixed phrases.
- Multiple active word lists at once.
- Style merging across matched lists, where non-conflicting fields combine and conflicting fields use the higher list priority.
- Priority by list order: lists shown higher in the UI win conflicts.
- Word, phrase, and simple word-form matching.
- Reading and typing text display typography settings: font family, line height, letter spacing, word spacing, and max content width.
- Adding a clicked word or phrase to a selected word list from reading and typing tooltips.
- Import/export backup coverage for custom styles and word lists.

This slice does not cover:

- Cloud sync, account login, or sharing.
- Arbitrary CSS editing.
- Regex or wildcard word-list terms.
- Per-article customization profiles.
- Full application theming beyond the reading/typing text surface.

## Product Model

The selected model is reusable style templates:

- A `HighlightStyle` defines visual treatment such as text color, background color, font family, bold/italic, underline, strikethrough, border color, and border radius.
- A `WordList` stores user terms and references one `HighlightStyle`.
- The user can enable several word lists in reading or typing.
- The displayed order of enabled word lists is also the conflict priority.

If a word is in two lists:

- Distinct fields merge. Example: high-priority list sets text color, lower-priority list sets underline, both apply.
- Same-field conflicts use the higher list. Example: two lists set text color, the top list wins.
- Underline and strikethrough are independent decorations, so both can apply unless the same decoration field conflicts.

## Data Model

`Settings` gains:

- `customHighlightsEnabled`: global switch for user word-list highlighting.
- `typography`: shared reading/typing text presentation settings.

Storage gains:

- `typetype_highlight_styles`: reusable style templates.
- `typetype_word_lists`: user word lists and their order.

Defaults:

- Styles: "重点词", "新词", "已掌握".
- Lists: empty user list collection.

## Matching Rules

- Terms are normalized case-insensitively.
- A single-word term matches word tokens.
- A phrase term matches continuous word tokens, ignoring punctuation tokens between word groups only when the phrase itself contains spaces between words.
- Simple word-form matching is supported through suffix fallbacks aligned with the existing dictionary service behavior.
- Matching is window-aware through the existing `useTextRendering` pipeline, so long texts stay performant.

## UI

Add a `词表` page:

- Left side: word lists, enable switch, priority up/down, style selector, match word forms toggle, terms editor.
- Right side: style templates, preview, and focused controls for text color, background color, bold, italic, underline, strikethrough, and border radius.

Extend existing settings panel:

- Shared text display settings for reading and typing.
- Custom word-list highlighting toggle.

Extend word tooltip:

- Show an "加入词表" control when user word lists exist.
- Add selected word/phrase to a chosen list and refresh highlighting.

## Verification

Unit tests must cover:

- Style merge priority.
- Word and phrase matching.
- Simple word-form matching.
- Storage defaults and add-term dedupe.
- Full backup import/export includes custom styles and word lists.

Browser smoke checks should cover:

- Vocabulary page can create/update a list.
- Reading and typing pages render custom highlights.
- Typography settings visually affect both reading and typing text.
