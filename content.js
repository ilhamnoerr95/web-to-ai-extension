// =============================================
// content.js — Ekstrak konten + style + design system
// =============================================

// ── Teks & Konten ────────────────────────────
function extractVisibleText() {
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll(
    'script, style, noscript, iframe, svg, canvas, video, audio, [aria-hidden="true"]'
  ).forEach(el => el.remove());
  return clone.innerText.replace(/\t+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function extractForms() {
  const forms = [];
  document.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type === 'password' || el.type === 'hidden') return;
    forms.push({
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      name: el.name || el.id || el.getAttribute('aria-label') || '',
      placeholder: el.placeholder || '',
      value: el.value || ''
    });
  });
  return forms;
}

function extractTables() {
  const tables = [];
  document.querySelectorAll('table').forEach(table => {
    const rows = [];
    table.querySelectorAll('tr').forEach(tr => {
      const cells = [];
      tr.querySelectorAll('td, th').forEach(td => cells.push(td.innerText.trim()));
      if (cells.length) rows.push(cells);
    });
    if (rows.length) tables.push(rows);
  });
  return tables;
}

function extractLinks() {
  const links = [];
  document.querySelectorAll('a[href]').forEach(a => {
    const text = a.innerText.trim();
    const href = a.href;
    if (text && href && !href.startsWith('javascript:')) links.push({ text, href });
  });
  return links.slice(0, 50);
}

function extractImages() {
  const images = [];
  document.querySelectorAll('img').forEach(img => {
    images.push({
      alt: img.alt?.trim() || '',
      src: img.src,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height
    });
  });
  return images.slice(0, 30);
}

function extractMeta() {
  const meta = {};
  document.querySelectorAll('meta').forEach(m => {
    const name = m.getAttribute('name') || m.getAttribute('property');
    const content = m.getAttribute('content');
    if (name && content) meta[name] = content;
  });
  return meta;
}

// ── CSS & Design System ───────────────────────

function extractCSSVariables() {
  const vars = {};
  try {
    const rootStyle = getComputedStyle(document.documentElement);
    // Scan semua stylesheet untuk CSS custom properties
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules || []) {
          if (rule.style) {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--')) {
                vars[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }
          }
        }
      } catch (e) {} // Cross-origin stylesheet
    }
    // Juga ambil dari :root computed
    const rootVars = {};
    for (const prop of rootStyle) {
      if (prop.startsWith('--')) {
        rootVars[prop] = rootStyle.getPropertyValue(prop).trim();
      }
    }
    return { defined: vars, computed: rootVars };
  } catch (e) {
    return { defined: {}, computed: {} };
  }
}

function extractColors() {
  const colorSet = new Set();
  const colorMap = {}; // warna -> elemen yang memakainya

  const props = ['color', 'background-color', 'border-color', 'outline-color'];
  const elements = document.querySelectorAll('*');

  elements.forEach(el => {
    const cs = getComputedStyle(el);
    props.forEach(prop => {
      const val = cs.getPropertyValue(prop);
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent' && val !== '') {
        colorSet.add(val);
        const tag = el.tagName.toLowerCase();
        if (!colorMap[val]) colorMap[val] = new Set();
        colorMap[val].add(`${tag}:${prop}`);
      }
    });
  });

  return [...colorSet].slice(0, 60).map(c => ({
    value: c,
    hex: rgbToHex(c),
    usedIn: [...(colorMap[c] || [])].slice(0, 3)
  }));
}

function rgbToHex(rgb) {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function extractTypography() {
  const fonts = new Map();
  const sizes = new Set();
  const weights = new Set();
  const lineHeights = new Set();
  const letterSpacings = new Set();

  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    const family = cs.fontFamily;
    const size = cs.fontSize;
    const weight = cs.fontWeight;
    const lh = cs.lineHeight;
    const ls = cs.letterSpacing;

    if (family) {
      if (!fonts.has(family)) fonts.set(family, { family, usedIn: [] });
      fonts.get(family).usedIn.push(el.tagName.toLowerCase());
    }
    if (size && size !== '0px') sizes.add(size);
    if (weight) weights.add(weight);
    if (lh && lh !== 'normal') lineHeights.add(lh);
    if (ls && ls !== '0px') letterSpacings.add(ls);
  });

  return {
    fonts: [...fonts.values()].map(f => ({
      family: f.family,
      usedIn: [...new Set(f.usedIn)].slice(0, 5)
    })),
    sizes: [...sizes].sort((a, b) => parseFloat(a) - parseFloat(b)),
    weights: [...weights].sort(),
    lineHeights: [...lineHeights].slice(0, 10),
    letterSpacings: [...letterSpacings].slice(0, 10)
  };
}

function extractSpacing() {
  const paddings = new Set();
  const margins = new Set();
  const gaps = new Set();
  const borderRadius = new Set();

  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    ['padding-top','padding-right','padding-bottom','padding-left'].forEach(p => {
      const v = cs.getPropertyValue(p);
      if (v && v !== '0px') paddings.add(v);
    });
    ['margin-top','margin-right','margin-bottom','margin-left'].forEach(p => {
      const v = cs.getPropertyValue(p);
      if (v && v !== '0px') margins.add(v);
    });
    const gap = cs.gap || cs.getPropertyValue('gap');
    if (gap && gap !== '0px' && gap !== 'normal') gaps.add(gap);

    const br = cs.borderRadius;
    if (br && br !== '0px') borderRadius.add(br);
  });

  return {
    paddings: [...paddings].sort((a,b) => parseFloat(a)-parseFloat(b)).slice(0, 20),
    margins: [...margins].sort((a,b) => parseFloat(a)-parseFloat(b)).slice(0, 20),
    gaps: [...gaps].slice(0, 10),
    borderRadius: [...borderRadius].slice(0, 15)
  };
}

function extractShadows() {
  const shadows = new Set();
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    const bs = cs.boxShadow;
    const ts = cs.textShadow;
    if (bs && bs !== 'none') shadows.add({ type: 'box', value: bs });
    if (ts && ts !== 'none') shadows.add({ type: 'text', value: ts });
  });
  return [...shadows].slice(0, 15);
}

function extractLayoutInfo() {
  const body = document.body;
  const cs = getComputedStyle(body);
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio
  };

  // Temukan elemen layout utama
  const containers = [];
  document.querySelectorAll('main, header, footer, nav, section, aside, .container, .wrapper, [class*="layout"], [class*="grid"]').forEach(el => {
    const cs = getComputedStyle(el);
    containers.push({
      tag: el.tagName.toLowerCase(),
      class: el.className?.toString().substring(0, 60) || '',
      display: cs.display,
      flexDirection: cs.flexDirection,
      gridTemplateColumns: cs.gridTemplateColumns,
      maxWidth: cs.maxWidth,
      width: cs.width
    });
  });

  return { viewport, containers: containers.slice(0, 20) };
}

// ── UI Components ─────────────────────────────

function extractUIComponents() {
  const components = [];

  const selectors = {
    'Buttons': 'button, [role="button"], .btn, [class*="button"], [class*="btn"]',
    'Inputs': 'input:not([type=hidden]), textarea',
    'Cards': '[class*="card"], [class*="Card"]',
    'Navbars': 'nav, header, [class*="nav"], [class*="navbar"], [class*="header"]',
    'Modals': '[class*="modal"], [class*="dialog"], [role="dialog"]',
    'Badges': '[class*="badge"], [class*="tag"], [class*="chip"], [class*="label"]',
    'Alerts': '[class*="alert"], [class*="toast"], [class*="notification"], [role="alert"]',
    'Lists': 'ul li, ol li',
    'Images': 'img',
    'Icons': 'svg, [class*="icon"]'
  };

  for (const [name, selector] of Object.entries(selectors)) {
    const els = document.querySelectorAll(selector);
    if (!els.length) continue;

    const samples = [];
    els.forEach((el, i) => {
      if (i >= 3) return; // Ambil 3 sampel per komponen
      const cs = getComputedStyle(el);
      samples.push({
        html: el.outerHTML.substring(0, 400),
        text: el.innerText?.trim().substring(0, 100) || '',
        styles: {
          display: cs.display,
          color: cs.color,
          backgroundColor: cs.backgroundColor,
          borderRadius: cs.borderRadius,
          padding: cs.padding,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          border: cs.border,
          boxShadow: cs.boxShadow,
          width: cs.width,
          height: cs.height
        }
      });
    });

    if (samples.length) {
      components.push({ name, count: els.length, samples });
    }
  }

  return components;
}

// ── Seluruh CSS Rules ─────────────────────────

function extractAllCSS() {
  const allCSS = [];
  for (const sheet of document.styleSheets) {
    try {
      const rules = [];
      for (const rule of sheet.cssRules || []) {
        rules.push(rule.cssText);
      }
      if (rules.length) {
        allCSS.push({
          href: sheet.href || 'inline',
          rules: rules.join('\n')
        });
      }
    } catch (e) {
      allCSS.push({ href: sheet.href || 'cross-origin', rules: '[cross-origin, tidak bisa dibaca]' });
    }
  }
  return allCSS;
}

// ── Prompt Generator ──────────────────────────

function generateAIPrompt(data, mode) {
  const { url, title, content, styles, components, layout } = data;
  const now = new Date().toLocaleString('id-ID');

  if (mode === 'clone') {
    return buildClonePrompt(data);
  }
  if (mode === 'style') {
    return buildStylePrompt(data);
  }
  if (mode === 'component') {
    return buildComponentPrompt(data);
  }
  if (mode === 'analyze') {
    return buildAnalyzePrompt(data);
  }

  // Default: full prompt
  return buildFullPrompt(data);
}

function buildClonePrompt(data) {
  const { url, title, content, styles, components, layout } = data;
  let prompt = `Kamu adalah seorang frontend developer ahli. Tugasmu adalah membuat ulang halaman web berikut secara lengkap.\n\n`;
  prompt += `## HALAMAN YANG INGIN DI-CLONE\n`;
  prompt += `URL: ${url}\nJudul: ${title}\n\n`;

  prompt += `## DESIGN SYSTEM\n\n`;

  // Warna
  if (styles?.colors?.length) {
    prompt += `### Palet Warna\n`;
    const uniqueColors = [...new Set(styles.colors.map(c => c.hex))].slice(0, 20);
    uniqueColors.forEach(c => { prompt += `- ${c}\n`; });
    prompt += '\n';
  }

  // Tipografi
  if (styles?.typography) {
    const t = styles.typography;
    prompt += `### Tipografi\n`;
    if (t.fonts?.length) {
      prompt += `Font: ${t.fonts.slice(0,3).map(f => f.family.split(',')[0].trim()).join(', ')}\n`;
    }
    if (t.sizes?.length) {
      prompt += `Ukuran font: ${t.sizes.slice(0,10).join(', ')}\n`;
    }
    if (t.weights?.length) {
      prompt += `Font weight: ${t.weights.join(', ')}\n`;
    }
    prompt += '\n';
  }

  // Spacing & Border
  if (styles?.spacing) {
    const s = styles.spacing;
    prompt += `### Spacing\n`;
    if (s.paddings?.length) prompt += `Padding: ${s.paddings.slice(0,8).join(', ')}\n`;
    if (s.margins?.length) prompt += `Margin: ${s.margins.slice(0,8).join(', ')}\n`;
    if (s.borderRadius?.length) prompt += `Border radius: ${s.borderRadius.slice(0,6).join(', ')}\n`;
    if (s.gaps?.length) prompt += `Gap: ${s.gaps.join(', ')}\n`;
    prompt += '\n';
  }

  // CSS Variables
  if (styles?.cssVars) {
    const vars = { ...styles.cssVars.defined, ...styles.cssVars.computed };
    const keys = Object.keys(vars).slice(0, 30);
    if (keys.length) {
      prompt += `### CSS Variables\n\`\`\`css\n:root {\n`;
      keys.forEach(k => { prompt += `  ${k}: ${vars[k]};\n`; });
      prompt += `}\n\`\`\`\n\n`;
    }
  }

  // Layout
  if (layout?.containers?.length) {
    prompt += `### Layout Utama\n`;
    layout.containers.slice(0, 8).forEach(c => {
      prompt += `- <${c.tag}${c.class ? ` class="${c.class}"` : ''}> → display: ${c.display}`;
      if (c.gridTemplateColumns !== 'none' && c.gridTemplateColumns) prompt += `, grid: ${c.gridTemplateColumns}`;
      if (c.maxWidth !== 'none') prompt += `, max-width: ${c.maxWidth}`;
      prompt += '\n';
    });
    prompt += '\n';
  }

  // Komponen
  if (components?.length) {
    prompt += `## KOMPONEN UI\n\n`;
    components.forEach(comp => {
      prompt += `### ${comp.name} (${comp.count} elemen)\n`;
      if (comp.samples[0]) {
        const s = comp.samples[0].styles;
        prompt += `Style: color: ${s.color}, bg: ${s.backgroundColor}, border-radius: ${s.borderRadius}, padding: ${s.padding}, font-size: ${s.fontSize}\n`;
        prompt += `Contoh HTML:\n\`\`\`html\n${comp.samples[0].html}\n\`\`\`\n`;
      }
      prompt += '\n';
    });
  }

  // Konten
  prompt += `## KONTEN HALAMAN\n\n`;
  prompt += content.visibleText.substring(0, 3000) + (content.visibleText.length > 3000 ? '\n...(terpotong)' : '');
  prompt += '\n\n';

  prompt += `## INSTRUKSI\n`;
  prompt += `Buat ulang halaman web ini menggunakan HTML + Tailwind CSS (atau plain CSS jika lebih sesuai).\n`;
  prompt += `- Gunakan palet warna yang persis sama\n`;
  prompt += `- Gunakan tipografi yang sama\n`;
  prompt += `- Buat layout yang identik\n`;
  prompt += `- Semua komponen harus responsif\n`;
  prompt += `- Kode harus bersih dan terstruktur\n`;
  prompt += `Mulai dengan struktur HTML lengkap.\n`;

  return prompt;
}

function buildStylePrompt(data) {
  const { url, title, styles } = data;
  let prompt = `Ekstrak dan dokumentasikan design system dari halaman web ini.\n\n`;
  prompt += `URL: ${url}\nJudul: ${title}\n\n`;

  prompt += `## CSS VARIABLES\n`;
  const vars = { ...styles?.cssVars?.defined, ...styles?.cssVars?.computed };
  if (Object.keys(vars).length) {
    prompt += `\`\`\`css\n:root {\n`;
    Object.entries(vars).slice(0, 50).forEach(([k, v]) => {
      prompt += `  ${k}: ${v};\n`;
    });
    prompt += `}\n\`\`\`\n\n`;
  } else {
    prompt += `(tidak ada CSS variables)\n\n`;
  }

  prompt += `## WARNA\n`;
  if (styles?.colors?.length) {
    styles.colors.slice(0, 30).forEach(c => {
      prompt += `- ${c.hex} (${c.value}) → digunakan di: ${c.usedIn.join(', ')}\n`;
    });
  }
  prompt += '\n';

  prompt += `## TIPOGRAFI\n`;
  if (styles?.typography) {
    const t = styles.typography;
    prompt += `### Font Families\n`;
    t.fonts?.forEach(f => { prompt += `- ${f.family} (digunakan di: ${f.usedIn.join(', ')})\n`; });
    prompt += `\n### Font Sizes\n${t.sizes?.join(', ')}\n`;
    prompt += `\n### Font Weights\n${t.weights?.join(', ')}\n`;
    prompt += `\n### Line Heights\n${t.lineHeights?.join(', ')}\n`;
    prompt += `\n### Letter Spacing\n${t.letterSpacings?.join(', ')}\n`;
  }
  prompt += '\n';

  prompt += `## SPACING\n`;
  if (styles?.spacing) {
    const s = styles.spacing;
    prompt += `Padding values: ${s.paddings?.join(', ')}\n`;
    prompt += `Margin values: ${s.margins?.join(', ')}\n`;
    prompt += `Border radius: ${s.borderRadius?.join(', ')}\n`;
    prompt += `Gap: ${s.gaps?.join(', ')}\n`;
  }
  prompt += '\n';

  prompt += `## SHADOWS\n`;
  if (styles?.shadows?.length) {
    styles.shadows.forEach(s => {
      prompt += `- [${s.type}] ${s.value}\n`;
    });
  }

  return prompt;
}

function buildComponentPrompt(data) {
  const { url, title, components } = data;
  let prompt = `Dokumentasikan semua komponen UI dari halaman ini.\n\n`;
  prompt += `URL: ${url}\nJudul: ${title}\n\n`;

  if (!components?.length) {
    prompt += 'Tidak ada komponen yang terdeteksi.\n';
    return prompt;
  }

  components.forEach(comp => {
    prompt += `## ${comp.name.toUpperCase()} (${comp.count} ditemukan)\n\n`;
    comp.samples.forEach((s, i) => {
      prompt += `### Sampel ${i + 1}\n`;
      prompt += `Teks: "${s.text}"\n`;
      prompt += `\nComputed Styles:\n`;
      Object.entries(s.styles).forEach(([k, v]) => {
        if (v && v !== 'none' && v !== 'auto' && v !== '0px') {
          prompt += `  ${k}: ${v}\n`;
        }
      });
      prompt += `\nHTML:\n\`\`\`html\n${s.html}\n\`\`\`\n\n`;
    });
  });

  prompt += `\n## INSTRUKSI\nBuat ulang komponen-komponen di atas sebagai React components dengan Tailwind CSS.\nSetiap komponen harus memiliki props yang sesuai dan style yang identik dengan aslinya.\n`;

  return prompt;
}

function buildAnalyzePrompt(data) {
  const { url, title, content, styles, layout } = data;
  let prompt = `Analisis desain dan UX dari halaman web berikut:\n\n`;
  prompt += `URL: ${url}\nJudul: ${title}\n\n`;
  prompt += `## KONTEN\n${content.visibleText.substring(0, 2000)}\n\n`;
  prompt += `## STATISTIK DESIGN\n`;
  prompt += `- Jumlah warna unik: ${styles?.colors?.length || 0}\n`;
  prompt += `- Font families: ${styles?.typography?.fonts?.length || 0}\n`;
  prompt += `- Komponen UI: ${data.components?.reduce((a, c) => a + c.count, 0) || 0}\n`;
  prompt += `- Viewport: ${layout?.viewport?.width}x${layout?.viewport?.height}\n\n`;
  prompt += `## INSTRUKSI\nBerikan analisis mendalam tentang:\n1. Palet warna dan konsistensinya\n2. Hirarki tipografi\n3. Sistem spacing\n4. Komponen UI dan polanya\n5. Kelebihan dan kekurangan desain\n6. Saran perbaikan UX\n`;
  return prompt;
}

function buildFullPrompt(data) {
  const { url, title, content, styles, components } = data;
  let prompt = `Berikut adalah ekstrak lengkap dari halaman web:\n\n`;
  prompt += `URL: ${url}\nJudul: ${title}\nWaktu: ${new Date().toLocaleString('id-ID')}\n\n`;

  prompt += `## KONTEN TEKS\n${content.visibleText.substring(0, 4000)}\n\n`;

  if (content.tables?.length) {
    prompt += `## TABEL\n`;
    content.tables.forEach((t, i) => {
      prompt += `Tabel ${i+1}:\n`;
      t.forEach(row => { prompt += row.join(' | ') + '\n'; });
    });
    prompt += '\n';
  }

  if (styles?.colors?.length) {
    prompt += `## WARNA UTAMA\n`;
    [...new Set(styles.colors.map(c => c.hex))].slice(0,15).forEach(c => {
      prompt += `${c}  `;
    });
    prompt += '\n\n';
  }

  if (styles?.typography?.fonts?.length) {
    prompt += `## FONT\n`;
    styles.typography.fonts.slice(0,3).forEach(f => {
      prompt += `- ${f.family}\n`;
    });
    prompt += '\n';
  }

  if (components?.length) {
    prompt += `## KOMPONEN DITEMUKAN\n`;
    components.forEach(c => { prompt += `- ${c.name}: ${c.count} buah\n`; });
    prompt += '\n';
  }

  return prompt;
}

// ── Entry Point ───────────────────────────────

function extractPageContent(includeStyles = false) {
  const base = {
    url: window.location.href,
    title: document.title,
    content: {
      visibleText: extractVisibleText(),
      forms: extractForms(),
      tables: extractTables(),
      links: extractLinks(),
      images: extractImages(),
      meta: extractMeta()
    }
  };

  if (includeStyles) {
    base.styles = {
      cssVars: extractCSSVariables(),
      colors: extractColors(),
      typography: extractTypography(),
      spacing: extractSpacing(),
      shadows: extractShadows(),
      allCSS: extractAllCSS()
    };
    base.components = extractUIComponents();
    base.layout = extractLayoutInfo();
  }

  return base;
}

// Listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'extract') {
    try {
      const data = extractPageContent(msg.includeStyles || false);
      sendResponse({ success: true, data });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  }
  if (msg.action === 'getPrompt') {
    try {
      const data = extractPageContent(true);
      const prompt = generateAIPrompt(data, msg.promptMode || 'full');
      sendResponse({ success: true, prompt, data });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  }
  return true;
});
