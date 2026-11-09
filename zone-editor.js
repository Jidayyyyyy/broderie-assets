/**
 * <zone-editor> — Custom Element Wix (Velo), page d'administration.
 * L'administratrice dessine sur les photos de chaque produit les zones où le client peut faire broder
 * un texte ou poser un logo (DTF). Les zones sont lues ensuite par <embroidery-preview>.
 *
 * Attributs (pilotés depuis Velo) :
 *   products  JSON  [{ id, name, images: [url, ...] }]
 *   zones     JSON  { [productId]: { views: [{ id, label, image }], zones: [{ id, label, viewId, techniques: ['broderie','dtf'], zone: { x, y, w, h, rot } }] } }
 *                   (ancien format accepté : [{ id, label, mediaIndex, techniques, zone }] → une vue par photo)
 *   saved          n'importe quelle valeur nouvelle → confirme le dernier enregistrement ("error:<message>" en cas d'échec)
 *   upload-result  JSON { requestId, url } ou { requestId, error } → réponse à un import de photo (événement zones-upload)
 *
 * Événements :
 *   zones-save     { productId, views, zones }      → Velo enregistre dans la collection BroderieZones
 *   zones-product  { productId }                    → produit affiché dans l'éditeur
 *   zones-upload   { requestId, name, type, dataUrl } → photo importée par l'administratrice, à enregistrer (Media Manager)
 *
 * Coordonnées en fractions de l'image : centre (x, y), largeur w, hauteur h, rotation rot en degrés.
 * Clavier : flèches = déplacer la zone sélectionnée (Maj = plus vite), Suppr = supprimer.
 */

// Bloc isolé : les constantes du composant ne fuient pas dans la page (plusieurs composants peuvent cohabiter)
{
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Fahkwang:wght@500&family=Josefin+Sans:wght@400;600&display=swap';
const TECHNIQUES = [
  { id: 'broderie', label: 'Broderie', short: 'Broderie', description: 'Prénom ou texte brodé au fil' },
  { id: 'dtf', label: 'Impression DTF', short: 'DTF', description: 'Logo du client imprimé' },
];
const SUGGESTED = ['Cœur', 'Centre poitrine', 'Dos', 'Nuque', 'Manche', 'Bas'];
const VIEW_SUGGESTED = ['Face', 'Dos', 'Côté gauche', 'Côté droit', 'Manche', 'Détail'];
const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
const MIN_SIZE = 0.02;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'zone';
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  draw: svg('<rect x="4.5" y="6.5" width="15" height="11" rx="1" stroke-dasharray="3 2.5"/><path d="M12 10v4M10 12h4"/>'),
  trash: svg('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'),
  check: svg('<path d="m6 12.5 4 4 8-9"/>'),
  photo: svg('<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4"/>'),
  upload: svg('<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v3.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V15"/>'),
  plus: svg('<path d="M12 5.5v13M5.5 12h13"/>'),
};

function ensureFontStylesheet() {
  if (document.querySelector('link[data-embroidery-fonts]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONT_CSS;
  link.dataset.embroideryFonts = '1';
  document.head.appendChild(link);
}

const STYLE = `
:host { display:block; width:100%; container-type:inline-size; color:var(--ze-ink); font-family:var(--ze-font); font-size:15px; line-height:1.5;
  --ze-ink:#5b4d43; --ze-muted:#6f6055; --ze-line:#e6dccd; --ze-bg:#fff8f1; --ze-surface:#ffffff; --ze-stage:#f3ebe1;
  --ze-accent:#a2672d; --ze-accent-soft:#f6eadc; --ze-danger:#a3362b; --ze-success:#4f7a4a;
  --ze-font:"Josefin Sans", "Avenir Next", system-ui, sans-serif; --ze-display:"Fahkwang", Georgia, serif; --ze-radius:6px; }
* { box-sizing:border-box; }
.app { display:grid; grid-template-columns:minmax(0,1fr); gap:20px; background:var(--ze-bg); border:1px solid var(--ze-line);
  border-radius:calc(var(--ze-radius) * 2); padding:20px; }
@container (max-width: 520px) { .app { padding:16px; } }
.head { display:flex; flex-wrap:wrap; align-items:end; justify-content:space-between; gap:8px 16px; }
h2 { margin:0; font-family:var(--ze-display); font-weight:500; font-size:22px; }
@container (min-width: 760px) { h2 { font-size:26px; } }
.sub { margin:2px 0 0; font-size:13.5px; color:var(--ze-muted); }
.body { display:grid; grid-template-columns:minmax(0,1fr); gap:20px; }
.products { display:none; flex-direction:column; gap:6px; }
.product { font:inherit; display:flex; align-items:center; gap:10px; padding:8px; border:1px solid transparent; border-radius:var(--ze-radius);
  background:transparent; color:inherit; cursor:pointer; text-align:left; width:100%; }
.product:hover { background:var(--ze-surface); }
.product[aria-current="true"] { background:var(--ze-surface); border-color:var(--ze-line); box-shadow:inset 3px 0 0 var(--ze-accent); }
.product img { width:44px; height:44px; object-fit:cover; border-radius:4px; background:var(--ze-stage); flex:none; }
.product b { display:block; font-weight:600; font-size:14px; line-height:1.3; }
.product small { color:var(--ze-muted); font-size:12.5px; }
.product .dirty { margin-left:auto; flex:none; font-size:12px; font-style:normal; color:var(--ze-accent); font-weight:600; }
.products-select { display:flex; gap:10px; align-items:center; font-size:14px; }
select { font:inherit; font-size:16px; padding:9px 12px; min-height:44px; border:1px solid var(--ze-line); border-radius:var(--ze-radius); background:var(--ze-surface); color:inherit; min-width:0; flex:1; }
@container (min-width: 760px) { .body { grid-template-columns:minmax(0,1fr) 300px; align-items:start; }
  .inspector { position:sticky; top:16px; max-height:calc(100vh - 110px); overflow-y:auto; overscroll-behavior:contain; } }
@container (min-width: 1080px) { .body { grid-template-columns:220px minmax(0,1fr) 300px; } .products-select { display:none; } .products { display:flex; } }
.canvas-col { display:flex; flex-direction:column; gap:12px; min-width:0; }
.views { display:flex; gap:8px; flex-wrap:wrap; }
.view { font:inherit; display:flex; align-items:center; gap:8px; padding:4px 12px 4px 4px; border:1px solid var(--ze-line); border-radius:999px;
  background:var(--ze-surface); color:inherit; cursor:pointer; font-size:13.5px; min-height:44px; }
.view img { width:34px; height:34px; border-radius:50%; object-fit:cover; background:var(--ze-stage); }
.view[aria-pressed="true"] { border-color:var(--ze-accent); box-shadow:inset 0 0 0 1px var(--ze-accent); background:var(--ze-accent-soft); }
.view .count { color:var(--ze-muted); }
.view-add { font:inherit; display:inline-flex; align-items:center; gap:6px; padding:0 14px; min-height:44px; border:1px dashed #c2926a; border-radius:999px;
  background:transparent; color:var(--ze-accent); cursor:pointer; font-size:13.5px; font-weight:600; }
.view-add svg { width:16px; height:16px; }
.picker { background:var(--ze-surface); border:1px solid var(--ze-line); border-radius:var(--ze-radius); padding:14px; display:flex; flex-direction:column; gap:12px; }
.picker[hidden] { display:none; }
.picker-head { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.picker-head b { font-weight:600; font-size:14px; }
.picker-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(84px,1fr)); gap:8px; }
.pick { position:relative; padding:0; border:1px solid var(--ze-line); border-radius:var(--ze-radius); background:var(--ze-stage); cursor:pointer; aspect-ratio:1; overflow:hidden; }
.pick img { width:100%; height:100%; object-fit:contain; display:block; }
.pick small { position:absolute; left:4px; bottom:4px; font-size:11px; padding:1px 6px; border-radius:999px; background:var(--ze-surface); color:var(--ze-muted); }
.pick:hover { border-color:var(--ze-accent); }
.import { position:relative; display:flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:0 14px; border:1px dashed #c2926a;
  border-radius:var(--ze-radius); color:var(--ze-accent); font-weight:600; font-size:14px; cursor:pointer; }
.import svg { width:18px; height:18px; }
.import input { position:absolute; inset:0; opacity:0; cursor:pointer; }
.import:focus-within { outline:2px solid var(--ze-ink); outline-offset:3px; }
.ghost { font:inherit; font-size:14px; padding:0 12px; min-height:40px; border:0; background:transparent; color:var(--ze-muted); cursor:pointer; border-radius:var(--ze-radius); }
.ghost:hover { background:var(--ze-bg); color:var(--ze-ink); }
.row-actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.outline { font:inherit; font-size:14px; display:inline-flex; align-items:center; gap:6px; padding:0 14px; min-height:44px; border:1px solid var(--ze-line);
  border-radius:999px; background:var(--ze-surface); color:var(--ze-ink); cursor:pointer; }
.outline svg { width:16px; height:16px; }
.outline:hover { border-color:var(--ze-accent); color:var(--ze-accent); }
.stage { position:relative; background:var(--ze-stage); border-radius:var(--ze-radius); overflow:hidden; touch-action:pan-y; user-select:none; cursor:crosshair; outline:none; }
/* Au doigt, la photo défile normalement : seules les zones et leurs poignées captent le geste */
.stage.editing { cursor:default; }
.zone, .handle { touch-action:none; }
.stage img { display:block; width:100%; height:auto; pointer-events:none; }
.stage:focus-visible { box-shadow:0 0 0 2px var(--ze-accent); }
.overlay-hint { position:absolute; left:50%; top:16px; transform:translateX(-50%); display:flex; align-items:center; gap:8px; font-size:13.5px;
  padding:8px 14px; border-radius:999px; background:var(--ze-surface); color:var(--ze-ink); box-shadow:0 1px 4px rgba(91,77,67,.18); pointer-events:none; white-space:nowrap; }
.overlay-hint svg { width:18px; height:18px; color:var(--ze-accent); }
.overlay-hint[hidden] { display:none; }
.zone { position:absolute; border:1.5px dashed #e9c9a6; background:rgba(255,255,255,.15); cursor:move; }
.zone[aria-selected="true"] { border:2px solid var(--ze-accent); background:rgba(162,103,45,.16); }
.zone .tag { position:absolute; left:-1.5px; bottom:calc(100% + 4px); font-size:11px; font-weight:600; color:var(--ze-surface); background:var(--ze-ink);
  padding:2px 8px; border-radius:4px; white-space:nowrap; max-width:160px; overflow:hidden; text-overflow:ellipsis; pointer-events:none; }
.zone.below .tag { bottom:auto; top:calc(100% + 4px); }
.zone[aria-selected="true"] .tag { background:var(--ze-accent); }
.handle { position:absolute; width:16px; height:16px; background:var(--ze-surface); border:2px solid var(--ze-accent); border-radius:50%; }
.handle::after { content:""; position:absolute; inset:-10px; }
@media (pointer:coarse) {
  .handle { width:22px; height:22px; } .handle::after { inset:-12px; }
  .handle[data-h="nw"] { left:-12px; top:-12px; } .handle[data-h="ne"] { right:-12px; top:-12px; }
  .handle[data-h="sw"] { left:-12px; bottom:-12px; } .handle[data-h="se"] { right:-12px; bottom:-12px; }
}
.handle[data-h="nw"] { left:-9px; top:-9px; cursor:nwse-resize; } .handle[data-h="ne"] { right:-9px; top:-9px; cursor:nesw-resize; }
.handle[data-h="sw"] { left:-9px; bottom:-9px; cursor:nesw-resize; } .handle[data-h="se"] { right:-9px; bottom:-9px; cursor:nwse-resize; }
.tip { margin:0; font-size:13px; color:var(--ze-muted); display:flex; flex-direction:column; gap:2px; }
.tip .keys { display:none; }
@media (hover:hover) { .tip .keys { display:block; } .tip .touchtip { display:none; } }
.inspector { display:flex; flex-direction:column; gap:16px; }
.panel { background:var(--ze-surface); border:1px solid var(--ze-line); border-radius:var(--ze-radius); padding:16px; display:flex; flex-direction:column; gap:14px; }
.panel h3 { margin:0; font-family:var(--ze-display); font-weight:500; font-size:17px; }
.panel-head { display:flex; flex-direction:column; align-items:stretch; gap:10px; }
.add { font:inherit; font-size:14px; display:inline-flex; justify-content:center; align-items:center; gap:6px; padding:0 14px; min-height:44px; border:1px solid var(--ze-accent); white-space:nowrap;
  border-radius:999px; background:var(--ze-surface); color:var(--ze-accent); cursor:pointer; font-weight:600; }
.add svg { width:16px; height:16px; }
.add:hover { background:var(--ze-accent-soft); }
.field { display:flex; flex-direction:column; gap:6px; }
.field > span { font-size:13px; font-weight:600; color:var(--ze-ink); }
.field > small { font-size:13px; color:var(--ze-muted); margin-top:-4px; }
.field .err { font-size:13px; color:var(--ze-danger); }
input[type=text] { font:inherit; font-size:16px; padding:9px 12px; min-height:44px; border:1px solid var(--ze-line); border-radius:var(--ze-radius); background:var(--ze-bg); color:inherit; width:100%; }
.suggest { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.suggest > span { font-size:12px; color:var(--ze-muted); margin-right:2px; flex:none; white-space:nowrap; }
@container (max-width: 520px) { .suggest { flex-wrap:nowrap; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; } .suggest::-webkit-scrollbar { display:none; } .suggest button { flex:none; } }
.suggest button { font:inherit; font-size:13px; padding:0 12px; min-height:36px; border:1px solid var(--ze-line); border-radius:999px; background:transparent; color:inherit; cursor:pointer; }
.suggest button:hover { border-color:var(--ze-accent); color:var(--ze-accent); }
@media (pointer:coarse) { .suggest button { min-height:44px; } }
.added { margin:0; font-size:13px; padding:8px 10px; border-radius:var(--ze-radius); background:var(--ze-accent-soft); color:var(--ze-ink); }
.techs { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.tech { position:relative; display:flex; flex-direction:column; gap:2px; padding:10px 12px; border:1px solid var(--ze-line); border-radius:var(--ze-radius); cursor:pointer; background:var(--ze-surface); }
.tech input { position:absolute; opacity:0; inset:0; margin:0; cursor:pointer; }
.tech b { font-weight:600; font-size:13px; display:flex; justify-content:space-between; align-items:center; gap:6px; white-space:nowrap; }
.tech b i { width:18px; height:18px; border-radius:4px; border:1.5px solid var(--ze-line); display:grid; place-items:center; color:var(--ze-surface); }
.tech b i svg { width:14px; height:14px; }
.tech small { color:var(--ze-muted); font-size:13px; }
.tech:has(input:checked) { border-color:var(--ze-accent); background:var(--ze-accent-soft); }
.tech:has(input:checked) b i { background:var(--ze-accent); border-color:var(--ze-accent); }
.tech:has(input:focus-visible) { outline:2px solid var(--ze-accent); outline-offset:2px; }
.range { display:flex; align-items:center; gap:12px; }
.range input { flex:1; accent-color:var(--ze-accent); }
.range output { font-variant-numeric:tabular-nums; min-width:44px; text-align:right; font-size:14px; }
.danger { font:inherit; font-size:14px; display:inline-flex; align-items:center; gap:6px; align-self:flex-start; padding:0 10px; min-height:44px;
  border:0; background:transparent; color:var(--ze-danger); cursor:pointer; border-radius:var(--ze-radius); }
.danger svg { width:18px; height:18px; }
.danger:hover { background:#f9e3df; }
.empty { margin:0; font-size:14px; color:var(--ze-muted); }
.zlist { display:flex; flex-direction:column; gap:4px; }
.zrow { font:inherit; display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:8px 10px; min-height:44px; border:1px solid transparent; border-radius:var(--ze-radius);
  background:transparent; color:inherit; cursor:pointer; font-size:14px; }
.zrow:hover { background:var(--ze-bg); }
.zrow[aria-current="true"] { border-color:var(--ze-accent); background:var(--ze-accent-soft); }
.zrow { flex-wrap:wrap; }
.zrow .name { flex:1 1 90px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.zrow .badges { display:flex; gap:4px; }
.badge { font-size:12px; letter-spacing:.04em; padding:1px 6px; border-radius:999px; border:1px solid var(--ze-line); color:var(--ze-muted); white-space:nowrap; }
.savebar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:12px 16px; border-radius:var(--ze-radius);
  background:var(--ze-surface); border:1px solid var(--ze-line); position:sticky; bottom:12px; box-shadow:0 1px 6px rgba(91,77,67,.08); min-height:68px; }
.savebar { flex-wrap:nowrap; }
.savebar .primary[hidden] { display:none; }
.undo { font:inherit; font-size:14px; font-weight:600; border:0; background:transparent; color:var(--ze-accent); cursor:pointer; min-height:44px; padding:0 8px; text-decoration:underline; text-underline-offset:3px; }
.undo[hidden] { display:none; }
@container (max-width: 520px) {
  .savebar { bottom:0; margin:0 -16px -16px; border-radius:0 0 12px 12px; border-width:1px 0 0; padding:10px 16px calc(10px + env(safe-area-inset-bottom, 0px)); }
  .app { padding-bottom:0; }
}
.detail { scroll-margin-top:12px; scroll-margin-bottom:110px; }
.status { font-size:14px; color:var(--ze-muted); display:flex; align-items:center; gap:8px; flex:1; min-width:0; line-height:1.3; }
.status::before { content:""; width:8px; height:8px; border-radius:50%; background:var(--ze-line); flex:none; }
.status.dirty { color:var(--ze-ink); } .status.dirty::before { background:var(--ze-accent); }
.status.ok { color:var(--ze-success); } .status.ok::before { width:16px; height:16px; background:var(--ze-success);
  -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m6 12.5 4 4 8-9' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat;
  mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m6 12.5 4 4 8-9' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat; border-radius:0; }
.status.error { color:var(--ze-danger); } .status.error::before { background:var(--ze-danger); }
.primary { flex:none; font:inherit; font-size:15px; font-weight:500; letter-spacing:.03em; padding:0 24px; min-height:44px; border:1px solid var(--ze-accent);
  border-radius:999px; background:var(--ze-accent); color:var(--ze-surface); cursor:pointer; }
.primary:disabled { background:transparent; color:var(--ze-muted); border-color:var(--ze-line); cursor:default; }
button:focus-visible, select:focus-visible, input:focus-visible { outline:2px solid var(--ze-ink); outline-offset:3px; }
.zone .tag[hidden] { display:none; }
@media (prefers-reduced-motion: no-preference) { .product, .view, .tech, .zrow, .suggest button { transition:background-color .15s, border-color .15s, color .15s; } }
`;

class ZoneEditor extends HTMLElement {
  static get observedAttributes() {
    return ['products', 'zones', 'saved', 'upload-result'];
  }

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._products = [];
    this._raw = {};
    this._data = {};
    this._dirtyProducts = new Set();
    this._productId = null;
    this._viewId = null;
    this._picker = null;
    this._uploads = new Map();
    this._selected = null;
    this._status = { text: '', kind: '' };
    this._drag = null;
  }

  connectedCallback() {
    ensureFontStylesheet();
    if (!this._built) this._build();
    this._render();
  }

  attributeChangedCallback(name, _old, value) {
    if (name === 'saved') {
      const error = String(value || '').startsWith('error:') ? String(value).slice(6) : '';
      if (!error) this._dirtyProducts.delete(this._savingId);
      this._statusTitle = error;
      this._status = error
        ? { text: "L'enregistrement a échoué. Vos modifications sont conservées, réessayez.", kind: 'error' }
        : { text: 'Zones enregistrées', kind: 'ok' };
      return this._built && this._renderAll();
    }
    let data;
    try {
      data = JSON.parse(value || (name === 'products' ? '[]' : '{}'));
    } catch (e) {
      console.warn(`[zone-editor] ${name} JSON invalide`, e);
      return;
    }
    if (name === 'upload-result') return this._uploadDone(data);
    if (name === 'products') this._products = Array.isArray(data) ? data : [];
    if (name === 'zones') this._raw = data && typeof data === 'object' ? data : {};
    this._data = {};
    if (!this._products.some((p) => p.id === this._productId)) {
      this._productId = this._products[0]?.id ?? null;
      this._viewId = null;
      this._selected = null;
    }
    if (this._built) this._render();
  }

  /* ----- données ----- */

  _product() { return this._products.find((p) => p.id === this._productId); }

  // Vues et zones d'un produit ; l'ancien format (zones liées à un numéro de photo) est converti
  _entry(pid = this._productId) {
    if (this._data[pid]) return this._data[pid];
    const raw = this._raw[pid];
    const images = this._products.find((p) => p.id === pid)?.images || [];
    let entry;
    if (raw && !Array.isArray(raw) && Array.isArray(raw.views)) {
      entry = { views: raw.views.map((v) => ({ ...v })), zones: (raw.zones || []).map((z) => ({ ...z, zone: { ...z.zone } })) };
    } else {
      const old = Array.isArray(raw) ? raw : [];
      // Par défaut : les deux premières photos (Face, Dos), plus celles déjà utilisées par d'anciennes zones
      const used = new Set(old.map((z) => z.mediaIndex || 0));
      const views = images.map((image, i) => ({ id: `vue-${i + 1}`, label: ['Face', 'Dos'][i] || `Vue ${i + 1}`, image }))
        .filter((v, i) => i < 2 || used.has(i));
      const byIndex = (i) => views.find((v) => v.id === `vue-${i + 1}`)?.id || views[0]?.id;
      entry = { views, zones: old.map(({ mediaIndex, ...z }) => ({ ...z, zone: { ...z.zone }, viewId: byIndex(mediaIndex || 0) })) };
    }
    return (this._data[pid] = entry);
  }
  _views(pid) { return this._entry(pid).views; }
  _positions(pid) { return this._entry(pid).zones; }
  _view() { return this._views().find((v) => v.id === this._viewId) || this._views()[0]; }
  _zone(id) { return this._positions().find((z) => z.id === id); }
  _here() { const v = this._view(); return v ? this._positions().filter((z) => z.viewId === v.id) : []; }
  _dirty() { return this._dirtyProducts.has(this._productId); }

  _touch() {
    this._dirtyProducts.add(this._productId);
    this._status = { text: '', kind: '' };
  }

  _addZone(rect) {
    const used = new Set(this._positions().map((z) => z.label));
    const label = SUGGESTED.find((l) => !used.has(l)) || `Zone ${this._positions().length + 1}`;
    let id = slug(label);
    while (this._zone(id)) id += '-2';
    const zone = { id, label, viewId: this._view().id, techniques: TECHNIQUES.map((t) => t.id), zone: { ...rect, rot: 0 } };
    this._positions().push(zone);
    this._selected = id;
    return zone;
  }

  _removeZone(id) {
    const list = this._positions();
    const index = list.findIndex((z) => z.id === id);
    if (index < 0) return;
    // Suppression annulable quelques secondes, sans boîte de confirmation
    this._deleted = { productId: this._productId, zones: [{ zone: list[index], index }] };
    list.splice(index, 1);
    if (this._selected === id) this._selected = null;
    this._afterRemove(`« ${this._deleted.zones[0].zone.label || 'Sans nom'} » supprimée`);
  }

  _removeView(id) {
    const views = this._views(), zones = this._positions();
    const index = views.findIndex((v) => v.id === id);
    if (index < 0) return;
    const removed = zones.map((zone, i) => ({ zone, index: i })).filter((x) => x.zone.viewId === id);
    this._deleted = { productId: this._productId, view: { view: views[index], index }, zones: removed };
    views.splice(index, 1);
    this._entry().zones = zones.filter((z) => z.viewId !== id);
    this._viewId = views[Math.max(0, index - 1)]?.id || null;
    this._selected = null;
    this._render();
    this._afterRemove(`Vue « ${this._deleted.view.view.label} » supprimée`);
  }

  _afterRemove(text) {
    this._touch();
    this._status = { text, kind: 'dirty' };
    clearTimeout(this._undoTimer);
    this._undoTimer = setTimeout(() => {
      this._deleted = null;
      if (this._status.kind === 'dirty') this._status = { text: '', kind: '' };
      this._renderStatus();
    }, 6000);
    this._renderAll();
  }

  _undoRemove() {
    const d = this._deleted;
    if (!d) return;
    clearTimeout(this._undoTimer);
    this._deleted = null;
    if (d.view) this._views(d.productId).splice(d.view.index, 0, d.view.view);
    const zones = this._positions(d.productId);
    for (const { zone, index } of d.zones) zones.splice(index, 0, zone);
    this._dirtyProducts.add(d.productId);
    this._productId = d.productId;
    this._selected = d.view ? null : d.zones[0]?.zone.id;
    this._viewId = d.view ? d.view.view.id : d.zones[0]?.zone.viewId;
    this._status = { text: '', kind: '' };
    this._render();
  }

  _select(id) {
    const zone = this._zone(id);
    if (!zone) return;
    if (id !== this._justAdded) this._justAdded = null;
    this._selected = id;
    if (zone.viewId !== this._view()?.id) {
      this._viewId = zone.viewId;
      return this._render();
    }
    this._renderAll();
  }

  /* ----- interface ----- */

  _build() {
    this._root.innerHTML = `
      <style>${STYLE}</style>
      <div class="app">
        <div class="head">
          <div><h2>Zones de personnalisation</h2><p class="sub">Dessinez sur chaque photo les zones où le client peut faire broder un texte ou poser un logo.</p></div>
        </div>
        <div class="body">
          <nav class="products" aria-label="Produits"></nav>
          <div class="canvas-col">
            <label class="products-select">Produit <select id="product" aria-label="Produit"></select></label>
            <div class="views" role="group" aria-label="Vues du produit"></div>
            <div class="picker" hidden></div>
            <div class="stage" tabindex="0" aria-label="Photo du produit. Glissez pour dessiner une zone ; flèches pour déplacer la zone sélectionnée."></div>
            <p class="tip"><span class="keys">Tracez un rectangle sur la photo pour créer une zone ; tirez les ronds pour l'ajuster. Flèches : déplacer, Suppr : supprimer.</span>
              <span class="touchtip">Touchez « Ajouter une zone », puis déplacez-la du doigt.</span></p>
          </div>
          <div class="inspector">
            <div class="panel detail"></div>
            <div class="panel"><div class="panel-head"><h3>Zones de ce produit</h3>
              <button type="button" class="add">${ICONS.plus}Ajouter une zone</button></div><div class="zlist"></div></div>
          </div>
        </div>
        <div class="savebar">
          <span class="status" role="status"></span>
          <button type="button" class="undo" hidden>Annuler</button>
          <button type="button" class="primary save">Enregistrer</button>
        </div>
      </div>`;
    const $ = (s) => this._root.querySelector(s);
    this._el = {
      products: $('.products'), select: $('#product'), views: $('.views'), picker: $('.picker'), stage: $('.stage'),
      detail: $('.detail'), list: $('.zlist'), save: $('.save'), status: $('.status'), add: $('.add'), undo: $('.undo'),
    };

    const pickProduct = (id) => {
      this._productId = id;
      this._viewId = null;
      this._picker = null;
      this._selected = null;
      this._status = { text: '', kind: '' };
      this._render();
      this.dispatchEvent(new CustomEvent('zones-product', { detail: { productId: id }, bubbles: true, composed: true }));
    };
    this._el.select.addEventListener('change', (e) => pickProduct(e.target.value));
    this._el.products.addEventListener('click', (e) => {
      const b = e.target.closest('.product');
      if (b) pickProduct(b.dataset.id);
    });
    this._el.views.addEventListener('click', (e) => {
      if (e.target.closest('.view-add')) {
        this._picker = this._picker?.mode === 'add' ? null : { mode: 'add' };
        return this._renderPicker();
      }
      const b = e.target.closest('.view');
      if (!b) return;
      this._viewId = b.dataset.view;
      this._selected = null;
      this._render();
    });
    // Choix d'une photo : parmi celles du produit, ou importée
    this._el.picker.addEventListener('click', (e) => {
      if (e.target.closest('.picker-close')) { this._picker = null; return this._renderPicker(); }
      const pick = e.target.closest('.pick');
      if (pick) this._usePhoto(pick.dataset.src);
    });
    this._el.picker.addEventListener('change', (e) => {
      if (e.target.matches('input[type=file]') && e.target.files[0]) this._importPhoto(e.target.files[0]);
    });
    this._el.list.addEventListener('click', (e) => {
      const b = e.target.closest('.zrow');
      if (b) this._select(b.dataset.id);
    });
    this._el.save.addEventListener('click', () => this._save());
    this._el.undo.addEventListener('click', () => this._undoRemove());
    // Ajout d'une zone centrée : seul moyen confortable au doigt (le tracé libre gênerait le défilement)
    this._el.add.addEventListener('click', () => {
      if (!this._view()) return;
      this._justAdded = this._addZone({ x: 0.5, y: 0.4, w: 0.24, h: 0.1 }).id;
      this._touch();
      this._renderAll();
      this._revealDetail();
    });

    // Inspecteur de la zone sélectionnée
    this._el.detail.addEventListener('input', (e) => {
      if (e.target.id === 'view-label') {
        this._view().label = e.target.value;
        this._touch();
        this._renderViewsLabels();
        return this._renderStatus();
      }
      const zone = this._zone(this._selected);
      if (!zone) return;
      if (e.target.id === 'zone-label') zone.label = e.target.value;
      if (e.target.id === 'zone-rot') {
        zone.zone.rot = clamp(Number(e.target.value) || 0, -30, 30);
        this._el.detail.querySelector('output').textContent = zone.zone.rot ? `${zone.zone.rot}°` : 'Droit';
      }
      if (e.target.name === 'tech') {
        const checked = [...this._el.detail.querySelectorAll('input[name=tech]:checked')].map((c) => c.value);
        const err = this._el.detail.querySelector('.err');
        if (!checked.length) {
          e.target.checked = true; // au moins une technique par zone
          err.hidden = false;
          return;
        }
        err.hidden = true;
        zone.techniques = checked;
      }
      this._touch();
      this._renderStage();
      this._renderList();
      this._renderProducts();
      this._renderStatus();
    });
    this._el.detail.addEventListener('click', (e) => {
      const zone = this._zone(this._selected);
      if (!zone) {
        const vs = e.target.closest('[data-view-suggest]');
        if (vs && this._view()) {
          this._view().label = vs.dataset.viewSuggest;
          this._touch();
          return this._render();
        }
        if (e.target.closest('.view-photo')) { this._picker = { mode: 'replace' }; return this._renderPicker(); }
        if (e.target.closest('.view-delete') && this._view()) this._removeView(this._view().id);
        return;
      }
      const s = e.target.closest('[data-suggest]');
      if (s) {
        zone.label = s.dataset.suggest;
        this._touch();
        return this._renderAll();
      }
      if (e.target.closest('.delete')) this._removeZone(zone.id);
    });

    // Dessin, déplacement, redimensionnement à la souris ou au doigt ; clavier pour l'ajustement fin
    const st = this._el.stage;
    st.addEventListener('pointerdown', (e) => this._pointerDown(e));
    st.addEventListener('pointermove', (e) => this._pointerMove(e));
    for (const ev of ['pointerup', 'pointercancel']) st.addEventListener(ev, () => this._pointerUp());
    st.addEventListener('keydown', (e) => this._key(e));
    this._built = true;
  }

  _key(e) {
    const zone = this._zone(this._selected);
    if (!zone) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      return this._removeZone(zone.id);
    }
    const step = e.shiftKey ? 0.02 : 0.004;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const z = zone.zone;
    z.x = Math.round(clamp(z.x + d[0], z.w / 2, 1 - z.w / 2) * 1000) / 1000;
    z.y = Math.round(clamp(z.y + d[1], z.h / 2, 1 - z.h / 2) * 1000) / 1000;
    this._touch();
    this._renderStage();
    this._renderProducts();
    this._renderStatus();
  }

  _point(e) {
    const r = this._el.stage.getBoundingClientRect();
    return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) };
  }

  _pointerDown(e) {
    if (!this._view()) return;
    const p = this._point(e);
    const handle = e.target.closest('.handle');
    const zoneEl = e.target.closest('.zone');
    // Au doigt, pas de tracé libre (il gênerait le défilement) : on utilise « Ajouter une zone »
    if (e.pointerType === 'touch' && !zoneEl) {
      if (this._selected) { this._selected = null; this._renderAll(); }
      return;
    }
    this._el.stage.setPointerCapture(e.pointerId);
    this._el.stage.focus({ preventScroll: true });
    if (zoneEl) {
      const zone = this._zone(zoneEl.dataset.id);
      this._selected = zone.id;
      const z = zone.zone;
      const box = { x0: z.x - z.w / 2, y0: z.y - z.h / 2, x1: z.x + z.w / 2, y1: z.y + z.h / 2 };
      this._drag = handle ? { mode: 'resize', zone, h: handle.dataset.h, box } : { mode: 'move', zone, start: p, from: { x: z.x, y: z.y } };
    } else {
      this._drag = { mode: 'draw', zone: this._addZone({ x: p.x, y: p.y, w: 0, h: 0 }), start: p };
    }
    this._renderAll();
  }

  _pointerMove(e) {
    const d = this._drag;
    if (!d) return;
    const p = this._point(e);
    const z = d.zone.zone;
    if (d.mode === 'draw') {
      Object.assign(z, { x: (d.start.x + p.x) / 2, y: (d.start.y + p.y) / 2, w: Math.abs(p.x - d.start.x), h: Math.abs(p.y - d.start.y) });
    } else if (d.mode === 'move') {
      z.x = clamp(d.from.x + p.x - d.start.x, z.w / 2, 1 - z.w / 2);
      z.y = clamp(d.from.y + p.y - d.start.y, z.h / 2, 1 - z.h / 2);
    } else {
      const b = { ...d.box };
      if (d.h.includes('w')) b.x0 = Math.min(p.x, b.x1 - MIN_SIZE);
      if (d.h.includes('e')) b.x1 = Math.max(p.x, b.x0 + MIN_SIZE);
      if (d.h.includes('n')) b.y0 = Math.min(p.y, b.y1 - MIN_SIZE);
      if (d.h.includes('s')) b.y1 = Math.max(p.y, b.y0 + MIN_SIZE);
      Object.assign(z, { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, w: b.x1 - b.x0, h: b.y1 - b.y0 });
    }
    this._renderStage();
  }

  _pointerUp() {
    const d = this._drag;
    if (!d) return;
    this._drag = null;
    const z = d.zone.zone;
    // Un simple clic sans tracé ne crée pas de zone
    if (d.mode === 'draw' && (z.w < MIN_SIZE || z.h < MIN_SIZE)) {
      this._entry().zones = this._positions().filter((x) => x !== d.zone);
      this._selected = null;
      return this._renderAll();
    }
    for (const k of ['x', 'y', 'w', 'h']) z[k] = Math.round(z[k] * 1000) / 1000;
    if (d.mode !== 'move' || d.from.x !== z.x || d.from.y !== z.y) this._touch();
    this._renderAll();
    if (d.mode === 'draw') {
      this._justAdded = d.zone.id;
      this._renderDetail();
      this._revealDetail();
    }
  }

  // Sur écran étroit, l'inspecteur est sous la photo : on l'amène à l'écran après création
  _revealDetail() {
    if (this.clientWidth >= 760) return;
    requestAnimationFrame(() => requestAnimationFrame(() => this._el.detail.scrollIntoView({ block: 'start', behavior: 'smooth' })));
  }

  _save() {
    if (!this._product()) return;
    if (this._uploads.size) {
      this._status = { text: 'Patientez : une photo est en cours d\u2019import.', kind: 'dirty' };
      return this._renderStatus();
    }
    const views = this._views().map(({ id, label, image }) => ({ id, label: label.trim() || 'Vue', image }));
    const zones = this._positions().map(({ id, label, viewId, techniques, zone }) => ({
      id, label: label.trim() || id, viewId, techniques, zone,
    }));
    this._savingId = this._productId;
    clearTimeout(this._undoTimer);
    this._deleted = null;
    this._status = { text: 'Enregistrement…', kind: '' };
    this._renderStatus();
    this.dispatchEvent(new CustomEvent('zones-save', { detail: { productId: this._productId, views, zones }, bubbles: true, composed: true }));
  }

  /* ----- rendu ----- */

  _render() {
    const product = this._product();
    const view = product && this._view();
    if (view) this._viewId = view.id;
    this._el.select.innerHTML = this._products
      .map((p) => {
        const n = this._positions(p.id).length;
        return `<option value="${escapeHtml(p.id)}"${p.id === this._productId ? ' selected' : ''}>${escapeHtml(p.name)} (${n} zone${n > 1 ? 's' : ''})</option>`;
      })
      .join('');
    this._el.views.innerHTML = product
      ? this._views().map((v) => `<button type="button" class="view" data-view="${escapeHtml(v.id)}" aria-pressed="${v.id === view?.id}">
          <img src="${escapeHtml(v.image)}" alt=""><span class="vname">${escapeHtml(v.label || 'Vue')}</span><span class="count"></span></button>`).join('') +
        `<button type="button" class="view-add">${ICONS.plus}Ajouter une vue</button>`
      : '';
    this._el.stage.innerHTML = view
      ? `<img src="${escapeHtml(view.image)}" alt="Vue « ${escapeHtml(view.label)} » du produit"><div class="zones"></div><div class="overlay-hint">${ICONS.draw}Tracez un rectangle pour créer une zone</div>`
      : `<p class="empty" style="padding:32px;text-align:center">${product ? 'Ajoutez une première vue : une photo du produit (face, dos…), puis dessinez-y les zones.' : 'Aucun produit.'}</p>`;
    this._renderPicker();
    this._renderAll();
  }

  _renderViewsLabels() {
    this._el.views.querySelectorAll('.view').forEach((b) => {
      const v = this._views().find((x) => x.id === b.dataset.view);
      if (v) b.querySelector('.vname').textContent = v.label || 'Vue';
    });
    const img = this._el.stage.querySelector('img');
    if (img && this._view()) img.alt = `Vue « ${this._view().label} » du produit`;
  }

  _renderPicker() {
    const pk = this._picker, product = this._product();
    this._el.picker.hidden = !pk || !product;
    if (!pk || !product) return;
    const used = new Set(this._views().map((v) => v.image));
    this._el.picker.innerHTML = `
      <div class="picker-head"><b>${pk.mode === 'add' ? 'Nouvelle vue : choisissez sa photo' : `Changer la photo de « ${escapeHtml(this._view()?.label || '')} »`}</b>
        <button type="button" class="ghost picker-close">Fermer</button></div>
      ${product.images?.length ? `<div class="picker-grid">${product.images.map((src) => `<button type="button" class="pick" data-src="${escapeHtml(src)}" aria-label="Choisir cette photo">
        <img src="${escapeHtml(src)}" alt="">${used.has(src) ? '<small>déjà utilisée</small>' : ''}</button>`).join('')}</div>` : ''}
      <label class="import">${ICONS.upload}Importer une photo<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Importer une photo pour cette vue"></label>
      <p class="tip">Photo du produit seul, bien cadrée (JPG ou PNG, 15 Mo max).</p>`;
  }

  // Applique une photo : nouvelle vue (nommée selon la suite Face, Dos, Côté…) ou remplacement
  _usePhoto(src, uploadId) {
    const views = this._views();
    if (this._picker?.mode === 'replace' && this._view()) {
      Object.assign(this._view(), { image: src, uploadId });
    } else {
      const used = new Set(views.map((v) => v.label));
      const label = VIEW_SUGGESTED.find((l) => !used.has(l)) || `Vue ${views.length + 1}`;
      let id = slug(label);
      while (views.some((v) => v.id === id)) id += '-2';
      views.push({ id, label, image: src, uploadId });
      this._viewId = id;
    }
    this._picker = null;
    this._selected = null;
    this._touch();
    this._render();
  }

  // Photo importée : affichée tout de suite, enregistrée par Velo (Media Manager) qui renvoie son adresse
  _importPhoto(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      this._status = { text: 'Choisissez une photo JPG, PNG ou WebP.', kind: 'error' };
      return this._renderStatus();
    }
    if (file.size > PHOTO_MAX_BYTES) {
      this._status = { text: 'Photo trop lourde : 15 Mo maximum.', kind: 'error' };
      return this._renderStatus();
    }
    const reader = new FileReader();
    reader.onload = () => {
      const requestId = `up-${Date.now()}`;
      this._uploads.set(requestId, { productId: this._productId });
      this._usePhoto(reader.result, requestId);
      this._status = { text: 'Import de la photo…', kind: 'dirty' };
      this._renderStatus();
      this.dispatchEvent(new CustomEvent('zones-upload', {
        detail: { requestId, name: file.name, type: file.type, dataUrl: reader.result }, bubbles: true, composed: true,
      }));
    };
    reader.readAsDataURL(file);
  }

  _uploadDone({ requestId, url, error }) {
    const up = this._uploads.get(requestId);
    if (!up) return;
    this._uploads.delete(requestId);
    const views = this._views(up.productId);
    const view = views.find((v) => v.uploadId === requestId);
    if (view) {
      delete view.uploadId;
      if (url) view.image = url;
      else views.splice(views.indexOf(view), 1);
    }
    this._status = url ? { text: 'Photo importée', kind: '' } : { text: "L'import de la photo a échoué, réessayez.", kind: 'error' };
    this._render();
  }

  _renderAll() {
    this._renderProducts();
    this._renderStage();
    this._renderDetail();
    this._renderList();
    this._renderStatus();
  }

  _renderProducts() {
    this._el.products.innerHTML = this._products.map((p) => {
      const n = this._positions(p.id).length;
      return `<button type="button" class="product" data-id="${escapeHtml(p.id)}" aria-current="${p.id === this._productId}">
        ${p.images?.[0] ? `<img src="${escapeHtml(p.images[0])}" alt="">` : '<img alt="">'}
        <span><b>${escapeHtml(p.name)}</b><small>${n ? `${n} zone${n > 1 ? 's' : ''}` : 'Aucune zone'}</small></span>
        ${this._dirtyProducts.has(p.id) ? '<i class="dirty">Non enregistré</i>' : ''}
      </button>`;
    }).join('');
    this._el.select.querySelectorAll('option').forEach((o) => {
      const p = this._products.find((x) => x.id === o.value);
      const n = this._positions(o.value).length;
      o.textContent = `${p.name} (${n} zone${n > 1 ? 's' : ''})`;
    });
    // Compteurs des vues
    this._el.views.querySelectorAll('.view').forEach((b) => {
      const n = this._positions().filter((z) => z.viewId === b.dataset.view).length;
      b.querySelector('.count').textContent = `(${n} zone${n > 1 ? 's' : ''})`;
    });
  }

  _renderStage() {
    const layer = this._el.stage.querySelector('.zones');
    if (!layer) return;
    const here = this._here();
    this._el.stage.classList.toggle('editing', !!this._selected || !!this._drag);
    layer.innerHTML = here.map((p) => {
      const z = p.zone;
      const sel = p.id === this._selected;
      const below = (z.y - z.h / 2) * this._el.stage.clientHeight < 26;
      return `<div class="zone${below ? ' below' : ''}" data-id="${escapeHtml(p.id)}" aria-selected="${sel}" style="left:${(z.x - z.w / 2) * 100}%;top:${(z.y - z.h / 2) * 100}%;width:${z.w * 100}%;height:${z.h * 100}%;transform:rotate(${z.rot || 0}deg)">
        <span class="tag"${z.h * this._el.stage.clientHeight < 18 && !sel ? ' hidden' : ''}>${escapeHtml(p.label || 'Sans nom')}</span>
        ${sel ? '<i class="handle" data-h="nw"></i><i class="handle" data-h="ne"></i><i class="handle" data-h="sw"></i><i class="handle" data-h="se"></i>' : ''}
      </div>`;
    }).join('');
    const hint = this._el.stage.querySelector('.overlay-hint');
    if (hint) hint.hidden = here.length > 0 || !!this._drag;
  }

  _renderDetail() {
    const zone = this._zone(this._selected);
    const focused = this._root.activeElement;
    if (focused && focused.matches('input[type=text]') && this._el.detail.contains(focused)) return; // ne pas casser une saisie en cours
    if (!zone) {
      // Aucune zone sélectionnée : réglages de la vue affichée (nom, photo, suppression)
      const view = this._view();
      if (!view) {
        this._el.detail.innerHTML = `<h3>Vues</h3><p class="empty">${this._product() ? 'Ajoutez une vue avec « Ajouter une vue » : une photo du produit, que vous nommez (Face, Dos…).' : 'Aucun produit.'}</p>`;
        return;
      }
      const usedV = new Set(this._views().filter((v) => v !== view).map((v) => v.label));
      const n = this._here().length;
      this._el.detail.innerHTML = `
        <h3>Vue affichée</h3>
        <label class="field"><span>Nom de la vue</span><input type="text" id="view-label" value="${escapeHtml(view.label)}" autocomplete="off"></label>
        <div class="suggest"><span>Suggestions :</span>${VIEW_SUGGESTED.filter((v) => v !== view.label && !usedV.has(v)).map((v) => `<button type="button" data-view-suggest="${escapeHtml(v)}">${escapeHtml(v)}</button>`).join('')}</div>
        <p class="empty">${n ? `${n} zone${n > 1 ? 's' : ''} sur cette vue. Touchez une zone pour la modifier.` : 'Aucune zone sur cette vue : tracez-en une sur la photo ou utilisez « Ajouter une zone ».'}</p>
        <div class="row-actions">
          <button type="button" class="outline view-photo">${ICONS.photo}Changer la photo</button>
          <button type="button" class="danger view-delete">${ICONS.trash}Supprimer la vue</button>
        </div>`;
      return;
    }
    const used = new Set(this._positions().filter((z) => z !== zone).map((z) => z.label));
    this._el.detail.innerHTML = `
      <h3>Modifier la zone</h3>
      ${this._justAdded === zone.id ? `<p class="added">${this.clientWidth < 760 ? 'Zone ajoutée au centre de la photo. Nommez-la ici, puis remontez pour l\u2019ajuster.' : 'Zone ajoutée : nommez-la, puis ajustez-la sur la photo.'}</p>` : ''}
      <label class="field"><span>Nom</span><input type="text" id="zone-label" value="${escapeHtml(zone.label)}" autocomplete="off"></label>
      <div class="suggest"><span>Suggestions :</span>${SUGGESTED.filter((s) => s !== zone.label && !used.has(s)).map((s) => `<button type="button" data-suggest="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}</div>
      <div class="field"><span>Techniques autorisées</span><small>Cochez ce que le client pourra choisir ici (au moins une).</small><div class="techs">
        ${TECHNIQUES.map((t) => `<label class="tech"><input type="checkbox" name="tech" value="${t.id}"${(zone.techniques || []).includes(t.id) ? ' checked' : ''}>
          <b>${t.label}<i>${ICONS.check}</i></b><small>${t.description}</small></label>`).join('')}
      </div><span class="err" role="alert" hidden>Gardez au moins une technique.</span></div>
      <label class="field"><span>Inclinaison</span><div class="range">
        <input type="range" id="zone-rot" min="-30" max="30" step="1" value="${zone.zone.rot || 0}" aria-label="Inclinaison en degrés"><output>${zone.zone.rot ? `${zone.zone.rot}°` : 'Droit'}</output>
      </div></label>
      <button type="button" class="danger delete">${ICONS.trash}Supprimer la zone</button>`;
  }

  _renderList() {
    const zones = this._positions();
    this._el.list.innerHTML = zones.length
      ? zones.map((p) => `<button type="button" class="zrow" data-id="${escapeHtml(p.id)}" aria-current="${p.id === this._selected}">
          <span class="name">${escapeHtml(p.label || 'Sans nom')}</span>
          <span class="badges">${(p.techniques || []).map((t) => `<span class="badge">${TECHNIQUES.find((x) => x.id === t)?.short || t}</span>`).join('')}</span>
          <span class="badge">${escapeHtml(this._views().find((v) => v.id === p.viewId)?.label || 'Vue')}</span></button>`).join('')
      : '<p class="empty">Aucune zone pour ce produit.</p>';
  }

  _renderStatus() {
    const dirty = this._dirty();
    this._el.save.hidden = !dirty || !this._product();
    this._el.save.textContent = 'Enregistrer';
    this._el.undo.hidden = !this._deleted || this._deleted.productId !== this._productId;
    this._el.status.title = this._status.kind === 'error' ? this._statusTitle || '' : '';
    const { text, kind } = this._status;
    this._el.status.textContent = text || (dirty ? 'Non enregistré' : 'Tout est enregistré');
    this._el.status.className = `status ${text ? kind : dirty ? 'dirty' : 'ok'}`;
    this._el.status.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  }
}

if (!customElements.get('zone-editor')) {
  customElements.define('zone-editor', ZoneEditor);
}
}
