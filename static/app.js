'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
let currentFile = null;
let currentTab  = 'text';
let lastResult  = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const elTextInput    = $('text-input');
const elTypeBadge    = $('type-badge');
const elTypeLabel    = $('type-label');
const elResearchBtn  = $('research-btn');
const elBtnSpinner   = $('btn-spinner');
const elBtnLabel     = $('btn-label');
const elBtnArrow     = $('btn-arrow');
const elDropZone     = $('drop-zone');
const elDropIdle     = $('drop-idle');
const elDropPreview  = $('drop-preview');
const elPreviewImg   = $('preview-img');
const elFileInput    = $('file-input');
const elRemoveImg    = $('remove-img');
const elBrowseBtn    = $('browse-btn');

const elLoadingCard  = $('loading-card');
const elErrorCard    = $('error-card');
const elErrorMsg     = $('error-msg');
const elRetryBtn     = $('retry-btn');
const elResultsSec   = $('results-section');
const elResultsMeta  = $('results-meta');

const steps = ['step-detect', 'step-enrich', 'step-web', 'step-reddit', 'step-kym', 'step-synth'];

// ─── Input Type Detection ─────────────────────────────────────────────────────
const PLATFORM_MAP = {
  twitter:   { pattern: /twitter\.com|x\.com\/\w+\/status/i,           label: 'X / Twitter', emoji: '🐦' },
  instagram: { pattern: /instagram\.com/i,                              label: 'Instagram',   emoji: '📸' },
  facebook:  { pattern: /facebook\.com|fb\.com|fb\.watch/i,            label: 'Facebook',    emoji: '📘' },
  tiktok:    { pattern: /tiktok\.com/i,                                 label: 'TikTok',      emoji: '🎵' },
  reddit:    { pattern: /reddit\.com|redd\.it/i,                       label: 'Reddit',      emoji: '👽' },
  youtube:   { pattern: /youtube\.com|youtu\.be/i,                     label: 'YouTube',     emoji: '📺' },
};

function clientDetectType(text) {
  text = text.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) {
    for (const [key, meta] of Object.entries(PLATFORM_MAP)) {
      if (meta.pattern.test(text)) return { type: key, label: meta.label, emoji: meta.emoji };
    }
    return { type: 'url', label: 'URL', emoji: '🔗' };
  }
  return { type: 'text', label: 'Text / Caption / Name', emoji: '💬' };
}

elTextInput.addEventListener('input', () => {
  const val = elTextInput.value;
  const detected = clientDetectType(val);
  if (detected) {
    elTypeLabel.textContent = `${detected.emoji} ${detected.label}`;
    elTypeBadge.style.display = 'inline-flex';
  } else {
    elTypeBadge.style.display = 'none';
  }
});

// ─── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    currentTab = tab.dataset.tab;

    $('panel-text').style.display  = currentTab === 'text'  ? 'block' : 'none';
    $('panel-image').style.display = currentTab === 'image' ? 'block' : 'none';
  });
});

// ─── Image Upload ─────────────────────────────────────────────────────────────
elBrowseBtn.addEventListener('click', () => elFileInput.click());

elFileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) setImageFile(file);
});

elDropZone.addEventListener('click', e => {
  if (currentFile) return;
  if (e.target === elDropZone || e.target.closest('#drop-idle')) {
    elFileInput.click();
  }
});

elDropZone.addEventListener('dragover', e => {
  e.preventDefault();
  elDropZone.classList.add('drag-over');
});

elDropZone.addEventListener('dragleave', () => elDropZone.classList.remove('drag-over'));

elDropZone.addEventListener('drop', e => {
  e.preventDefault();
  elDropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) setImageFile(file);
});

elRemoveImg.addEventListener('click', e => {
  e.stopPropagation();
  clearImage();
});

function setImageFile(file) {
  currentFile = file;
  const url = URL.createObjectURL(file);
  elPreviewImg.src = url;
  elDropIdle.style.display    = 'none';
  elDropPreview.style.display = 'block';
}

function clearImage() {
  currentFile = null;
  elPreviewImg.src            = '';
  elFileInput.value           = '';
  elDropIdle.style.display    = 'flex';
  elDropPreview.style.display = 'none';
}

// ─── Loading Steps Animation ──────────────────────────────────────────────────
let stepInterval = null;
let currentStep  = 0;

function startStepAnimation() {
  currentStep = 0;
  steps.forEach(id => {
    const el = $(id);
    el.classList.remove('active', 'done');
  });
  advanceStep();
  stepInterval = setInterval(() => {
    if (currentStep < steps.length - 1) advanceStep();
  }, 2200);
}

function advanceStep() {
  if (currentStep > 0) {
    $(steps[currentStep - 1]).classList.remove('active');
    $(steps[currentStep - 1]).classList.add('done');
  }
  if (currentStep < steps.length) {
    $(steps[currentStep]).classList.add('active');
    currentStep++;
  }
}

function finishSteps() {
  clearInterval(stepInterval);
  steps.forEach(id => {
    const el = $(id);
    el.classList.remove('active');
    el.classList.add('done');
  });
}

function stopStepAnimation() {
  clearInterval(stepInterval);
  steps.forEach(id => {
    const el = $(id);
    el.classList.remove('active', 'done');
  });
}

// ─── UI State Helpers ──────────────────────────────────────────────────────────
function showLoading() {
  elLoadingCard.style.display  = 'block';
  elLoadingCard.classList.add('fade-in');
  elErrorCard.style.display    = 'none';
  elResultsSec.style.display   = 'none';
  setButtonLoading(true);
  startStepAnimation();
}

function showError(msg) {
  finishSteps();
  setButtonLoading(false);
  elLoadingCard.style.display = 'none';
  elErrorCard.style.display   = 'flex';
  elErrorCard.classList.add('fade-in');
  elErrorMsg.textContent = msg;
}

function hideAll() {
  elLoadingCard.style.display = 'none';
  elErrorCard.style.display   = 'none';
  elResultsSec.style.display  = 'none';
  stopStepAnimation();
}

function setButtonLoading(loading) {
  elResearchBtn.disabled           = loading;
  elBtnSpinner.style.display       = loading ? 'block'  : 'none';
  elBtnArrow.style.display         = loading ? 'none'   : 'block';
  elBtnLabel.textContent           = loading ? 'Researching…' : 'Research It';
}

// ─── Verdict Config ───────────────────────────────────────────────────────────
const VERDICTS = {
  early: { emoji: '🌱', label: 'EARLY' },
  mid:   { emoji: '🔥', label: 'MID'   },
  late:  { emoji: '📉', label: 'LATE'  },
  dead:  { emoji: '💀', label: 'DEAD'  },
};

// ─── Render Results ───────────────────────────────────────────────────────────
function renderResults(data, meta) {
  lastResult = data;

  finishSteps();
  setButtonLoading(false);
  elLoadingCard.style.display = 'none';

  // Meta row
  const typeMap = {
    image: '🖼️ Image', twitter: '🐦 Twitter/X', instagram: '📸 Instagram',
    facebook: '📘 Facebook', tiktok: '🎵 TikTok', reddit: '👽 Reddit',
    youtube: '📺 YouTube', url: '🔗 URL', text: '💬 Text',
  };
  elResultsMeta.innerHTML = [
    `<span>Input: <strong>${typeMap[meta.input_type] || meta.input_type}</strong></span>`,
    `<span class="meta-chip">⚡ ${meta.elapsed_seconds}s</span>`,
    `<span class="meta-chip">🌐 ${meta.sources_searched} sources</span>`,
    meta.search_queries?.length
      ? `<span class="meta-chip" title="${meta.search_queries.join(' | ')}">🔍 ${meta.search_queries.length} queries</span>`
      : '',
  ].join('');

  // Name
  $('r-name').textContent = data.name || 'Unknown';

  // Verdict
  const v = (data.verdict || 'mid').toLowerCase();
  const vd = VERDICTS[v] || VERDICTS.mid;
  const vEl = $('r-verdict');
  vEl.className = `verdict-badge ${v}`;
  vEl.innerHTML = `${vd.emoji} ${vd.label}`;

  // Fields
  $('r-what').textContent         = data.what_it_is      || '—';
  $('r-source').textContent       = data.original_source  || '—';
  $('r-earliest').textContent     = data.earliest_post_found || '—';
  $('r-lore').textContent         = data.lore             || '—';
  $('r-viral').textContent        = data.why_viral        || '—';
  $('r-flags').textContent        = data.red_flags        || 'None found';
  $('r-verdict-reason').textContent = data.verdict_reason || '—';

  // Links
  const linksEl = $('r-links');
  linksEl.innerHTML = '';
  const links = Array.isArray(data.best_links) ? data.best_links : [];
  if (links.length === 0) {
    linksEl.innerHTML = '<span style="color:var(--text-dim);font-size:0.85rem">No links found</span>';
  } else {
    links.forEach(url => {
      if (!url || typeof url !== 'string') return;
      const a = document.createElement('a');
      a.href          = url;
      a.className     = 'link-item';
      a.target        = '_blank';
      a.rel           = 'noopener noreferrer';
      a.textContent   = url.replace(/^https?:\/\//, '').slice(0, 80) + (url.length > 88 ? '…' : '');
      a.title         = url;
      linksEl.appendChild(a);
    });
  }

  // Confidence badge
  const conf = (data.confidence || 'medium').toLowerCase();
  const confEl = $('confidence-badge');
  confEl.className = `confidence-badge ${conf}`;
  confEl.textContent = `${conf} confidence`;

  // Show section
  elResultsSec.style.display = 'block';
  elResultsSec.classList.add('slide-in');
  elResultsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Copy Report ──────────────────────────────────────────────────────────────
$('copy-btn').addEventListener('click', () => {
  if (!lastResult) return;
  const d = lastResult;
  const links = Array.isArray(d.best_links) ? d.best_links.join('\n  ') : '';
  const text = [
    `== VIRAL LORE AGENT REPORT ==`,
    ``,
    `Name:             ${d.name}`,
    `What it is:       ${d.what_it_is}`,
    `Original source:  ${d.original_source}`,
    `Earliest post:    ${d.earliest_post_found}`,
    ``,
    `Lore:`,
    `  ${d.lore}`,
    ``,
    `Why it went viral:`,
    `  ${d.why_viral}`,
    ``,
    `Best links:`,
    `  ${links}`,
    ``,
    `Red flags:        ${d.red_flags}`,
    `Verdict:          ${(d.verdict || '').toUpperCase()} — ${d.verdict_reason}`,
    `Confidence:       ${d.confidence}`,
  ].join('\n');

  navigator.clipboard.writeText(text).then(() => {
    const btn = $('copy-btn');
    btn.innerHTML = '<span>✅</span> Copied!';
    setTimeout(() => { btn.innerHTML = '<span>📋</span> Copy Report'; }, 2000);
  }).catch(() => {
    alert('Could not copy to clipboard.');
  });
});

// ─── New Search ───────────────────────────────────────────────────────────────
$('new-search-btn').addEventListener('click', () => {
  hideAll();
  elTextInput.value = '';
  elTypeBadge.style.display = 'none';
  clearImage();
  lastResult = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

elRetryBtn.addEventListener('click', () => {
  elErrorCard.style.display = 'none';
  doResearch();
});

// ─── Main Research ────────────────────────────────────────────────────────────
elResearchBtn.addEventListener('click', doResearch);

elTextInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doResearch();
});

async function doResearch() {
  const inputText  = elTextInput.value.trim();
  const hasFile    = !!currentFile;
  const activeTab  = currentTab;

  if (activeTab === 'text' && !inputText) {
    elTextInput.focus();
    elTextInput.style.borderColor = 'var(--red)';
    setTimeout(() => { elTextInput.style.borderColor = ''; }, 1500);
    return;
  }

  if (activeTab === 'image' && !hasFile) {
    elDropZone.style.borderColor = 'var(--red)';
    setTimeout(() => { elDropZone.style.borderColor = ''; }, 1500);
    return;
  }

  showLoading();

  try {
    const formData = new FormData();

    if (activeTab === 'image' && currentFile) {
      formData.append('file', currentFile, currentFile.name);
      formData.append('input_text', '');
    } else {
      formData.append('input_text', inputText);
    }

    const resp = await fetch('/api/analyze', {
      method: 'POST',
      body:   formData,
    });

    const json = await resp.json();

    if (!resp.ok) {
      throw new Error(json.detail || `Server error ${resp.status}`);
    }

    if (json.ok && json.result) {
      renderResults(json.result, json.meta);
    } else {
      throw new Error('Unexpected response from server.');
    }

  } catch (err) {
    showError(err.message || 'Something went wrong. Check your network and try again.');
  }
}

// ─── Initial health check ─────────────────────────────────────────────────────
(async () => {
  try {
    const r = await fetch('/health');
    const d = await r.json();
    if (!d.openai_configured) {
      const warn = document.createElement('div');
      warn.style.cssText = [
        'background:rgba(245,158,11,0.12)',
        'border:1px solid rgba(245,158,11,0.4)',
        'border-radius:10px',
        'padding:12px 16px',
        'font-size:0.85rem',
        'color:#fbbf24',
        'margin-bottom:20px',
      ].join(';');
      warn.innerHTML = '⚠️ <strong>OpenAI API key not configured.</strong> Add <code style="font-family:monospace;background:rgba(0,0,0,0.3);padding:1px 5px;border-radius:4px">OPENAI_API_KEY=sk-...</code> to your <code style="font-family:monospace;background:rgba(0,0,0,0.3);padding:1px 5px;border-radius:4px">.env</code> file and restart the server.';
      document.querySelector('.input-card').prepend(warn);
    }
  } catch (e) {
    // Server not reachable — ignore
  }
})();
