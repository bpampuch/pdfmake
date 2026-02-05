# Snaking Columns: Technical Constraints & Limitations

This document outlines the known limitations of the Snaking Columns implementation in `pdfmake`. It allows developers to understand architectural constraints and recommended usage patterns.

## 1. Nested Snaking Columns (Limited Support)

**Status**: Experimental / Limited.

**Description**:
Nesting a "snaking column" group directly inside another "snaking column" group (a recursive snaking layout) is not fully supported by the current layout engine.

**Technical Context**:
The `pdfmake` engine manages content flow using a stack of `DocumentContext` snapshots. Snaking columns rely on complex manipulation of these snapshots to "overflow" content into the next column. When snaking columns are nested recursively, the engine faces ambiguity in determining which parent context is responsible for handling the overflow, leading to unstable coordinate management.

**Recommendation**:

- Avoid deep nesting of snaking columns within other snaking columns.
- Standard columns (non-snaking) _can_ be safely nested inside snaking columns.
- Snaking columns _can_ be safely nested inside standard columns.

## 2. Dynamic Header Repetition

**Status**: Not Supported.

**Description**:
The library does not currently support automatically repeating "Group Headers" (e.g., repeating a category title) when a column group breaks across a page or column. This differs from standard Table headers, which do support automatic repetition.

**Technical Context**:
Table headers are supported because tables possess a rigid, row-based structure that allows the engine to predict header placement. Snaking columns, by definition, are unstructured vertical flows. Dynamically injecting header nodes during the column-flow process interferes with the pre-calculated dimensions of the layout tree, preventing accurate placement without causing reflow cycles.

**Recommendation**:

- Manually place headers at the start of your content groups.
- If repeated headers are critical (e.g., for data-heavy reports), consider using a standard Table instead of Snaking Columns, as Tables natively support `headerRows` and page-break repetition.

## 3. Orphan Control ("Keep With Next")

**Status**: Standard Limitation.

**Description**:
Ensuring that a header is never left alone at the bottom of a column (orphan control) is challenging in dynamic column flows.

**Technical Context**:
The `unbreakable: true` property is designed to keep a block of content together on a single page, but it has limited look-ahead capabilities within complex column flows. It may not always accurately predict if a header and its following item will fit together in the remaining vertical space of a column.

**Recommendation**:

- Wrap small groups (e.g., a Header and its first paragraph) in a `stack` with `unbreakable: true` to enforce cohesion.
- Be aware that strictly enforcing `unbreakable` blocks in columns may result in uneven gaps at the bottom of the previous column.
