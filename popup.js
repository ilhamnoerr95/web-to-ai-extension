// =============================================
// popup.js — Web to AI Extension
// =============================================

// ══════════════════════════════════════════════
// PROVIDER PRESETS
// ══════════════════════════════════════════════
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    docs: 'https://platform.openai.com/docs',
    keyPlaceholder: 'sk-...',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    authHeader: 'Bearer'
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    chatPath: '/messages',
    modelsPath: null,
    docs: 'https://docs.anthropic.com',
    keyPlaceholder: 'sk-ant-...',
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-3-5', 'claude-3-opus-20240229'],
    authHeader: 'x-api-key',
    extraHeaders: { 'anthropic-version': '2023-06-01' },
    format: 'anthropic'
  },
  google: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    chatPath: '/models/{model}:generateContent',
    modelsPath: '/models',
    docs: 'https://ai.google.dev/docs',
    keyPlaceholder: 'AIza...',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
    authHeader: 'key',
    format: 'google'
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    docs: 'https://console.groq.com/docs',
    keyPlaceholder: 'gsk_...',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    authHeader: 'Bearer'
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    docs: 'https://openrouter.ai/docs',
    keyPlaceholder: 'sk-or-...',
    models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5', 'meta-llama/llama-3.1-70b-instruct'],
    authHeader: 'Bearer'
  },
  ollama: {
    name: 'Ollama (lokal)',
    baseUrl: 'http://localhost:11434/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    docs: 'https://ollama.com/library',
    keyPlaceholder: 'ollama (kosongkan)',
    models: ['llama3.2', 'mistral', 'codellama', 'phi3', 'gemma2'],
    authHeader: 'Bearer'
  },
  custom: {
    name: 'Custom Endpoint',
    baseUrl: '',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    docs: '',
    keyPlaceholder: 'API Key...',
    models: [],
    authHeader: 'Bearer'
  }
};

// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
const AI_URLS = {
  chatgpt: 'https://chatgpt.com',
  claude:  'https://claude.ai',
  gemini:  'https://gemini.google.com'
};

let selectedAI         = 'chatgpt';
let selectedPromptMode = 'clone';
let selectedProvider   = 'openai';
let lastPrompt         = '';
let lastStyleData      = null;
let savedProviders     = [];   // [{id, name, baseUrl, apiKey, model, authHeader}]
let activeProviderId   = null; // ID dari savedProviders yang aktif (null = pakai field langsung)

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  const saved = await chrome.storage.local.get([
    'selectedAI', 'promptMode', 'selectedProvider',
    'baseUrl', 'apiKey', 'model', 'modelCustom', 'systemPrompt', 'maxTokens',
    'savedProviders', 'activeProviderId'
  ]);

  if (saved.selectedAI)    { selectedAI = saved.selectedAI; setAIPill(selectedAI); }
  if (saved.promptMode)    { selectedPromptMode = saved.promptMode; setModeCard(selectedPromptMode); }
  if (saved.savedProviders) savedProviders = saved.savedProviders;
  if (saved.activeProviderId) activeProviderId = saved.activeProviderId;

  // Muat provider terakhir
  const prov = saved.selectedProvider || 'openai';
  selectedProvider = prov;
  applyProvider(prov, {
    baseUrl: saved.baseUrl,
    apiKey:  saved.apiKey,
    model:   saved.model,
    modelCustom: saved.modelCustom
  });
  setProviderPill(prov);

  if (saved.systemPrompt) document.getElementById('systemPrompt').value = saved.systemPrompt;
  if (saved.maxTokens)    document.getElementById('maxTokens').value    = saved.maxTokens;

  renderSavedProviders();
});

// ══════════════════════════════════════════════
// PANEL TABS
// ══════════════════════════════════════════════
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ══════════════════════════════════════════════
// PROMPT MODE CARDS
// ══════════════════════════════════════════════
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    selectedPromptMode = card.dataset.mode;
    setModeCard(selectedPromptMode);
    chrome.storage.local.set({ promptMode: selectedPromptMode });
  });
});
function setModeCard(mode) {
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`.mode-card[data-mode="${mode}"]`)?.classList.add('active');
}

// ══════════════════════════════════════════════
// AI PILLS (panel prompt)
// ══════════════════════════════════════════════
document.querySelectorAll('.ai-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    selectedAI = pill.dataset.ai;
    setAIPill(selectedAI);
    chrome.storage.local.set({ selectedAI });
  });
});
function setAIPill(ai) {
  document.querySelectorAll('.ai-pill').forEach(p => p.classList.remove('active'));
  document.querySelector(`.ai-pill[data-ai="${ai}"]`)?.classList.add('active');
}

// ══════════════════════════════════════════════
// PROVIDER PILLS
// ══════════════════════════════════════════════
document.querySelectorAll('.provider-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    selectedProvider = pill.dataset.provider;
    setProviderPill(selectedProvider);
    applyProvider(selectedProvider);
    chrome.storage.local.set({ selectedProvider });
  });
});

function setProviderPill(id) {
  document.querySelectorAll('.provider-pill').forEach(p => p.classList.remove('active'));
  document.querySelector(`.provider-pill[data-provider="${id}"]`)?.classList.add('active');
}

function applyProvider(id, overrides = {}) {
  const p = PROVIDERS[id] || PROVIDERS.custom;

  // Update header card
  document.getElementById('providerName').textContent = p.name;
  const docsLink = document.getElementById('providerDocsLink');
  if (p.docs) { docsLink.href = p.docs; docsLink.style.display = ''; }
  else docsLink.style.display = 'none';

  // Base URL
  const urlField = document.getElementById('baseUrl');
  urlField.value = overrides.baseUrl !== undefined ? (overrides.baseUrl || p.baseUrl) : p.baseUrl;
  urlField.placeholder = p.baseUrl || 'https://your-api.com/v1';

  // API Key
  const keyField = document.getElementById('apiKey');
  if (overrides.apiKey) keyField.value = overrides.apiKey;
  else if (id !== 'custom') keyField.value = '';
  keyField.placeholder = p.keyPlaceholder;

  // Model dropdown
  const modelSel = document.getElementById('modelSelect');
  modelSel.innerHTML = p.models.map(m => `<option value="${m}">${m}</option>`).join('');
  if (overrides.model && p.models.includes(overrides.model)) modelSel.value = overrides.model;

  // Model custom
  if (overrides.modelCustom) document.getElementById('modelCustom').value = overrides.modelCustom;
  else document.getElementById('modelCustom').value = '';
}

// Show/hide API key
document.getElementById('toggleKeyBtn').addEventListener('click', () => {
  const f = document.getElementById('apiKey');
  f.type = f.type === 'password' ? 'text' : 'password';
});

// Auto-save fields saat diubah
['baseUrl','apiKey','modelSelect','modelCustom','systemPrompt','maxTokens'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', saveCurrentFields);
});

function saveCurrentFields() {
  chrome.storage.local.set({
    baseUrl:      document.getElementById('baseUrl').value.trim(),
    apiKey:       document.getElementById('apiKey').value.trim(),
    model:        document.getElementById('modelSelect').value,
    modelCustom:  document.getElementById('modelCustom').value.trim(),
    systemPrompt: document.getElementById('systemPrompt').value.trim(),
    maxTokens:    document.getElementById('maxTokens').value,
    selectedProvider
  });
}

// ══════════════════════════════════════════════
// SAVED PROVIDERS — Simpan & Render
// ══════════════════════════════════════════════
document.getElementById('saveProviderBtn').addEventListener('click', () => {
  const baseUrl   = document.getElementById('baseUrl').value.trim();
  const apiKey    = document.getElementById('apiKey').value.trim();
  const model     = document.getElementById('modelCustom').value.trim() || document.getElementById('modelSelect').value;
  const pInfo     = PROVIDERS[selectedProvider] || PROVIDERS.custom;

  if (!baseUrl) {
    showStatus('apiStatus', '⚠️ Isi Base URL dulu sebelum menyimpan.', 'error');
    return;
  }

  const id   = 'prov_' + Date.now();
  const name = pInfo.name + (model ? ` · ${model}` : '');
  savedProviders.push({ id, name, baseUrl, apiKey, model, provider: selectedProvider, authHeader: pInfo.authHeader });
  chrome.storage.local.set({ savedProviders });
  renderSavedProviders();
  showStatus('apiStatus', `✅ Provider "${name}" tersimpan!`, 'success');
});

function renderSavedProviders() {
  const list = document.getElementById('savedProvidersList');
  if (!savedProviders.length) {
    list.innerHTML = '<div class="empty-saved">Belum ada provider tersimpan</div>';
    return;
  }
  list.innerHTML = savedProviders.map(p => `
    <div class="saved-item ${activeProviderId === p.id ? 'active-provider' : ''}" data-id="${p.id}">
      <span class="saved-item-name">${escHtml(p.name)}</span>
      <span class="saved-item-url">${escHtml(p.baseUrl)}</span>
      <span class="saved-item-del" data-del="${p.id}" title="Hapus">✕</span>
    </div>
  `).join('');

  // Klik item → load ke form
  list.querySelectorAll('.saved-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.dataset.del) return;
      const id = item.dataset.id;
      const p  = savedProviders.find(x => x.id === id);
      if (!p) return;
      activeProviderId = id;
      chrome.storage.local.set({ activeProviderId });
      selectedProvider = p.provider || 'custom';
      setProviderPill(selectedProvider);
      applyProvider(selectedProvider, { baseUrl: p.baseUrl, apiKey: p.apiKey, model: p.model });
      renderSavedProviders();
      showStatus('apiStatus', `✅ Provider "${p.name}" dimuat.`, 'success');
    });
  });

  // Klik ✕ → hapus
  list.querySelectorAll('.saved-item-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.del;
      savedProviders = savedProviders.filter(x => x.id !== id);
      if (activeProviderId === id) activeProviderId = null;
      chrome.storage.local.set({ savedProviders, activeProviderId });
      renderSavedProviders();
    });
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════
// TEST CONNECTION
// ══════════════════════════════════════════════
document.getElementById('testConnBtn').addEventListener('click', async () => {
  const baseUrl = document.getElementById('baseUrl').value.trim();
  const apiKey  = document.getElementById('apiKey').value.trim();
  if (!baseUrl) { showStatus('apiStatus', '⚠️ Isi Base URL dulu.', 'error'); return; }

  showStatus('apiStatus', '⏳ Menguji koneksi...', 'loading');
  document.getElementById('testConnBtn').disabled = true;

  try {
    const p       = PROVIDERS[selectedProvider] || PROVIDERS.custom;
    const modPath = p.modelsPath || '/models';
    const url     = baseUrl.replace(/\/$/, '') + modPath;
    const headers = buildHeaders(p, apiKey, baseUrl);

    const res  = await fetch(url, { headers });
    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      const count = json.data?.length || json.models?.length || '?';
      showStatus('apiStatus', `✅ Koneksi berhasil! ${count} model tersedia.`, 'success');
    } else {
      showStatus('apiStatus', `❌ HTTP ${res.status}: ${json.error?.message || res.statusText}`, 'error');
    }
  } catch (e) {
    showStatus('apiStatus', `❌ Tidak bisa terhubung: ${e.message}`, 'error');
  } finally {
    document.getElementById('testConnBtn').disabled = false;
  }
});

// ══════════════════════════════════════════════
// FETCH MODEL LIST
// ══════════════════════════════════════════════
document.getElementById('fetchModelsBtn').addEventListener('click', async () => {
  const baseUrl = document.getElementById('baseUrl').value.trim();
  const apiKey  = document.getElementById('apiKey').value.trim();
  if (!baseUrl) { showStatus('apiStatus', '⚠️ Isi Base URL dulu.', 'error'); return; }

  showStatus('apiStatus', '⏳ Mengambil daftar model...', 'loading');
  document.getElementById('fetchModelsBtn').disabled = true;

  try {
    const p       = PROVIDERS[selectedProvider] || PROVIDERS.custom;
    const modPath = p.modelsPath || '/models';
    const url     = baseUrl.replace(/\/$/, '') + modPath;
    const headers = buildHeaders(p, apiKey, baseUrl);

    const res  = await fetch(url, { headers });
    const json = await res.json();

    if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);

    // Parse berbagai format response
    const models = (json.data || json.models || []).map(m => m.id || m.name || m).filter(Boolean);

    if (!models.length) {
      showStatus('apiStatus', '⚠️ Tidak ada model yang ditemukan.', 'error');
      return;
    }

    // Isi dropdown
    const sel = document.getElementById('modelSelect');
    sel.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');

    showStatus('apiStatus', `✅ ${models.length} model ditemukan & dimuat ke dropdown!`, 'success');
  } catch (e) {
    showStatus('apiStatus', `❌ Gagal fetch model: ${e.message}`, 'error');
  } finally {
    document.getElementById('fetchModelsBtn').disabled = false;
  }
});

// ══════════════════════════════════════════════
// BUILD HEADERS per provider format
// ══════════════════════════════════════════════
function buildHeaders(providerDef, apiKey, baseUrl) {
  const headers = { 'Content-Type': 'application/json' };
  const p = providerDef;

  if (p.format === 'anthropic') {
    if (apiKey) headers['x-api-key'] = apiKey;
    Object.assign(headers, p.extraHeaders || {});
  } else if (p.format === 'google') {
    // Google: key di query param, bukan header
    // tidak perlu header auth
  } else {
    // OpenAI-compatible (default)
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  }

  // OpenRouter perlu extra header
  if (baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'chrome-extension://web-to-ai';
    headers['X-Title'] = 'Web to AI Extension';
  }

  return headers;
}

// ══════════════════════════════════════════════
// BUILD REQUEST BODY per provider format
// ══════════════════════════════════════════════
function buildRequestBody(p, model, systemPrompt, userContent, maxTokens) {
  if (p.format === 'anthropic') {
    return {
      model,
      max_tokens: parseInt(maxTokens) || 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }]
    };
  }
  if (p.format === 'google') {
    return {
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }],
      generationConfig: { maxOutputTokens: parseInt(maxTokens) || 2000 }
    };
  }
  // OpenAI-compatible default
  return {
    model,
    max_tokens: parseInt(maxTokens) || 2000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent }
    ]
  };
}

// ══════════════════════════════════════════════
// BUILD ENDPOINT URL per provider
// ══════════════════════════════════════════════
function buildEndpointUrl(p, baseUrl, model, apiKey) {
  const base = baseUrl.replace(/\/$/, '');
  let path = p.chatPath || '/chat/completions';
  path = path.replace('{model}', encodeURIComponent(model));

  let url = base + path;

  // Google pakai query param key
  if (p.format === 'google' && apiKey) {
    url += `?key=${encodeURIComponent(apiKey)}`;
  }
  return url;
}

// ══════════════════════════════════════════════
// PARSE RESPONSE per provider format
// ══════════════════════════════════════════════
function parseResponse(p, json) {
  if (p.format === 'anthropic') {
    return json.content?.[0]?.text || json.error?.message || '(kosong)';
  }
  if (p.format === 'google') {
    return json.candidates?.[0]?.content?.parts?.[0]?.text || json.error?.message || '(kosong)';
  }
  return json.choices?.[0]?.message?.content || json.error?.message || '(kosong)';
}

// ══════════════════════════════════════════════
// SEND TO AI API
// ══════════════════════════════════════════════
document.getElementById('sendApiBtn').addEventListener('click', async () => {
  const baseUrl   = document.getElementById('baseUrl').value.trim();
  const apiKey    = document.getElementById('apiKey').value.trim();
  const model     = document.getElementById('modelCustom').value.trim()
                 || document.getElementById('modelSelect').value;
  const sysPrompt = document.getElementById('systemPrompt').value.trim()
    || 'Kamu adalah frontend developer dan UX analyst. Analisis halaman web berikut secara mendalam.';
  const maxTokens = document.getElementById('maxTokens').value || 2000;
  const apiMode   = document.getElementById('apiExtractMode').value;

  if (!baseUrl) {
    showStatus('apiStatus', '⚠️ Isi Base URL provider dulu.', 'error');
    return;
  }

  saveCurrentFields();
  showStatus('apiStatus', '⏳ Memindai halaman...', 'loading');
  document.getElementById('sendApiBtn').disabled = true;

  try {
    // Ekstrak konten dari halaman
    let userContent;
    if (apiMode === 'clone' || apiMode === 'style' || apiMode === 'component') {
      const res = await sendToContent({ action: 'getPrompt', promptMode: apiMode });
      userContent = res.prompt;
    } else {
      const res = await sendToContent({ action: 'extract', includeStyles: false });
      userContent = formatContent(res.data, apiMode);
    }

    showStatus('apiStatus', '⏳ Mengirim ke AI...', 'loading');

    const p       = PROVIDERS[selectedProvider] || PROVIDERS.custom;
    const headers = buildHeaders(p, apiKey, baseUrl);
    const body    = buildRequestBody(p, model, sysPrompt, userContent.substring(0, 14000), maxTokens);
    const url     = buildEndpointUrl(p, baseUrl, model, apiKey);

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error?.message || `HTTP ${resp.status}`);

    const reply  = parseResponse(p, json);
    const tokens = json.usage?.total_tokens || json.usageMetadata?.totalTokenCount || 0;

    await writeClipboard(reply);

    document.getElementById('apiResult').textContent = reply;
    document.getElementById('apiResultWrap').style.display = 'block';
    document.getElementById('apiResultMeta').textContent =
      `${reply.length.toLocaleString()} karakter · ${tokens ? tokens.toLocaleString() + ' token' : ''} · model: ${model}`;

    showStatus('apiStatus', `✅ Respons diterima & tersalin ke clipboard!`, 'success');
  } catch (e) {
    showStatus('apiStatus', '❌ ' + e.message, 'error');
  } finally {
    document.getElementById('sendApiBtn').disabled = false;
  }
});

// Salin hasil
document.getElementById('copyApiResult').addEventListener('click', async () => {
  const text = document.getElementById('apiResult').textContent;
  if (text) { await writeClipboard(text); showStatus('apiStatus', '✅ Tersalin!', 'success'); }
});

// Clear hasil
document.getElementById('clearApiResult').addEventListener('click', () => {
  document.getElementById('apiResult').textContent = '';
  document.getElementById('apiResultWrap').style.display = 'none';
  document.getElementById('apiResultMeta').textContent = '';
  hideStatus('apiStatus');
});

// ══════════════════════════════════════════════
// PANEL: PROMPT
// ══════════════════════════════════════════════
document.getElementById('generateBtn').addEventListener('click', async () => {
  showStatus('promptStatus', '⏳ Memindai halaman...', 'loading');
  document.getElementById('generateBtn').disabled = true;
  try {
    const res = await sendToContent({ action: 'getPrompt', promptMode: selectedPromptMode });
    lastPrompt = res.prompt;

    document.getElementById('promptPreview').textContent =
      lastPrompt.substring(0, 600) + (lastPrompt.length > 600 ? '\n\n...(dipotong)' : '');
    document.getElementById('promptPreviewWrap').style.display = 'block';
    document.getElementById('promptLen').textContent = `${lastPrompt.length.toLocaleString()} karakter`;
    document.getElementById('copyPromptBtn').disabled = false;
    document.getElementById('openWithPromptBtn').disabled = false;

    showStatus('promptStatus', `✅ Prompt siap! ${lastPrompt.length.toLocaleString()} karakter`, 'success');
  } catch (e) {
    showStatus('promptStatus', '❌ ' + e.message, 'error');
  } finally {
    document.getElementById('generateBtn').disabled = false;
  }
});

document.getElementById('copyPromptBtn').addEventListener('click', async () => {
  if (!lastPrompt) return;
  await writeClipboard(lastPrompt);
  showStatus('promptStatus', '✅ Prompt tersalin!', 'success');
});

document.getElementById('openWithPromptBtn').addEventListener('click', async () => {
  if (!lastPrompt) return;
  await writeClipboard(lastPrompt);
  if (selectedAI === 'copy') {
    showStatus('promptStatus', '✅ Prompt tersalin ke clipboard!', 'success');
    return;
  }
  chrome.tabs.create({ url: AI_URLS[selectedAI] });
  showStatus('promptStatus', `✅ Membuka ${selectedAI} — tinggal Ctrl+V / Cmd+V!`, 'success');
});

// ══════════════════════════════════════════════
// PANEL: STYLE
// ══════════════════════════════════════════════
document.getElementById('extractStyleBtn').addEventListener('click', async () => {
  showStatus('styleStatus', '⏳ Memindai design system...', 'loading');
  document.getElementById('extractStyleBtn').disabled = true;
  try {
    const res  = await sendToContent({ action: 'extract', includeStyles: true });
    const data = res.data;
    lastStyleData = data;

    const styles = data.styles || {};
    const comps  = data.components || [];

    document.getElementById('statColors').textContent = styles.colors?.length || 0;
    document.getElementById('statFonts').textContent  = styles.typography?.fonts?.length || 0;
    const varCount = Object.keys({ ...styles.cssVars?.defined, ...styles.cssVars?.computed }).length;
    document.getElementById('statVars').textContent   = varCount;
    document.getElementById('statComps').textContent  = comps.reduce((a, c) => a + c.count, 0);
    document.getElementById('styleStats').style.display = 'flex';

    const swatchWrap = document.getElementById('colorSwatches');
    swatchWrap.innerHTML = '';
    const uniqueColors = [...new Set((styles.colors || []).map(c => c.hex))].slice(0, 40);
    uniqueColors.forEach(hex => {
      const sw = document.createElement('div');
      sw.title = hex;
      sw.style.cssText = `width:22px;height:22px;border-radius:4px;background:${hex};border:1px solid rgba(255,255,255,0.1);cursor:pointer;flex-shrink:0;`;
      sw.addEventListener('click', () => writeClipboard(hex));
      swatchWrap.appendChild(sw);
    });

    document.getElementById('fontList').innerHTML = (styles.typography?.fonts || []).slice(0, 6)
      .map(f => `• ${f.family.split(',')[0].replace(/['"]/g, '').trim()} <span style="color:#444466">(${f.usedIn?.slice(0,4).join(', ')})</span>`)
      .join('<br>');

    const allVars  = { ...styles.cssVars?.defined, ...styles.cssVars?.computed };
    const varLines = Object.entries(allVars).slice(0, 40);
    document.getElementById('cssVarsBox').textContent = varLines.length
      ? varLines.map(([k, v]) => `${k}: ${v}`).join('\n')
      : '(tidak ada CSS variables)';

    document.getElementById('styleResult').style.display = 'block';
    showStatus('styleStatus', '✅ Design system berhasil dipindai!', 'success');
  } catch (e) {
    showStatus('styleStatus', '❌ ' + e.message, 'error');
  } finally {
    document.getElementById('extractStyleBtn').disabled = false;
  }
});

document.getElementById('copyStyleBtn').addEventListener('click', async () => {
  if (!lastStyleData) return;
  const styles = lastStyleData.styles || {};
  let text = `=== DESIGN SYSTEM ===\nURL: ${lastStyleData.url}\n\n`;

  const colors = [...new Set((styles.colors || []).map(c => c.hex))];
  text += `--- WARNA (${colors.length}) ---\n${colors.join(', ')}\n\n`;
  text += `--- TIPOGRAFI ---\n`;
  (styles.typography?.fonts || []).forEach(f => { text += `Font: ${f.family}\n`; });
  text += `Sizes: ${(styles.typography?.sizes || []).join(', ')}\n`;
  text += `Weights: ${(styles.typography?.weights || []).join(', ')}\n\n`;

  const vars = { ...styles.cssVars?.defined, ...styles.cssVars?.computed };
  if (Object.keys(vars).length) {
    text += `--- CSS VARIABLES ---\n:root {\n`;
    Object.entries(vars).slice(0, 60).forEach(([k, v]) => { text += `  ${k}: ${v};\n`; });
    text += `}\n\n`;
  }
  const sp = styles.spacing || {};
  text += `--- SPACING ---\nPadding: ${sp.paddings?.join(', ')}\nMargin: ${sp.margins?.join(', ')}\nBorder-radius: ${sp.borderRadius?.join(', ')}\nGap: ${sp.gaps?.join(', ')}\n`;
  if (styles.shadows?.length) {
    text += `\n--- SHADOWS ---\n`;
    styles.shadows.forEach(s => { text += `[${s.type}] ${s.value}\n`; });
  }
  const comps = lastStyleData.components || [];
  if (comps.length) {
    text += `\n--- KOMPONEN UI ---\n`;
    comps.forEach(c => { text += `${c.name}: ${c.count} elemen\n`; });
  }

  await writeClipboard(text);
  showStatus('styleStatus', '✅ Semua style tersalin!', 'success');
});

document.getElementById('copyRawCSSBtn').addEventListener('click', async () => {
  if (!lastStyleData) return;
  const allCSS = lastStyleData.styles?.allCSS || [];
  if (!allCSS.length) { showStatus('styleStatus', '⚠️ Tidak ada CSS yang bisa diekstrak.', 'error'); return; }
  const raw = allCSS.map(s => `/* === ${s.href} === */\n${s.rules}`).join('\n\n');
  await writeClipboard(raw);
  showStatus('styleStatus', `✅ Raw CSS tersalin (${raw.length.toLocaleString()} karakter)!`, 'success');
});

// ══════════════════════════════════════════════
// PANEL: KONTEN
// ══════════════════════════════════════════════
function formatContent(data, mode) {
  let text = `URL: ${data.url}\nJudul: ${data.title}\nWaktu: ${new Date().toLocaleString('id-ID')}\n\n`;
  const c = data.content;
  switch (mode) {
    case 'text':
      text += `=== TEKS ===\n${c.visibleText}`; break;
    case 'tables':
      text += c.tables?.length
        ? c.tables.map((t, i) => `— Tabel ${i+1} —\n` + t.map(r => r.join(' | ')).join('\n')).join('\n\n')
        : 'Tidak ada tabel.';
      break;
    case 'links':
      text += c.links?.length
        ? c.links.map(l => `• ${l.text}\n  ${l.href}`).join('\n')
        : 'Tidak ada link.';
      break;
    case 'forms':
      text += c.forms?.length
        ? c.forms.map(f => `[${f.tag}] ${f.name || f.placeholder || '?'}: ${f.value || '(kosong)'}`).join('\n')
        : 'Tidak ada form.';
      break;
    case 'images':
      text += c.images?.length
        ? c.images.map(i => `• ${i.alt || '(tanpa alt)'} — ${i.src}`).join('\n')
        : 'Tidak ada gambar.';
      break;
    default:
      text += `=== TEKS ===\n${c.visibleText}\n\n`;
      if (c.tables?.length) {
        text += `=== TABEL ===\n`;
        c.tables.forEach((t, i) => { text += `— Tabel ${i+1} —\n` + t.map(r => r.join(' | ')).join('\n') + '\n\n'; });
      }
      if (c.links?.length) {
        text += `=== LINK ===\n`;
        c.links.slice(0, 30).forEach(l => { text += `• ${l.text}: ${l.href}\n`; });
        text += '\n';
      }
      if (c.images?.length) {
        text += `=== GAMBAR ===\n`;
        c.images.forEach(i => { text += `• [${i.alt || 'tanpa alt'}] ${i.src}\n`; });
      }
      const desc = c.meta?.['description'] || c.meta?.['og:description'];
      if (desc) text += `\n=== META ===\n${desc}`;
  }
  return text;
}

document.getElementById('previewBtn').addEventListener('click', async () => {
  showStatus('contentStatus', '⏳ Mengambil konten...', 'loading');
  try {
    const res  = await sendToContent({ action: 'extract', includeStyles: false });
    const mode = document.getElementById('extractMode').value;
    const text = formatContent(res.data, mode);
    const box  = document.getElementById('previewBox');
    box.textContent = text.substring(0, 800) + (text.length > 800 ? '\n...(dipotong)' : '');
    box.style.display = 'block';
    document.getElementById('charCount').textContent =
      `${text.length.toLocaleString()} karakter · ${text.split('\n').length} baris`;
    showStatus('contentStatus', '✅ Berhasil diekstrak!', 'success');
  } catch (e) {
    showStatus('contentStatus', '❌ ' + e.message, 'error');
  }
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  showStatus('contentStatus', '⏳ Menyalin...', 'loading');
  try {
    const res  = await sendToContent({ action: 'extract', includeStyles: false });
    const mode = document.getElementById('extractMode').value;
    const text = formatContent(res.data, mode);
    await writeClipboard(text);
    document.getElementById('charCount').textContent = `${text.length.toLocaleString()} karakter tersalin ✓`;
    showStatus('contentStatus', `✅ Tersalin! Paste ke AI sekarang.`, 'success');
  } catch (e) {
    showStatus('contentStatus', '❌ ' + e.message, 'error');
  }
});

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
async function sendToContent(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, msg, res => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, files: ['content.js'] },
          () => {
            if (chrome.runtime.lastError) {
              return reject(new Error('Tidak bisa inject ke halaman ini (chrome://, pdf, dll).'));
            }
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, msg, res2 => {
                if (chrome.runtime.lastError || !res2) {
                  return reject(new Error('Coba reload halaman lalu coba lagi.'));
                }
                if (res2.success) resolve(res2);
                else reject(new Error(res2.error || 'Ekstrak gagal.'));
              });
            }, 600);
          }
        );
      } else if (!res) {
        reject(new Error('Tidak ada respons. Reload halaman lalu coba lagi.'));
      } else if (res.success) {
        resolve(res);
      } else {
        reject(new Error(res.error || 'Ekstrak gagal.'));
      }
    });
  });
}

function showStatus(id, msg, type = 'info') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `status show ${type}`;
}
function hideStatus(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'status';
}
async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}
