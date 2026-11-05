/* Loaded only for TypeScript examples, inside the cancellable render worker. */
importScripts('./vendor/typescript.js', './vendor/typescript-types.js');
function compileTypeScript(source, syntaxOnly = false) {
  const file = '/example.ts';
  const files = { ...pdfmakeTypeFiles, [file]: source };
  const options = { strict: true, skipLibCheck: true, noEmit: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, esModuleInterop: true, types: [] };
  const host = {
    getSourceFile: (name, language) => files[name] === undefined ? undefined : ts.createSourceFile(name, files[name], language, true),
    getDefaultLibFileName: () => '/node_modules/typescript/lib/lib.es2022.full.d.ts',
    writeFile() {}, getCurrentDirectory: () => '/', getDirectories: () => [],
    fileExists: name => files[name] !== undefined, readFile: name => files[name],
    directoryExists: directory => Object.keys(files).some(name => name.startsWith(directory.replace(/\/$/, '') + '/')),
    getCanonicalFileName: name => name, useCaseSensitiveFileNames: () => true, getNewLine: () => '\n'
  };
  const program = ts.createProgram([file], options, host);
  const diagnostics = (syntaxOnly ? program.getSyntacticDiagnostics() : ts.getPreEmitDiagnostics(program)).filter(item => item.file?.fileName === file).map(item => {
    const location = item.file.getLineAndCharacterOfPosition(item.start || 0);
    return { from: item.start || 0, to: (item.start || 0) + Math.max(1, item.length || 1), severity: 'error',
      message: `TS${item.code}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`, line: location.line + 1, column: location.character + 1 };
  });
  const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/^export \{\};?\s*$/gm, '');
  return { diagnostics, javascript };
}
