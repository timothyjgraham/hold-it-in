// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Internationalization (i18n) Module                          ║
// ║  Flat dot-notation keys, {{var}} interpolation, dynamic font switching.   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import en from './data/locales/en.js';

// ─── LANGUAGE REGISTRY ──────────────────────────────────────────────────────

export const LANGUAGES = [
    { code: 'en',     name: 'English',              nativeName: 'English',     font: 'bangers' },
    { code: 'zh-CN',  name: 'Simplified Chinese',   nativeName: '简体中文',     font: 'noto-sc' },
    { code: 'ru',     name: 'Russian',              nativeName: 'Русский',     font: 'noto' },
    { code: 'es',     name: 'Spanish (Spain)',       nativeName: 'Español',     font: 'bangers' },
    { code: 'pt-BR',  name: 'Portuguese (Brazil)',   nativeName: 'Português (BR)', font: 'bangers' },
    { code: 'de',     name: 'German',               nativeName: 'Deutsch',     font: 'bangers' },
    { code: 'ja',     name: 'Japanese',             nativeName: '日本語',       font: 'noto-jp' },
    { code: 'fr',     name: 'French',               nativeName: 'Français',    font: 'bangers' },
    { code: 'ko',     name: 'Korean',               nativeName: '한국어',       font: 'noto-kr' },
    { code: 'pl',     name: 'Polish',               nativeName: 'Polski',      font: 'bangers' },
    { code: 'zh-TW',  name: 'Traditional Chinese',  nativeName: '繁體中文',     font: 'noto-tc' },
    { code: 'tr',     name: 'Turkish',              nativeName: 'Türkçe',      font: 'bangers' },
    { code: 'th',     name: 'Thai',                 nativeName: 'ไทย',         font: 'noto-thai' },
    { code: 'uk',     name: 'Ukrainian',            nativeName: 'Українська',  font: 'noto' },
    { code: 'es-419', name: 'Spanish (LatAm)',      nativeName: 'Español (LA)', font: 'bangers' },
    { code: 'it',     name: 'Italian',              nativeName: 'Italiano',    font: 'bangers' },
    { code: 'cs',     name: 'Czech',                nativeName: 'Čeština',     font: 'bangers' },
    { code: 'hu',     name: 'Hungarian',            nativeName: 'Magyar',      font: 'bangers' },
    { code: 'pt',     name: 'Portuguese (Portugal)', nativeName: 'Português (PT)', font: 'bangers' },
    { code: 'nl',     name: 'Dutch',                nativeName: 'Nederlands',  font: 'bangers' },
];

// ─── FONT CONFIG ────────────────────────────────────────────────────────────

const FONT_FAMILIES = {
    'bangers':    "'Bangers', 'Impact', 'Arial Black', sans-serif",
    'noto':       "'Noto Sans', sans-serif",
    'noto-sc':    "'Noto Sans SC', sans-serif",
    'noto-tc':    "'Noto Sans TC', sans-serif",
    'noto-jp':    "'Noto Sans JP', sans-serif",
    'noto-kr':    "'Noto Sans KR', sans-serif",
    'noto-thai':  "'Noto Sans Thai', sans-serif",
};

// Canvas font equivalents (no quotes around family names for canvas)
const CANVAS_FONTS = {
    'bangers':    'Bangers, Impact, sans-serif',
    'noto':       'Noto Sans, sans-serif',
    'noto-sc':    'Noto Sans SC, sans-serif',
    'noto-tc':    'Noto Sans TC, sans-serif',
    'noto-jp':    'Noto Sans JP, sans-serif',
    'noto-kr':    'Noto Sans KR, sans-serif',
    'noto-thai':  'Noto Sans Thai, sans-serif',
};

// ─── STATE ──────────────────────────────────────────────────────────────────

let _currentLang = 'en';
let _strings = en;           // Active translation strings
let _fontKey = 'bangers';    // Current font key
let _fontsLoaded = {};       // Track which font families have been loaded
const STORAGE_KEY = 'holditin_language';

// ─── CORE API ───────────────────────────────────────────────────────────────

/**
 * Translate a key, with optional {{var}} interpolation.
 * Falls back to English if key is missing in current locale.
 * @param {string} key - Dot-notation key (e.g. 'hud.wave')
 * @param {Object} [params] - Interpolation params (e.g. { n: 5 })
 * @returns {string}
 */
export function t(key, params) {
    let str = _strings[key];
    if (str === undefined) {
        // Fallback to English
        str = en[key];
    }
    if (str === undefined) {
        // Key not found at all — return the key itself for debugging
        console.warn(`[i18n] Missing key: ${key}`);
        return key;
    }
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
        }
    }
    return str;
}

/**
 * Set the active language. Loads the locale module dynamically.
 * @param {string} lang - Language code (e.g. 'en', 'zh-CN')
 * @returns {Promise<void>}
 */
export async function setLanguage(lang) {
    const langInfo = LANGUAGES.find(l => l.code === lang);
    if (!langInfo) {
        console.warn(`[i18n] Unknown language: ${lang}`);
        return;
    }

    if (lang === 'en') {
        _strings = en;
    } else {
        try {
            const module = await import(`./data/locales/${lang}.js`);
            _strings = module.default;
        } catch (e) {
            console.warn(`[i18n] Failed to load locale ${lang}, falling back to English`, e);
            _strings = en;
            lang = 'en';
        }
    }

    _currentLang = lang;
    _fontKey = langInfo.font;

    // Persist
    try {
        localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) { /* ignore */ }

    // Update body class for CSS font overrides
    _updateBodyClass(lang);

    // Load non-Latin fonts if needed
    if (_fontKey !== 'bangers') {
        await _loadFont(_fontKey);
    }

    // Update all data-i18n DOM elements
    applyHTMLTranslations();
}

/**
 * Get the current language code.
 * @returns {string}
 */
export function getLanguage() {
    return _currentLang;
}

/**
 * Get a canvas-ready font string for the current language.
 * @param {number} size - Font size in px
 * @param {boolean} [bold=false] - Whether to use bold weight
 * @returns {string} e.g. "bold 48px Bangers, Impact, sans-serif"
 */
export function getCanvasFont(size, bold) {
    const weight = bold ? 'bold ' : '';
    const family = CANVAS_FONTS[_fontKey] || CANVAS_FONTS['bangers'];
    return `${weight}${size}px ${family}`;
}

/**
 * Scan the DOM for elements with data-i18n attributes and update their text.
 * Supports:
 *   data-i18n="key"            → textContent
 *   data-i18n-html="key"       → innerHTML
 *   data-i18n-tip-name="key"   → data-tip-name attribute
 *   data-i18n-tip-desc="key"   → data-tip-desc attribute
 *   data-i18n-placeholder="key" → placeholder attribute
 */
export function applyHTMLTranslations() {
    // Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
    });

    // HTML content
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) el.innerHTML = t(key);
    });

    // Tooltip name
    document.querySelectorAll('[data-i18n-tip-name]').forEach(el => {
        const key = el.getAttribute('data-i18n-tip-name');
        if (key) el.setAttribute('data-tip-name', t(key));
    });

    // Tooltip description
    document.querySelectorAll('[data-i18n-tip-desc]').forEach(el => {
        const key = el.getAttribute('data-i18n-tip-desc');
        if (key) el.setAttribute('data-tip-desc', t(key));
    });
}

/**
 * Initialize i18n: detect language from localStorage or navigator, then load.
 * @returns {Promise<void>}
 */
export async function initI18n() {
    let lang = 'en';

    // Check localStorage
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && LANGUAGES.some(l => l.code === stored)) {
            lang = stored;
        }
    } catch (e) { /* ignore */ }

    // Auto-detect from browser if no stored preference
    if (lang === 'en' && !localStorage.getItem(STORAGE_KEY)) {
        const browserLang = navigator.language || navigator.userLanguage || 'en';
        // Try exact match first
        if (LANGUAGES.some(l => l.code === browserLang)) {
            lang = browserLang;
        } else {
            // Try prefix match (e.g. 'de-DE' → 'de')
            const prefix = browserLang.split('-')[0];
            const match = LANGUAGES.find(l => l.code === prefix || l.code.startsWith(prefix + '-'));
            if (match) lang = match.code;
        }
    }

    await setLanguage(lang);
}

// ─── INTERNAL HELPERS ───────────────────────────────────────────────────────

function _updateBodyClass(lang) {
    // Remove all lang- classes
    const body = document.body;
    const classes = Array.from(body.classList).filter(c => c.startsWith('lang-'));
    classes.forEach(c => body.classList.remove(c));

    // Add current language class
    if (lang !== 'en') {
        body.classList.add(`lang-${lang}`);
    }
}

// Google Fonts CDN URLs for non-Latin fonts (loaded on demand)
const GOOGLE_FONT_URLS = {
    'noto':       'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap',
    'noto-sc':    'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap',
    'noto-tc':    'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap',
    'noto-jp':    'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap',
    'noto-kr':    'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap',
    'noto-thai':  'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700&display=swap',
};

async function _loadFont(fontKey) {
    if (_fontsLoaded[fontKey]) return;
    _fontsLoaded[fontKey] = true;

    // Inject Google Fonts CDN stylesheet if available
    const cdnUrl = GOOGLE_FONT_URLS[fontKey];
    if (cdnUrl) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cdnUrl;
        document.head.appendChild(link);
    }

    const family = CANVAS_FONTS[fontKey];
    if (!family) return;

    // Wait for font to be available
    const familyName = family.split(',')[0].trim();
    try {
        await document.fonts.load(`16px ${familyName}`);
    } catch (e) {
        console.warn(`[i18n] Font load failed for ${familyName}`, e);
    }
}
