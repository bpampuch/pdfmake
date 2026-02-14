# Snaking Columns: Technical Constraints & Limitations

This document outlines the known limitations of the Snaking Columns implementation in `pdfmake`. It allows developers to understand architectural constraints and recommended usage patterns.

## 1. Single-Source-Column Contract

**Status**: By Design.

**Description**:
When `snakingColumns: true` is enabled, only the **first column** should contain content. Subsequent columns serve as empty placeholders for overflow.

```javascript
// Correct usage
{
  columns: [
    { text: myLongContent, width: '*' },  // Content goes here
    { text: '', width: '*' },              // Empty overflow target
    { text: '', width: '*' }               // Empty overflow target
  ],
  snakingColumns: true
}
```

**Runtime Validation**:
If content is detected in columns > 0, pdfmake will emit a console warning:
```
pdfmake: snakingColumns only uses the first column for content. Content in subsequent columns will be ignored.
```

This warning uses a forward-compatible heuristic and does not halt PDF generation.

## 2. Nested Snaking Columns (Limited Support)

**Status**: Experimental / Limited.

**Description**:
Nesting a "snaking column" group directly inside another "snaking column" group (a recursive snaking layout) is not fully supported by the current layout engine.

**Technical Context**:
The `pdfmake` engine manages content flow using a stack of `DocumentContext` snapshots. Snaking columns rely on complex manipulation of these snapshots to "overflow" content into the next column. When snaking columns are nested recursively, the engine faces ambiguity in determining which parent context is responsible for handling the overflow, leading to unstable coordinate management.

**Recommendation**:

- Avoid deep nesting of snaking columns within other snaking columns.
- Standard columns (non-snaking) _can_ be safely nested inside snaking columns.
- Snaking columns _can_ be safely nested inside standard columns.

## 3. Dynamic Header Repetition (Non-Table Content)

**Status**: Not supported for arbitrary content; supported for tables via `headerRows`/`keepWithHeaderRows`.

**Description**:
The library does not support automatically repeating arbitrary "Group Headers" (e.g., repeating a category title from a `stack` or `text` node) when a snaking column group breaks across a column or page.

However, table `headerRows` and `keepWithHeaderRows` are supported inside snaking columns. When a table with `headerRows` is placed inside a snaking column layout, header rows are repeated at column and page transitions.

**Technical Context**:
Table headers work through the table repeatable-fragment path in `PageElementWriter` (used on both `moveToNextColumn()` and `moveToNextPage()`), combined with snaking-state reset/snapshot synchronization on page breaks in `DocumentContext` (`resetSnakingColumnsForNewPage()`). Together these ensure table headers continue to render correctly when flow crosses columns and pages.

This behavior is covered by integration tests in `tests/integration/snaking_columns_table_headerRows.spec.js` and example documents (`snaking_columns_table_headerRows.js`, `snaking_columns_table_keepWithHeaderRows.js`).

For non-table content (plain `text`, `stack`, etc.), there is no equivalent mechanism to automatically repeat a header block when content overflows into a new column.

**Recommendation**:

- For data-heavy reports requiring repeated headers, use a table with `headerRows` (and optionally `keepWithHeaderRows`) inside snaking columns. See `snaking_columns_table_headerRows.js` and `snaking_columns_table_keepWithHeaderRows.js`.
- How to spot the difference: with `keepWithHeaderRows`, flow moves earlier, leaving a slightly larger bottom gap instead of placing a repeated header with too few following rows.
- For non-table content, manually place headers at the start of your content groups.

## 4. Orphan Control ("Keep With Next")

**Status**: Standard Limitation.

**Description**:
Ensuring that a header is never left alone at the bottom of a column (orphan control) is challenging in dynamic column flows.

**Technical Context**:
The `unbreakable: true` property is designed to keep a block of content together on a single page, but it has limited look-ahead capabilities within complex column flows. It may not always accurately predict if a header and its following item will fit together in the remaining vertical space of a column.

**Recommendation**:

- Wrap small groups (e.g., a Header and its first paragraph) in a `stack` with `unbreakable: true` to enforce cohesion.
- Be aware that strictly enforcing `unbreakable` blocks in columns may result in uneven gaps at the bottom of the previous column.

