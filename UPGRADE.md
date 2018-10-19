# UPGRADE GUIDE (Manual, Step‑by‑Step)

Upgrade path: FlowAccount fork based on pdfmake 0.1.32 -> upstream pdfmake 0.2.20 while preserving custom business logic.

This is the PRESCRIPTIVE, HANDS-ON RUNBOOK. Follow steps in order. Log decisions as you go.

---

## 0. Legend

- C1..C8 = Customizations (defined in Section 7)
- (LOG) = Add a note to an internal change log / commit message
- (CHECK) = Perform verification before continuing

---

## 1. Workspace & Preparation

1. Ensure clean tree:
   ```bash
   git status
   ```
   Abort if uncommitted changes exist (stash or commit first).
2. Add upstream remote (skip if exists):
   ```bash
   git remote add upstream https://github.com/bpampuch/pdfmake.git || true
   git fetch upstream --tags
   ```
3. Record current base version (banner check):
   ```bash
   grep -m1 'pdfmake v' build/pdfmake.js
   # Expect: pdfmake v0.1.32
   ```
4. Create migration branch starting from upstream 0.2.20 (RECOMMENDED CLEAN START):
   ```bash
   git checkout -b fa-migrate-0.2.20 upstream/0.2.20
   ```
   If you must stay on existing feature branch, skip this and instead replace `src/` contents manually—but history will be noisier.
5. Copy FlowAccount assets from old fork (in another clone/tab) as needed:
   - `dev-playground/` (optional for manual testing)
   - Custom fonts (if any)
   - Any prior migration docs (if you saved them elsewhere)

---

## 2. Snapshot & Baseline (Optional but Recommended)

1. Collect sample PDFs from current (0.1.32) fork for regression comparison:
   - minimal invoice
   - long table with header repeat
   - document with watermark
   - document with remark table
   - dynamic header/footer doc
2. Store them under a local folder outside repo (to avoid committing binaries).
3. Note approximate file sizes & page counts in a scratch file.

---

## 3. Reintroduce Project Scaffolding (If Needed)

If upstream 0.2.20 removed tooling you rely on, decide:

- Option A (Preferred): Adopt upstream build scripts only.
- Option B: Temporarily re-add `gulpfile.js` & `webpack.config.js` from old fork (will refactor later).

(Document decision) (LOG)

---

## 4. Recreate Customization Inventory

(If you lost earlier inventory) In old fork clone:

```bash
git worktree add ../pdfmake-upstream-0.1.32 upstream/0.1.32 || true
diff -ru ../pdfmake-upstream-0.1.32/src ./src | grep -E "Remark|footerBreak|modify by tak|newPageFooterBreak|heightHeaderAndFooter" > custom-snippets.log || true
```

Copy relevant logic snippets into Section 7 table below (or keep `custom-snippets.log` uncommitted).

---

## 5. Forward-Port Customizations (One Commit Each)

General pattern per customization:

1. Open upstream version of file.
2. Add minimal adaptation of logic (avoid copy of unrelated formatting).
3. Insert a comment: `// FlowAccount: C# <short description>`.
4. Run a minimal smoke generation script (see Section 9 quick script).
5. Commit with message: `feat(migration): reapply C# <name>`.

Execution order (dependency-aware):

1. C1 Dynamic Header/Footer sizing.
2. C2 Remark Table transformation.
3. C5 Remark pre-break (space threshold) & C6 styling.
4. C7 Vertical align adjustments.
5. C3 Footer guard + C8 Fragment semantics.
6. C4 newPageFooterBreak (possibly merge into C3/C8 if redundant).

After each commit run (CHECK) smoke script.

---

## 6. Verification & Regression

After all customizations reapplied:

1. Generate PDFs for the earlier baseline scenarios.
2. Manually verify:
   - Headers not overlapping content.
   - Footer appears exactly once per page & not duplicated on forced breaks.
   - Remark table not split incorrectly & header row still present if intended.
   - Non-breaking long text now wraps/behaves per 0.2.20 fix (no overflow off-page).
   - Vertical alignment in table rows consistent with previous fork.
   - Watermark remains behind content.
3. Optional diffing: rasterize first pages and visual diff (external tool).
4. Performance smoke: measure generation time for large doc (notebook or console timing) (LOG any >15% increase).

---

## 7. Customizations (Authoritative List)

| ID  | Purpose                                    | File(s) (Upstream 0.2.20 target)            | Reapplied? (Y/N) | Notes                              |
| --- | ------------------------------------------ | ------------------------------------------- | ---------------- | ---------------------------------- |
| C1  | Dynamic header/footer height margin adjust | `src/layoutBuilder.js`                      |                  |                                    |
| C2  | Remark table injection/assembly            | Prefer `docPreprocessor.js` or early layout |                  | Refactor to avoid hard-coded index |
| C3  | Footer duplication guard (`footerBreak`)   | `src/layoutBuilder.js`                      |                  |                                    |
| C4  | Fallback footer page-break control         | `src/pageElementWriter.js`                  |                  | Might merge with C3/C8             |
| C5  | Force new page before small remark space   | `src/tableProcessor.js`                     |                  | Parametrize threshold              |
| C6  | Remark line color styling                  | `src/tableProcessor.js`                     |                  |                                    |
| C7  | Vertical alignment stack adjustments       | `src/layoutBuilder.js`                      |                  |                                    |
| C8  | Custom fragment/footer add semantics       | `src/pageElementWriter.js`                  |                  |                                    |

(UPDATE this table live.)

---

## 8. Acceptance Checklist

Mark all with ✓ before tagging:

- [ ] All C1–C8 applied or intentionally deprecated
- [ ] Smoke docs render without exceptions
- [ ] Remark logic correct (no orphan label row)
- [ ] No duplicate footers / no footer loss
- [ ] Header margin shift correct on multi-line header
- [ ] Large table: header repetition intact
- [ ] Non-breaking long word behavior improved
- [ ] Watermark unaffected
- [ ] Fonts embed (check PDF properties -> Fonts list)
- [ ] Performance within ±10% baseline

---

## 9. Smoke Test Script (Ad-hoc)

Create `scripts/smoke.js` (example):

```js
const fs = require("fs");
const PdfPrinter = require("../src/printer");
const fonts = {
	Roboto: {
		normal: "tests/fonts/Roboto-Regular.ttf",
		bold: "tests/fonts/Roboto-Medium.ttf",
		italics: "tests/fonts/Roboto-Italic.ttf",
		bolditalics: "tests/fonts/Roboto-Italic.ttf",
	},
};
const printer = new PdfPrinter(fonts);

function gen(name, docDef) {
	const pdfDoc = printer.createPdfKitDocument(docDef, {});
	const chunks = [];
	pdfDoc.on("data", (c) => chunks.push(c));
	pdfDoc.on("end", () => {
		fs.writeFileSync(`tmp-${name}.pdf`, Buffer.concat(chunks));
		console.log("Generated", name);
	});
	pdfDoc.end();
}

// Basic header/footer test
gen("header-footer", {
	header: { text: "HEADER\nLine2", fontSize: 12 },
	footer: (p, c) => ({ text: `Page ${p} / ${c}` }),
	content: Array(50).fill({ text: "Line of text." }),
});

// Remark table style test (adapt docDef to your remark schema)
// gen('remark', <your doc def here>);
```

Run:

```bash
node scripts/smoke.js
ls -lh tmp-*.pdf
```

---

## 10. Tag & Release

1. Final commit message: `chore: finish migration to pdfmake 0.2.20 (C1–C8 reapplied)`
2. Tag:
   ```bash
   git tag fa-0.2.20
   git push origin fa-0.2.20
   ```
3. Release notes include customization outcomes & any deprecations.

---

## 11. Rollback Procedure

If regression discovered post-release:

1. Checkout prior tag: `git checkout fa-legacy-0.1.32` (ensure tag exists beforehand).
2. Redeploy dependent service with that version.
3. Archive failing doc + both PDFs, file issue referencing customization ID(s).

---

## 12. Future Upgrade Pattern

For next upgrade (e.g., 0.2.20 -> 0.2.x+):

1. Duplicate this file to `UPGRADE-0.2.20-TO-0.2.x.md` as template.
2. Refresh Section 7 inventory vs new upstream tag.
3. Repeat Sections 1–10; keep customizing smaller / more isolated each time.
4. If upstream upstreams (absorbs) a customization, remove code & mark Deprecated.

---

## 13. Appendix: Rationale for Order

- C1 first: header margin affects all subsequent layout coordinates.
- C2 early: transforms document structure; later steps depend on final structure.
- C5/C6 before footer logic: page splitting rules can influence how footers land.
- C7 before fragment changes: vertical alignment needs stable block geometry.
- C3/C8 unify footer & fragment semantics once structural/layout invariants settled.
- C4 last: may become unnecessary after C3/C8 consolidation.

---

## 14. Decision Log (Fill During Migration)

| Date | Decision                    | Choice              | Why |
| ---- | --------------------------- | ------------------- | --- |
|      | Build pipeline              | A/B                 |     |
|      | Remark injection location   | Preprocessor/Layout |     |
|      | Footer logic merge C3+C4+C8 | Yes/No              |     |

---

Maintain accuracy—future cost depends on fidelity here.
