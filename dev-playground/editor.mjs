import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { keymap } from '@codemirror/view';
import { indentWithTab, undo, redo, undoDepth, redoDepth, historyField } from '@codemirror/commands';
import { Compartment, EditorState } from '@codemirror/state';
import { linter, lintGutter, setDiagnostics } from '@codemirror/lint';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { parse } from 'acorn';

const properties = ['content', 'text', 'style', 'styles', 'defaultStyle', 'fontSize', 'bold', 'italics', 'color', 'alignment',
  'margin', 'pageSize', 'pageMargins', 'pageOrientation', 'pageBreak', 'header', 'footer', 'columns', 'columnGap',
  'stack', 'table', 'body', 'widths', 'headerRows', 'layout', 'colSpan', 'rowSpan', 'fillColor', 'image', 'images',
  'width', 'height', 'fit', 'svg', 'qr', 'ul', 'ol', 'link', 'info'];

export function createEditor(parent, source, onChange, onRun, options = {}) {
  let language = options.language || "javascript";
  const languageSlot = new Compartment();
  const inspect = source => language === "typescript" ? [] : inspectSource(source, options.sourceType || 'script');
  const extensions = [basicSetup, syntaxHighlighting(HighlightStyle.define([{ tag: tags.keyword, color: 'var(--syntax-keyword, #ae273e)' }, { tag: tags.string, color: 'var(--syntax-string, #286341)' }, { tag: [tags.number, tags.bool], color: 'var(--syntax-number, #7440a8)' }])), languageSlot.of(javascript({ typescript: language === "typescript" })), lintGutter(), linter(view => inspect(view.state.doc.toString())), keymap.of([indentWithTab, { key: 'Mod-Enter', run: () => { onRun(); return true; } }]),
      EditorView.contentAttributes.of({ 'aria-label': 'Editable code example', spellcheck: 'false' }),
      javascript().language.data.of({ autocomplete: context => {
        const word = context.matchBefore(/[\w$]*/);
        if (!word || (!context.explicit && word.from === word.to)) return null;
        return { from: word.from, options: properties.map(label => ({ label, type: 'property', info: 'pdfmake document field — see reference for context and valid values' })) };
      } }),
      EditorView.updateListener.of(update => { if (update.docChanged) onChange(); }),
      EditorView.theme({ '&': { height: '100%', fontSize: '13px', color: 'var(--ink, #202124)', backgroundColor: 'var(--surface, white)' }, '.cm-gutters': { color: 'var(--muted, #606770)', backgroundColor: 'var(--wash, #f7f7f8)', borderRight: '1px solid var(--line, #ddd)' }, '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--wash, #f7f7f8)' }, '.cm-cursor': { borderLeftColor: 'var(--ink, #202124)' }, '.cm-selectionBackground': { backgroundColor: 'var(--selection, #f9cbd0) !important' }, '.cm-scroller': { overflow: 'auto', fontFamily: 'Consolas, monospace' }, '.cm-content': { padding: '18px 0' } })];
  const view = new EditorView({ parent, doc: source, extensions });
  return {
    getValue: () => view.state.doc.toString(),
    setValue: value => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } }),
    setLanguage: value => { language = value; view.dispatch({ effects: languageSlot.reconfigure(javascript({ typescript: value === 'typescript' })) }); },
    reportDiagnostics: diagnostics => view.dispatch(setDiagnostics(view.state, diagnostics)),
    resetValue: value => view.setState(EditorState.create({ doc: value, extensions })),
    focus: () => view.focus(), destroy: () => view.destroy(), undo: () => undo(view), redo: () => redo(view),
    canUndo: () => undoDepth(view.state) > 0, canRedo: () => redoDepth(view.state) > 0,
    serialize: () => ({ state: view.state.toJSON({ history: historyField }), scrollTop: view.scrollDOM.scrollTop }),
    restore: saved => {
      view.setState(EditorState.fromJSON(saved.state, { extensions }, { history: historyField }));
      view.scrollDOM.scrollTop = Number(saved.scrollTop) || 0;
    },
    diagnose: () => {
      const diagnostics = inspect(view.state.doc.toString());
      view.dispatch(setDiagnostics(view.state, diagnostics));
      return diagnostics;
    },
    goTo: position => {
      const anchor = Math.max(0, Math.min(view.state.doc.length, position));
      view.dispatch({ selection: { anchor }, effects: EditorView.scrollIntoView(anchor, { y: 'center' }) }); view.focus();
    }
  };
}

export function inspectSource(source, sourceType = 'script') {
  try { parse(source, { ecmaVersion: 'latest', sourceType, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }); return []; }
  catch (error) {
    const from = Math.max(0, Math.min(source.length, error.pos || 0));
    return [{ from, to: Math.min(source.length, from + 1), severity: 'error',
      message: `Line ${error.loc.line}, column ${error.loc.column + 1}: ${error.message}`, line: error.loc.line, column: error.loc.column + 1 }];
  }
}
