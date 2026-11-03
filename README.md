# 🤖 Web to AI — Browser Extension

Ekstrak konten + design system halaman web, generate prompt siap pakai, dan kirim ke AI apapun via API.

---

## ✨ Fitur

### 🎯 Panel Prompt
Generate prompt otomatis siap langsung di-paste ke AI:
| Mode | Fungsi |
|---|---|
| **Clone Page** | Prompt lengkap untuk rebuild halaman identik (HTML+CSS) |
| **Design System** | Ekstrak warna, font, spacing, CSS variables |
| **Components** | Dokumentasi semua komponen UI + HTML source |
| **UX Analysis** | Analisis desain + saran perbaikan |

### 🎨 Panel Style
- Scan warna (visual swatches, klik untuk copy hex)
- Font families + dimana digunakan
- CSS Variables (`:root`)
- Salin semua style sebagai teks terstruktur
- Salin raw CSS seluruh stylesheet

### 📄 Panel Konten
- Ekstrak teks, tabel, link, form, gambar
- Preview langsung di popup
- Salin ke clipboard

### ⚡ Panel API — Multi-Provider
Kirim langsung ke AI via API dengan support:

| Provider | URL | Format |
|---|---|---|
| **OpenAI** | api.openai.com | OpenAI |
| **Anthropic (Claude)** | api.anthropic.com | Messages API |
| **Google Gemini** | generativelanguage.googleapis.com | Gemini API |
| **Groq** | api.groq.com | OpenAI-compatible |
| **OpenRouter** | openrouter.ai | OpenAI-compatible |
| **Ollama** | localhost:11434 | OpenAI-compatible |
| **Custom** | URL apapun | OpenAI-compatible |

Fitur API panel:
- 🔌 **Test Connection** — cek koneksi & status API
- 📋 **Fetch Model List** — ambil daftar model langsung dari provider, isi dropdown otomatis
- 💾 **Simpan Provider** — simpan multiple konfigurasi (URL + key + model)
- 👁 **Show/Hide API Key**
- Pilih model dari dropdown atau ketik manual

---

## 🚀 Cara Install

1. Buka `chrome://extensions/`
2. Aktifkan **Developer mode** (kanan atas)
3. Klik **Load unpacked**
4. Pilih folder `web-to-ai-extension/`

---

## 📖 Cara Pakai

### Generate Prompt → Paste ke AI
1. Buka halaman web yang ingin dianalisis
2. Klik ikon extension
3. Pilih **mode prompt** (Clone / Style / Component / UX)
4. Pilih **target AI** (ChatGPT / Claude / Gemini)
5. Klik **Generate Prompt** → **Buka AI**
6. Paste! (Ctrl+V / Cmd+V)

### Kirim via API
1. Masuk ke tab **⚡ API**
2. Pilih **provider** (OpenAI, Claude, Gemini, Groq, dll)
3. Isi **Base URL** dan **API Key**
4. Klik **📋 List Model** untuk fetch model tersedia
5. Pilih **mode ekstrak**
6. Klik **⚡ Kirim ke AI**

### Custom Endpoint
1. Pilih provider **⚙️ Custom**
2. Masukkan URL endpoint apapun yang OpenAI-compatible
3. Masukkan API key
4. Klik **💾 Simpan** untuk reuse nanti

---

## 📁 Struktur File

```
web-to-ai-extension/
├── manifest.json     # Konfigurasi (Manifest V3)
├── content.js        # Ekstrak konten + style + generate prompt
├── popup.html        # UI 4 panel
├── popup.js          # Logic: provider manager, API, prompt
├── background.js     # Service worker
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```
