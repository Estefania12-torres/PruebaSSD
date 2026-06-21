/* =======================================================
   AI SQL Dashboard — app.js
   Design System: Syntactic Dark (Stitch)
   Security: Anti-SQLi validators, safe DOM rendering
   ======================================================= */

const STORAGE_KEY = 'db_connection_string';
const API_URL = 'http://localhost:3000/api/v1/ask';
const MAX_QUERY_LENGTH = 2000;

// SQL keywords to detect direct SQL input (warn user)
const SQL_DIRECT_KEYWORDS = /\b(DROP|DELETE|TRUNCATE|INSERT|UPDATE|EXEC|EXECUTE|xp_|sp_|ALTER|CREATE)\b/i;
// Allowed connection string protocols
const VALID_DSN_REGEX = /^(postgresql|postgres|mysql|mssql|sqlserver|sqlite):\/\/.{3,}/i;
// Dangerous characters / sequences to block in connection string
const DANGEROUS_PATTERNS = /<script|javascript:|data:/i;

/* ===== HELPERS ===== */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(text ?? '')));
  return div.innerHTML;
}

function maskConnectionString(raw) {
  try {
    const url = new URL(raw);
    const masked = `${url.protocol}//***:***@${url.hostname}${url.port ? ':' + url.port : ''}${url.pathname}`;
    return masked;
  } catch {
    // fallback masking for formats new URL can't parse (e.g. sqlite)
    return raw.replace(/:([^:@/]+)@/, ':***@').replace(/\/\/([^:@/]+)[:@]/, '//***:');
  }
}

function highlightSql(sql) {
  const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON',
    'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'AND', 'OR', 'NOT', 'IN',
    'IS', 'NULL', 'LIKE', 'BETWEEN', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'INDEX',
    'WITH', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'ALL', 'EXISTS', 'COALESCE',
    'CAST', 'CONVERT', 'OVER', 'PARTITION'];
  
  let escaped = escapeHtml(sql);
  
  // Highlight keywords
  keywords.forEach(kw => {
    const re = new RegExp(`\\b(${kw})\\b`, 'gi');
    escaped = escaped.replace(re, '<span class="sql-keyword">$1</span>');
  });

  // Highlight numbers
  escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-number">$1</span>');

  // Highlight strings
  escaped = escaped.replace(/'([^']*)'/g, "<span class=\"sql-string\">'$1'</span>");

  // Highlight inline comments
  escaped = escaped.replace(/(--[^\n]*)/g, '<span class="sql-comment">$1</span>');

  return escaped;
}

/** Render lightweight markdown → safe HTML (tables, bold, line breaks) */
function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Markdown tables: lines starting/ending with |
  const tableRegex = /((?:\|[^\n]+\|\n?)+)/g;
  html = html.replace(tableRegex, (block) => {
    const lines = block.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return block;
    let out = '<div class="overflow-x-auto my-3"><table class="w-full text-sm border-collapse">';
    let headerDone = false;
    lines.forEach((line) => {
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) return; // skip separator
      const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
      if (!headerDone) {
        out += '<thead class="bg-[#272a2c]"><tr>' + cells.map(c => `<th class="px-3 py-2 text-left text-xs font-semibold text-[#c7c4d8] uppercase tracking-wider border border-[#323537]">${c.trim()}</th>`).join('') + '</tr></thead><tbody>';
        headerDone = true;
      } else {
        out += '<tr class="border-t border-[#272a2c] hover:bg-indigo-600/5">' + cells.map(c => `<td class="px-3 py-2 text-[#e0e3e5] border border-[#272a2c]">${c.trim()}</td>`).join('') + '</tr>';
      }
    });
    out += '</tbody></table></div>';
    return out;
  });

  // Bold **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  // Line breaks
  html = html.replace(/\n/g, '<br />');
  return html;
}

/* ===== VALIDATORS ===== */
function validateConnectionString(value) {
  if (!value || value.trim().length < 10) {
    return 'La cadena de conexión debe tener al menos 10 caracteres.';
  }
  if (DANGEROUS_PATTERNS.test(value)) {
    return 'La cadena contiene secuencias no permitidas.';
  }
  // Check for control characters
  if (/[\x00-\x08\x0B\x0E-\x1F]/.test(value)) {
    return 'La cadena contiene caracteres de control no permitidos.';
  }
  if (!VALID_DSN_REGEX.test(value.trim())) {
    return 'Formato inválido. Usa: postgresql:// mysql:// mssql:// sqlite://';
  }
  return null; // valid
}

function validateQuery(value) {
  if (!value || value.trim().length === 0) {
    return 'Por favor, ingresa una consulta en lenguaje natural.';
  }
  if (value.length > MAX_QUERY_LENGTH) {
    return `La consulta no puede superar ${MAX_QUERY_LENGTH} caracteres.`;
  }
  return null; // valid
}

/* ===== DOM REFS ===== */
const connectionModal = document.getElementById('connectionModal');
const deleteModal = document.getElementById('deleteModal');
const app = document.getElementById('app');

const connInput = document.getElementById('connection-string-input');
const connError = document.getElementById('conn-error');
const connErrorText = document.getElementById('conn-error-text');
const saveConnBtn = document.getElementById('save-connection-btn');
const connDisplay = document.getElementById('conn-display');
const editConnBtn = document.getElementById('edit-conn-btn');
const deleteConnBtn = document.getElementById('delete-conn-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

const queryInput = document.getElementById('query-input');
const charCounter = document.getElementById('char-counter');
const sqlWarning = document.getElementById('sql-warning');
const submitQueryBtn = document.getElementById('submit-query-btn');
const btnLabel = document.getElementById('btn-label');
const loadingSpinner = document.getElementById('loading-spinner');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const resultsPanel = document.getElementById('results-panel');
const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');

const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const rowCount = document.getElementById('row-count');
const sqlCodeBlock = document.getElementById('sql-code-block');
const copySqlBtn = document.getElementById('copy-sql-btn');

/* ===== CONNECTION MANAGER ===== */
function showConnError(msg) {
  connErrorText.textContent = msg;
  connError.classList.remove('hidden');
  connInput.classList.add('border-red-500/60', 'ring-1', 'ring-red-500/40');
}

function clearConnError() {
  connError.classList.add('hidden');
  connInput.classList.remove('border-red-500/60', 'ring-1', 'ring-red-500/40');
}

function openConnectionModal(prefill = '') {
  connInput.value = prefill;
  clearConnError();
  connectionModal.classList.remove('hidden');
}

function closeConnectionModal() {
  connectionModal.classList.add('hidden');
}

function updateConnDisplay() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    connDisplay.textContent = maskConnectionString(raw);
  }
}

function showApp() {
  updateConnDisplay();
  connectionModal.classList.add('hidden');
  app.classList.remove('hidden');
}

function showOnboarding() {
  app.classList.add('hidden');
  openConnectionModal();
}

// Save connection
saveConnBtn.addEventListener('click', () => {
  const value = connInput.value.trim();
  const err = validateConnectionString(value);
  if (err) {
    showConnError(err);
    return;
  }
  clearConnError();
  localStorage.setItem(STORAGE_KEY, value);
  showApp();
});

// Allow Enter key in input
connInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveConnBtn.click();
  clearConnError();
});

// Edit connection
editConnBtn.addEventListener('click', () => {
  // Pre-fill with raw value for editing
  openConnectionModal(localStorage.getItem(STORAGE_KEY) || '');
});

// Delete connection
deleteConnBtn.addEventListener('click', () => {
  deleteModal.classList.remove('hidden');
});

cancelDeleteBtn.addEventListener('click', () => {
  deleteModal.classList.add('hidden');
});

confirmDeleteBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  deleteModal.classList.add('hidden');
  // Reset results state
  resultsPanel.classList.add('hidden');
  emptyState.classList.remove('hidden');
  queryInput.value = '';
  charCounter.textContent = '0 / 2000';
  showOnboarding();
});

/* ===== QUERY INPUT LIVE VALIDATION ===== */
queryInput.addEventListener('input', () => {
  const len = queryInput.value.length;
  charCounter.textContent = `${len} / ${MAX_QUERY_LENGTH}`;
  charCounter.classList.toggle('text-amber-400', len > MAX_QUERY_LENGTH * 0.9);
  charCounter.classList.toggle('text-red-400', len >= MAX_QUERY_LENGTH);

  if (SQL_DIRECT_KEYWORDS.test(queryInput.value)) {
    sqlWarning.classList.remove('hidden');
    sqlWarning.classList.add('flex');
  } else {
    sqlWarning.classList.add('hidden');
    sqlWarning.classList.remove('flex');
  }
});

/* ===== ERROR BANNER ===== */
function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.remove('hidden');
  setTimeout(() => errorBanner.classList.add('hidden'), 6000);
}

function hideError() {
  errorBanner.classList.add('hidden');
}

/* ===== RENDER TABLE ===== */
function renderTable(data) {
  tableHeader.innerHTML = '';
  tableBody.innerHTML = '';

  if (!data || data.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '100');
    td.className = 'px-5 py-8 text-center text-sm text-[#918fa1]';
    td.textContent = 'No se encontraron resultados.';
    tr.appendChild(td);
    tableBody.appendChild(tr);
    rowCount.textContent = '0 filas';
    return;
  }

  const keys = Object.keys(data[0]);
  keys.forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    tableHeader.appendChild(th);
  });

  data.forEach(row => {
    const tr = document.createElement('tr');
    keys.forEach(key => {
      const td = document.createElement('td');
      td.textContent = row[key] === null || row[key] === undefined ? 'NULL' : row[key];
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });

  rowCount.textContent = `${data.length} fila${data.length !== 1 ? 's' : ''}`;
}

/* ===== COPY SQL ===== */
copySqlBtn.addEventListener('click', async () => {
  const raw = sqlCodeBlock.getAttribute('data-raw-sql') || '';
  try {
    await navigator.clipboard.writeText(raw);
    copySqlBtn.classList.add('copied-feedback');
    setTimeout(() => copySqlBtn.classList.remove('copied-feedback'), 2000);
  } catch {
    // fallback
  }
});

/* ===== HANDLE QUERY ===== */
async function handleQuery() {
  const query = queryInput.value.trim();
  const connectionString = localStorage.getItem(STORAGE_KEY);

  const queryErr = validateQuery(query);
  if (queryErr) { showError(queryErr); return; }

  if (!connectionString) {
    showOnboarding();
    return;
  }

  hideError();
  submitQueryBtn.disabled = true;
  btnLabel.textContent = 'Ejecutando...';
  loadingSpinner.classList.remove('hidden');
  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');
  resultsPanel.classList.add('hidden');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: query,
        connection_string: connectionString
      })
    });

    if (!response.ok) {
      let errData = {};
      try { errData = await response.json(); } catch {}
      throw new Error(errData.errorDescription || errData.error || `Error del servidor: ${response.status}`);
    }

    const result = await response.json();

    // Backend wraps: { status: 'cod_ok', data: { status, data: { answer, raw_data }, message } }
    const isOk = result.status === 'cod_ok' || result.success === true;
    if (isOk && result.data !== undefined) {
      // Drill into nested data until we find the actual payload
      const inner = result.data?.data ?? result.data;
      const rows   = inner?.raw_data  ?? inner?.results ?? inner?.data ?? [];
      const answer = inner?.answer    ?? inner?.sqlQuery ?? inner?.sql_query ?? inner?.generatedSql ?? 'No se generó respuesta.';

      renderTable(Array.isArray(rows) ? rows : []);
      sqlCodeBlock.setAttribute('data-raw-sql', answer);
      // If pure SQL → syntax-highlight; if markdown/natural language → render markdown
      const looksLikeSql = /^\s*(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE)/i.test(answer.trim());
      if (looksLikeSql) {
        sqlCodeBlock.innerHTML = highlightSql(answer);
      } else {
        // Safe: renderMarkdown escapes HTML before processing markdown
        sqlCodeBlock.innerHTML = renderMarkdown(answer);
      }

      loadingState.classList.add('hidden');
      resultsPanel.classList.remove('hidden');
      resultsPanel.classList.add('results-appear');
    } else {
      const errMsg = result.message || result.errorDescription || 'La respuesta del servidor no contiene los datos esperados.';
      throw new Error(errMsg);
    }

  } catch (error) {
    showError(error.message);
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } finally {
    submitQueryBtn.disabled = false;
    btnLabel.textContent = 'Ejecutar Consulta';
    loadingSpinner.classList.add('hidden');
  }
}

submitQueryBtn.addEventListener('click', handleQuery);
queryInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') handleQuery();
});

/* ===== INIT ===== */
(function init() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && validateConnectionString(stored) === null) {
    showApp();
  } else {
    showOnboarding();
  }
})();
