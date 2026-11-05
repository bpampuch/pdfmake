import { createEditor } from './editor.js';
import { typedExamples } from './typed-examples.js';
import { examples } from './examples.js';
import * as pdfjs from './vendor/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;

export function mountPlayground(root = document, options = {}) {
  const $ = id => root.querySelector('#' + id);
  let suspended = false;
  const events = new AbortController();
  const onWindow = (name, callback) => window.addEventListener(name, callback, { signal: events.signal });
  const docsBase = new URL('../', import.meta.url);
  const route = new URL(options.url || location.href);
  const docsHref = path => options.docLinks?.[path] || new URL(path, docsBase).href;
  const series = options.version || docsBase.pathname.match(/\/docs\/(\d+\.\d+)\//)?.[1] || '0.3';
  const storagePrefix = series === '0.3' ? 'pdfmake-playground' : `pdfmake-playground-${series}`;
  const workspaceKey = storagePrefix + '-workspace-v2';
  const documentsKey = storagePrefix + '-documents-v1';
  const draftKey = `pdfmake-playground-${series}-draft`;
  const explicitExample = route.searchParams.get('example');
  const embedded = route.searchParams.get('embed') === '1';
  if (embedded) document.documentElement.classList.add('embedded');
  let selected = examples.find(example => example.id === explicitExample) || examples[0];
  let editor, worker, timeout, liveTimer, saveTimer, pendingPreview, previewLoad, previewDocument, renderTask;
  let pdfUrl, renderedSource, pageNumber = 1, revision = 0, pageRevision = 0, dirty = false, loading = false, syntaxPosition;
  let persistWorkspace = true;
  let storageFailed = false;
  let documents = readStorage(documentsKey, []);
  if (!Array.isArray(documents)) documents = [];
  documents = documents.filter(doc => doc && typeof doc.id === 'string' && typeof doc.name === 'string' && typeof doc.source === 'string' && doc.source.length <= 500000).slice(0, 30);
  const cachedWorkspace = readStorage(workspaceKey, null);
  const saved = !explicitExample || cachedWorkspace?.example === explicitExample ? cachedWorkspace : null;
  let language = saved?.language === 'typescript' ? 'typescript' : 'javascript';
  let languageDrafts = {};
  for (const name of ['javascript', 'typescript']) {
    const draft = saved?.languageDrafts?.[name];
    if (typeof draft?.source === 'string' && draft.source.length <= 500000) languageDrafts[name] = draft;
  }
  const sourceFor = example => language === 'typescript' ? typedExamples[example.id] : example.source;
  function useLanguage(value) {
    language = value === 'typescript' ? 'typescript' : 'javascript';
    $('code-language').value = language; editor?.setLanguage(language);
  }
  function switchLanguage(value) {
    languageDrafts[language] = { source: editor.getValue(), editor: editor.serialize() };
    cancelPending(); loading = true; useLanguage(value);
    const draft = languageDrafts[language];
    try { if (draft?.editor?.state?.doc === draft?.source) editor.restore(draft.editor); else editor.resetValue(draft?.source ?? sourceFor(selected)); }
    catch { editor.resetValue(draft?.source ?? sourceFor(selected)); }
    editor.setLanguage(language); loading = false; changed();
  }

  function readStorage(key, fallback) { if (embedded) return fallback; try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function status(message, error = false) { $('status').textContent = message; $('status').dataset.error = String(error); }
  function historyButtons() { $('undo').disabled = !editor.canUndo(); $('redo').disabled = !editor.canRedo(); }
  function saveWorkspace() {
    if (!editor || embedded || !persistWorkspace) return;
    try {
      localStorage.setItem(workspaceKey, JSON.stringify({ version: 2, example: selected.id, editor: editor.serialize(),
        source: editor.getValue(), language, languageDrafts, autoRun: $('auto-run').checked, zoom: $('zoom').value, page: pageNumber, name: $('document-name').value }));
      storageFailed = false;
      $('draft-state').textContent = 'Workspace saved automatically';
    } catch { storageFailed = true; $('draft-state').textContent = 'Storage unavailable or full — export code to keep it'; }
  }
  function stop(message) {
    worker?.terminate(); worker = undefined;
    clearTimeout(timeout); $('run').disabled = false; $('cancel').hidden = true;
    if (message) status(message);
  }
  function cancelPending() {
    revision++; stop(); clearTimeout(liveTimer);
    pendingPreview?.destroy(); pendingPreview = undefined;
  }
  function markStale() {
    $('download').disabled = renderedSource !== editor.getValue();
    $('preview').dataset.stale = String(renderedSource !== editor.getValue());
    $('open-pdf').hidden = renderedSource !== editor.getValue();
  }
  function schedule() {
    clearTimeout(liveTimer);
    if (!suspended && $('auto-run').checked) liveTimer = setTimeout(() => run(), 650);
  }
  function changed() {
    if (!editor || loading) return;
    persistWorkspace = true;
    dirty = true; cancelPending(); markStale(); historyButtons();
    $('metrics').textContent = pdfUrl ? 'Previous successful render · updating…' : 'Run to update preview';
    status($('auto-run').checked ? 'Waiting for typing to pause…' : 'Code changed. Select Run to update the PDF.');
    clearTimeout(saveTimer); saveTimer = setTimeout(saveWorkspace, 200);
    schedule();
  }
  function showError(message, details = {}) {
    syntaxPosition = details.position;
    const context = [details.phase && `Phase: ${details.phase}`, details.code && `Code: ${details.code}`, details.path && `Document path: ${details.path}`].filter(Boolean);
    $('error').textContent = [message, ...context].join('\n'); $('error').hidden = false;
    $('go-error').hidden = syntaxPosition === undefined;
    $('metrics').textContent = pdfUrl ? 'Previous successful render · current code has errors' : 'No generated PDF';
    status(pdfUrl ? 'Could not update the PDF. The previous successful preview is kept.' : 'Could not generate the PDF. See the error below.', true);
    markStale();
  }
  async function stagePage(doc, number, current) {
    const page = await doc.getPage(number);
    const width = $('preview-panel')?.clientWidth || $('preview').clientWidth || $('preview-empty').clientWidth;
    const scale = $('zoom').value === 'fit' ? Math.max(0.2, (width - 36) / page.getViewport({ scale: 1 }).width) : Number($('zoom').value);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas'); canvas.id = 'pdf-canvas'; canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `PDF preview page ${number} of ${doc.numPages}`);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * ratio); canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = viewport.width + 'px'; canvas.style.height = viewport.height + 'px';
    const task = page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
    renderTask = task;
    await task.promise;
    const text = await page.getTextContent();
    if (!current()) return null;
    return { canvas, text: text.items.map(item => item.str).join(' ') };
  }
  function commitPage(page, doc) {
    $('pdf-canvas').replaceWith(page.canvas);
    $('page-text').textContent = page.text;
    $('page-count').textContent = `${pageNumber} / ${doc.numPages}`;
    $('previous-page').disabled = pageNumber <= 1; $('next-page').disabled = pageNumber >= doc.numPages;
    $('preview').hidden = false; $('preview-empty').hidden = true;
  }
  async function renderPage() {
    if (!previewDocument) return;
    const doc = previewDocument, current = ++pageRevision;
    renderTask?.cancel();
    try {
      const page = await stagePage(doc, pageNumber, () => current === pageRevision && doc === previewDocument);
      if (page) commitPage(page, doc);
    } catch (error) { if (error.name !== 'RenderingCancelledException') showError('Preview: ' + error.message); }
  }
  async function acceptResult(data, source, current) {
    const blob = new Blob([data.buffer], { type: 'application/pdf' });
    const task = pdfjs.getDocument({ data: new Uint8Array(data.buffer), password: data.password }); pendingPreview = task;
    try {
      const doc = await task.promise;
      const number = Math.min(pageNumber, doc.numPages);
      const page = await stagePage(doc, number, () => current === revision);
      if (!page || current !== revision) { await task.destroy(); return; }
      const old = previewLoad, oldUrl = pdfUrl;
      previewDocument = doc; previewLoad = task; pendingPreview = undefined; pageNumber = number;
      pdfUrl = URL.createObjectURL(blob); renderedSource = source;
      commitPage(page, doc); markStale();
      $('open-pdf').href = pdfUrl; $('metrics').textContent = `${Math.round(data.elapsed)} ms · ${(blob.size / 1024).toFixed(1)} KB`;
      $('error').hidden = true; $('go-error').hidden = true;
      status('PDF ready. Preview, open or download your document.');
      old?.destroy(); if (oldUrl) URL.revokeObjectURL(oldUrl);
      saveWorkspace();
    } catch (error) {
      if (current === revision) showError('Preview: ' + error.message, { phase: 'preview' });
      if (task !== previewLoad) await task.destroy();
    }
  }
  function run() {
    if (suspended) return;
    cancelPending(); const current = revision;
    $('error').hidden = true; $('go-error').hidden = true;
    const source = editor.getValue();
    if (source.length > 500000) return showError('Definition exceeds the 500 KB limit.');
    const [syntax] = editor.diagnose();
    if (syntax) return showError('Syntax error: ' + syntax.message, { phase: 'JavaScript parsing', code: 'JAVASCRIPT_SYNTAX_ERROR', position: syntax.from });
    $('run').disabled = true; $('cancel').hidden = false; status('Rendering in a local worker…');
    const active = worker = new Worker(new URL('./worker.js', import.meta.url));
    worker.onmessage = async ({ data }) => {
      if (worker !== active || current !== revision) return;
      stop();
      if (data.diagnostics) editor.reportDiagnostics(data.diagnostics);
      if (data.error) { showError(data.error, { ...data, position: data.position ?? data.diagnostics?.[0]?.from }); return; }
      await acceptResult(data, source, current);
    };
    worker.onerror = event => { if (worker !== active) return; stop(); showError(event.message || 'PDF worker could not start.', { phase: 'worker' }); };
    timeout = setTimeout(() => { if (current !== revision) return; stop(); showError('Rendering stopped after 10 seconds. Check for an infinite loop or reduce the document size.', { phase: 'render', code: 'RENDER_TIMEOUT' }); }, 10000);
    worker.postMessage({ source, language }); saveWorkspace();
  }
  function load(example) {
    cancelPending(); selected = example; languageDrafts = {}; loading = true; editor.resetValue(sourceFor(example)); editor.setLanguage(language); loading = false;
    dirty = false; historyButtons(); markStale(); $('error').hidden = true; $('go-error').hidden = true;
    $('example-docs').href = docsHref(example.docs); $('saved-documents').value = ''; $('document-name').value = '';
    const url = new URL(location.href); url.searchParams.set('example', example.id); history.replaceState(history.state, '', url);
    saveWorkspace(); if ($('auto-run').checked) run(); else status('Example loaded. Select Run.');
  }
  function download(url, name) { const link = document.createElement('a'); link.href = url; link.download = name; link.click(); }
  function draftButtons() { try { $('restore-draft').disabled = $('clear-draft').disabled = localStorage.getItem(draftKey) === null; } catch {} }
  function documentOptions() {
    const select = $('saved-documents'); select.replaceChildren(new Option('Choose a saved document…', ''));
    for (const doc of documents) select.append(new Option(doc.name, doc.id));
    $('delete-document').disabled = true;
  }
  for (const example of examples) $('example').append(new Option(example.title, example.id));
  if (saved?.version === 2 && typeof saved.source === 'string' && saved.source.length <= 500000) {
    selected = examples.find(example => example.id === saved.example) || selected;
  }
  editor = createEditor($('editor'), sourceFor(selected), changed, run, { language });
  useLanguage(language);
  $('code-language').addEventListener('change', () => switchLanguage($('code-language').value));
  $('example').value = selected.id; $('example-docs').href = docsHref(selected.docs);
  if (saved?.version === 2 && typeof saved.source === 'string' && saved.source.length <= 500000) {
    loading = true;
    try { if (saved.editor?.state?.doc === saved.source) editor.restore(saved.editor); else editor.setValue(saved.source); }
    catch { editor.setValue(saved.source); }
    editor.setLanguage(language);
    loading = false;
    $('auto-run').checked = saved.autoRun !== false;
    if (['fit', '1', '1.5', '2'].includes(saved.zoom)) $('zoom').value = saved.zoom;
    pageNumber = Number.isSafeInteger(saved.page) && saved.page > 0 ? saved.page : 1;
    $('document-name').value = typeof saved.name === 'string' ? saved.name.slice(0, 80) : '';
    status('Last workspace and undo history restored.');
  }
  $('example').addEventListener('change', () => {
    if (dirty && !confirm('Replace current edits with this example? Your workspace is autosaved; save a named document to keep a separate copy.')) { $('example').value = selected.id; return; }
    load(examples.find(example => example.id === $('example').value));
  });
  $('undo').addEventListener('click', () => { editor.undo(); historyButtons(); });
  $('redo').addEventListener('click', () => { editor.redo(); historyButtons(); });
  $('reset').addEventListener('click', () => { if (!dirty || confirm('Reset this example and replace current edits?')) load(selected); });
  $('auto-run').addEventListener('change', () => { saveWorkspace(); if ($('auto-run').checked) run(); else clearTimeout(liveTimer); });
  $('run').addEventListener('click', run);
  $('cancel').addEventListener('click', () => { cancelPending(); status('Rendering cancelled. Your code and previous preview are kept.'); });
  $('go-error').addEventListener('click', () => editor.goTo(syntaxPosition));
  for (const [id, change] of [['previous-page', -1], ['next-page', 1]]) $(id).addEventListener('click', () => {
    if (!previewDocument) return; pageNumber = Math.max(1, Math.min(previewDocument.numPages, pageNumber + change)); renderPage(); saveWorkspace();
  });
  $('zoom').addEventListener('change', () => { renderPage(); saveWorkspace(); });
  $('download').addEventListener('click', () => { if (pdfUrl && renderedSource === editor.getValue()) download(pdfUrl, ($('document-name').value.trim() || selected.id) + '.pdf'); });
  $('export').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([editor.getValue()], { type: 'text/javascript' })); download(url, ($('document-name').value.trim() || selected.id) + (language === 'typescript' ? '.ts' : '.js')); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  $('import').addEventListener('change', async event => {
    const [file] = event.target.files; event.target.value = ''; if (!file) return;
    if (file.size > 500000) return showError('Import is limited to 500 KB.');
    if (dirty && !confirm('Replace current edits with this file?')) return;
    try { useLanguage(/\.ts$/i.test(file.name) ? 'typescript' : 'javascript'); languageDrafts = {}; editor.setValue(await file.text()); $('document-name').value = file.name.replace(/\.(js|ts|txt)$/i, '').slice(0, 80); saveWorkspace(); status($('auto-run').checked ? 'Imported and autosaved. Updating preview…' : 'Imported and autosaved. Select Run to update the PDF.'); }
    catch { showError('Could not read that file.'); }
  });
  $('save-document').addEventListener('click', () => {
    const name = $('document-name').value.trim(); if (!name) { $('document-name').focus(); return status('Give this local document a name.', true); }
    const existing = documents.find(doc => doc.id === $('saved-documents').value);
    const doc = { id: existing?.name === name ? existing.id : crypto.randomUUID(), name, source: editor.getValue(), editor: editor.serialize(), example: selected.id, language };
    const next = [...documents.filter(item => item.id !== doc.id), doc].slice(-30);
    try { localStorage.setItem(documentsKey, JSON.stringify(next)); documents = next; documentOptions(); $('saved-documents').value = doc.id; $('delete-document').disabled = false; dirty = false; saveWorkspace(); status('Document saved locally, including undo history.'); }
    catch { status('Could not save: browser storage is unavailable or full. Export the code instead.', true); }
  });
  $('saved-documents').addEventListener('change', () => {
    const doc = documents.find(item => item.id === $('saved-documents').value); $('delete-document').disabled = !doc; if (!doc) return;
    if (dirty && !confirm('Replace current edits with this saved document? Save them as a named document first to keep a separate copy.')) { $('saved-documents').value = ''; $('delete-document').disabled = true; return; }
    cancelPending(); loading = true; languageDrafts = {}; useLanguage(doc.language);
    try { if (doc.editor?.state?.doc === doc.source) editor.restore(doc.editor); else editor.setValue(doc.source); } catch { editor.setValue(doc.source); }
    editor.setLanguage(language); loading = false; selected = examples.find(example => example.id === doc.example) || selected; $('example').value = selected.id;
    $('example-docs').href = docsHref(selected.docs);
    const url = new URL(location.href); url.searchParams.set('example', selected.id); history.replaceState(history.state, '', url);
    $('document-name').value = doc.name; dirty = false; historyButtons(); markStale(); saveWorkspace(); if ($('auto-run').checked) run(); else status('Local document restored. Select Run to update the PDF.');
  });
  $('delete-document').addEventListener('click', () => {
    const id = $('saved-documents').value; if (!id || !confirm('Delete this saved document? The current editor contents will stay.')) return;
    const next = documents.filter(doc => doc.id !== id);
    try { localStorage.setItem(documentsKey, JSON.stringify(next)); documents = next; documentOptions(); status('Saved document deleted. Current editor contents are kept.'); } catch { status('Could not update browser storage.', true); }
  });
  $('save-draft').addEventListener('click', () => { try { localStorage.setItem(draftKey, JSON.stringify({ source: editor.getValue(), language })); draftButtons(); status('Quick draft saved locally.'); } catch { status('Storage is full or unavailable. Export code instead.', true); } });
  $('restore-draft').addEventListener('click', () => { try { const source = localStorage.getItem(draftKey); if (source !== null) { let draft; try { draft = JSON.parse(source); } catch {} useLanguage(draft?.language); editor.setValue(typeof draft?.source === 'string' ? draft.source : source); saveWorkspace(); if ($('auto-run').checked) schedule(); else status('Quick draft restored. Select Run to update the PDF.'); } } catch { status('Browser storage unavailable.', true); } });
  $('clear-draft').addEventListener('click', () => { try { localStorage.removeItem(draftKey); draftButtons(); status('Quick draft cleared. Workspace autosave remains available.'); } catch {} });
  $('clear-workspace').addEventListener('click', () => {
    try { clearTimeout(saveTimer); localStorage.removeItem(workspaceKey); persistWorkspace = false; $('draft-state').textContent = 'Autosave cleared · typing resumes autosave'; status('Saved workspace cleared. Current code and named documents are kept.'); }
    catch { status('Could not clear browser storage.', true); }
  });
  $('document-name').addEventListener('input', () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveWorkspace, 200); });
  onWindow('pagehide', event => {
    saveWorkspace(); cancelPending();
    if (!event.persisted) { previewLoad?.destroy(); if (pdfUrl) URL.revokeObjectURL(pdfUrl); }
  });
  onWindow('pageshow', event => {
    if (event.persisted) { markStale(); if (renderedSource !== editor.getValue()) schedule(); }
  });
  onWindow('beforeunload', event => { if (storageFailed && dirty) { event.preventDefault(); event.returnValue = ''; } });
  let previewResize;
  onWindow('resize', () => { clearTimeout(previewResize); if (!suspended) previewResize = setTimeout(() => { if ($('zoom').value === 'fit') renderPage(); }, 150); });
  documentOptions(); draftButtons(); historyButtons();
  fetch(new URL('./vendor/version.json', import.meta.url)).then(response => response.json()).then(data => { $('version').textContent = 'v' + data.version; }).catch(() => {});
  if ($('auto-run').checked) run(); else status('Live preview is off. Select Run to update the PDF.');

  return {
    suspend() { suspended = true; saveWorkspace(); clearTimeout(saveTimer); clearTimeout(previewResize); cancelPending(); pageRevision++; renderTask?.cancel(); },
    resume(url) {
      suspended = false;
      const id = new URL(url).searchParams.get('example');
      const example = examples.find(item => item.id === id);
      if (example && example.id !== selected.id && (!dirty || confirm('Replace current edits with this example? Save a named document to keep a separate copy.'))) load(example);
      else { markStale(); if (renderedSource !== editor.getValue()) schedule(); else renderPage(); }
    },
    destroy() { this.suspend(); events.abort(); editor.destroy(); previewLoad?.destroy(); if (pdfUrl) URL.revokeObjectURL(pdfUrl); }
  };
}
