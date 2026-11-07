/* Each render gets its own worker: no shared document or configuration state. */
importScripts('./vendor/pdfmake.min.js', './vendor/vfs_fonts.js');
pdfMake.setUrlAccessPolicy(() => false);
self.onmessage = async ({ data }) => {
  let phase = 'definition execution';
  try {
    const started = performance.now();
    let source = data.source;
    if (data.language === 'typescript') {
      phase = 'TypeScript';
      importScripts('./typescript-check.js');
      const result = compileTypeScript(source, data.syntaxOnly);
      if (result.diagnostics.length) { self.postMessage({ diagnostics: result.diagnostics, error: result.diagnostics.map(item => `Line ${item.line}, column ${item.column}: ${item.message}`).join('\n'), phase, code: 'TYPESCRIPT_ERROR' }); return; }
      source = result.javascript.replace(/^import (\w+) from ["']pdfmake\/build\/pdfmake(?:\.js)?["'];?$/gm, 'const $1 = self.pdfMake;');
    }
    if (data.checkOnly) { self.postMessage({ checked: true }); return; }
    phase = 'definition execution';
    const dd = new Function('"use strict";\n' + source + '\n;return typeof dd !== "undefined" ? dd : typeof docDefinition !== "undefined" ? docDefinition : undefined;\n//# sourceURL=pdfmake-definition.js')();
    if (!dd || typeof dd !== 'object' || Array.isArray(dd)) throw new Error('Define a document object in a variable named dd.');
    if (typeof pdfMake.validateDocument === 'function') {
      phase = 'validation';
      const result = pdfMake.validateDocument(dd);
      if (!result.valid) {
        self.postMessage({ error: result.errors.map(item => `${item.path}: ${item.message}`).join('\n'), code: 'PDFMAKE_VALIDATION_ERROR', phase, documentDiagnostics: result.errors });
        return;
      }
    }
    phase = 'render';
    const bytes = await pdfMake.createPdf(dd).getBuffer();
    // Copy only the used range before transferring; pooled Buffer backing stores may be larger.
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    self.postMessage({ buffer, elapsed: performance.now() - started, password: dd.userPassword || undefined }, [buffer]);
  } catch (error) {
    const match = data.language === 'typescript' ? undefined : error.stack?.match(/pdfmake-definition\.js:(\d+):(\d+)/);
    const line = match ? Math.max(1, Number(match[1]) - 3) : undefined;
    const column = match ? Number(match[2]) : undefined;
    const position = match ? data.source.split('\n').slice(0, line - 1).reduce((total, text) => total + text.length + 1, 0) + column - 1 : undefined;
    self.postMessage({ error: `${error.name || 'Error'}${line ? ` at line ${line}, column ${column}` : ''}: ${error.message || String(error)}`, stack: error.stack || '', code: error.code || (phase === 'render' ? 'PDFMAKE_RENDER_ERROR' : 'JAVASCRIPT_RUNTIME_ERROR'), path: error.path, phase: error.phase || phase, position });
  }
};
