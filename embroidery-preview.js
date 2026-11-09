/**
 * <embroidery-preview> — Custom Element Wix (Velo)
 * Prévisualisation d'une broderie (point satin) incrustée sur une photo de vêtement.
 *
 * Attributs (pilotés depuis Velo via $w('#el').setAttribute(...)) :
 *   config            JSON  { image, positions[], colors[], fonts[], maxLines, maxChars, defaultText, accent }
 *   state             JSON  état partiel { text, fontId, colorId, positionId, sizeId } (optionnel)
 *   debug             "true" → affiche les zones de broderie (calibrage)
 *   controls          "false" → masque l'UI intégrée (pilotage 100 % Velo via `state`)
 *   request-snapshot  n'importe quelle valeur nouvelle → émet `embroidery-snapshot`
 *
 * Événements (écoutés dans Velo via $w('#el').on(name, e => e.detail)) :
 *   embroidery-change    { text, lines, font, color, position, size, valid, summary }
 *   embroidery-snapshot  { dataUrl } | { error }
 */

// Bloc isolé : les constantes du composant ne fuient pas dans la page (plusieurs composants peuvent cohabiter)
{
// Polices web : uniquement pour l'aperçu des boutons. La broderie utilise les polices numérisées (stitches).
// Typographies de l'interface (identité Mes Premiers Rêves). La broderie utilise les polices numérisées (stitches).
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Fahkwang:wght@500&family=Josefin+Sans:wght@400;600&display=swap';

// Polices de broderie proposées par défaut (points dans fonts/<id>.json) ; surchargeables par config.fonts
const DEFAULT_FONTS = [
  // Polices d'Anaïs, numérisées automatiquement par tools/build_fonts.sh
  { id: 'noteworthy', label: 'Noteworthy', family: 'Noteworthy', weight: 400, stitches: 'noteworthy.json' },
  { id: 'odstemplik', label: 'Odstemplik', family: 'system-ui', weight: 400, stitches: 'odstemplik.json' },
  { id: 'unicorn-calligraphy', label: 'Unicorn Calligraphy', family: 'system-ui', weight: 400, stitches: 'unicorn-calligraphy.json' },
  { id: 'vampire-calligraphy', label: 'Vampire Calligraphy', family: 'system-ui', weight: 400, stitches: 'vampire-calligraphy.json' },
];

// Nuancier Madeira Rayon (réf|nom|couleur approchée), d'après la palette Ink/Stitch « Madeira Rayon »
const MADEIRA_RAYON =
  '1000|Black|28292a;1001|Bright White|e3e5fb;1002|Bright White|e7e7f4;1003|Natural White|e9e7e7;1004|Blue Blush|' +
  'eae8ee;1005|Billowing Sail|e0e4ff;1006|Diamond Black|29282a;1007|Black|2a2829;1008|Ruby Black|282a2c;1009|Sapp' +
  'hire Black|2b2b30;1010|Vapor|c2c4bf;1011|Traditional Gray|a9afb2;1012|Whisper Grey|a3afb3;1013|Rosewater|eed1c' +
  'a;1014|Orchid Pink|eeb2bc;1015|Desert Bloom|e9b3b1;1016|Emily Pink|ea9595;1017|Peach|f4bcac;1018|Flesh Pink|f0' +
  'b4a8;1019|Flesh Pink|e9aca5;1020|Flamingo|f7887d;1021|Old Dark Tex Orange|ba522f;1022|Medium Yellow|eae3b9;102' +
  '3|Lemon|f3da68;1024|Buttercup|ffa617;1025|Pollen Gold|cd8126;1026|Glow|f4bc8b;1027|Cadet Blue|9abaca;1028|Cari' +
  'bbean Blue|5a89aa;1029|Dolphin Blue|2e89bd;1030|Lake Blue|94a9c2;1031|Carnatio|c7a1bf;1032|Iris|816c9d;1033|Mu' +
  'lberry|6e4981;1034|Burgundy|994262;1035|Warm Wine|632f3d;1036|Dark Sepia|593032;1037|Tuxedo Red|be1422;1038|Re' +
  'd Bittersweet|8c2f33;1039|Red Berry|a12831;1040|Silvery Gray|8a8689;1041|Metal|6e747b;1042|Imperial Blue|214f7' +
  '7;1043|Black|2c3445;1044|Navy|2e313e;1045|Seafrost|86ccbf;1046|Pale Green|4fac98;1047|Mint|9ebda2;1048|Green D' +
  'ust|7b9553;1049|Spruce|6fa04d;1050|Emerald|459645;1051|Kelly|008745;1052|Imperial Aqua|397474;1053|Peach|e7b7a' +
  '5;1054|Tawny Birch|ac837a;1055|Cream|d4b18f;1056|Wicker|9e6947;1057|Fawn|a07155;1058|Mushroom|71463b;1059|Egyp' +
  'tian Brown|423734;1060|Platinum|b3a697;1061|Wheat|f4daab;1062|Pale Grey|8d867a;1063|Medium Green / Yellow|7c76' +
  '69;1064|Daffodil|ffc71d;1065|Mango|e57821;1066|Pale Yellow|f5d6a1;1067|Sunshine|f0dda6;1068|Canary|ffbc16;1069' +
  '|Manila|ffb104;1070|Yellow Gold|d2a970;1071|Natural White|e9e5dc;1072|Aspen White|dcd2bd;1073|Billowing Sail|c' +
  'cdbcf;1074|Ice Blue|95b5cf;1075|Baby Blue|84a8c8;1076|Blue|005796;1077|Paprika|e2433d;1078|Paprika|ed532a;1079' +
  '|Kelly|00874f;1080|Medium Pink|a67da9;1081|Wildfire|ba3051;1082|Ivory|cdbaa6;1083|Moonbeam|face5a;1084|Sea Mis' +
  't|d2b99d;1085|White Sand|b8b5af;1086|Palest Ivory|c7c9c6;1087|Pearl Gray|bcbcb8;1088|Aquamarine|61a9ac;1089|Ba' +
  'sic Turquoise|6ca9b2;1090|M. D. Green|148589;1091|Dark Aqua Green|007080;1092|Cadet Blue|93c2d1;1093|Indian Oc' +
  'ean Blue|1bbbc9;1094|Periwinkle|00b3c9;1095|Aquamarine|00a9c2;1096|Pretty Blue|007d9b;1097|Bleached Aqua|afd2c' +
  '0;1098|Blue Surf|588773;1099|Pastel Green|bac19f;1100|Pastel Green|bed1b2;1101|Emerald|488f52;1102|Green Haze|' +
  'b6af7c;1103|Holly|344d3b;1104|Lime Cream|c1c596;1105|Silver Fern|aba37e;1106|Crescent Moon|978c54;1107|Shell P' +
  'ink|e86276;1108|Dusty Rose|e98ba3;1109|Ruby Glint|cf4d88;1110|Ruby Glint|bf2f6e;1111|Light Pink|c5adc5;1112|Pu' +
  'rple Accent|534680;1113|Pink Mist|ebc5c0;1114|Bisque|eababa;1115|Crystal Pink|efbbc1;1116|Orchid Pink|ebadbf;1' +
  '117|Begonia|d4628e;1118|Banner Gray|899193;1119|K. A. Bronze|9c4f64;1120|Crystal Pink|e6bac9;1121|Pink|e2afc5;' +
  '1122|Purple Shadow|4e3568;1123|Tusk|ede0bf;1124|Star Gold|fac74b;1125|Manila|f1b13c;1126|Light Bronze|ae7d5a;1' +
  '127|Alesan|dcbaa5;1128|Taupe|a29082;1129|Egyptian Brown|483933;1130|Espresso|493937;1131|Dark Grey|3b3431;1132' +
  '|Pale Blue|88bbcf;1133|Dolphin Blue|277eb7;1134|Fire Blue|005592;1135|Lemon|f5d777;1136|String|8b796c;1137|Mer' +
  'it Gold|f48c0d;1138|Seashell|ccbaa4;1140|Tamarack|808033;1141|Light Pink|9c7178;1142|Whisper Pink|b79b8f;1143|' +
  'Jay Blue|4b6b99;1144|Light Cocoa|846a57;1145|Brown|5e3e35;1146|Saffron|d42727;1147|Foxy Red|b60f2f;1148|Medium' +
  ' Pink|dc8b9a;1149|Ecru|dcc7b3;1150|Pebblestone|dbe08c;1151|Silver Moon|bbc5ce;1152|Arctic Ice|fa8972;1153|Illu' +
  'sion Blue|acbfcb;1154|Cerise|d84660;1155|Chamois|f59e65;1156|Medium Green / Yellow|787346;1157|Desert Cactus|7' +
  '76b4c;1158|Mushroom|794337;1159|Black Eyed Susie|d2a142;1160|Wonder Blue|4c7283;1161|Deep Windsor|2d4851;1162|' +
  'Deep Windsor|1f3f4a;1163|Blue Gray|80979e;1164|Gull|535a63;1166|Royal|1e4482;1167|Blue Suede|234877;1168|Sharp' +
  ' Green|96a84e;1169|Medium Green|8d9949;1170|Meadow|5a6e29;1171|Star Gold|f0af45;1172|Buttercup|e7982d;1173|Alm' +
  'ond|c2793f;1174|Burgundy|843a37;1175|Slate Blue|3b688d;1176|Baltic Blue|0081b6;1177|Ocean Blue|006da7;1178|Ora' +
  'nge|f66943;1179|Dark Rust|c9524b;1180|Daffodil|e6c44a;1181|Red Berry|892533;1182|Burgundy|782b3c;1183|Cranberr' +
  'y|8d3152;1184|Wildfire|bd1d44;1185|Imperial Aqua|00625e;1186|Red|a90042;1187|Dark Pink|b71855;1188|Dark Red|7a' +
  '3b6d;1189|Holly|3f5435;1190|Medium Yellow / Green|957f3d;1191|Autumn Green|927038;1192|Bullion|a9792a;1193|Hem' +
  'p|b49f55;1194|Desert Cactus|715c2d;1195|Pale Green|8fc3b4;1196|Black Eyed Susie|a1822a;1198|Cadet Blue|b5c6d6;' +
  '1199|Black|2a2e36;1212|Pale Silver|a3afb3;1217|Opaline|efb296;1218|Mahogany Rose|ad726b;1219|Sprite|a3bcb8;122' +
  '0|Pink Icing|e17578;1221|Dark Rust|aa4134;1222|Celery|e9deba;1223|Canary|efc82c;1224|Star Gold|e2bc51;1225|Pol' +
  'len Gold|c98d47;1226|Buff Orange|d58d64;1227|Pale Blue|799c97;1228|Vertiver Green|6d6258;1229|Dark Grey|5d5147' +
  ';1230|Fungi|614e3f;1232|Violet|a799bb;1233|Blackberry|4e4564;1234|Dark Pink|be3763;1235|Rose Dust|9a688e;1236|' +
  'Plum|4e2a36;1238|Dark Orange / Red|812833;1239|Twilight|575251;1240|Charcoal|726967;1241|Black|3b3f45;1242|Blu' +
  'e Ink|233d5b;1243|Light Navy|333c53;1244|Black|2d3038;1245|Seafoam|2b9f84;1246|M. D. Green|008b87;1247|Pepperm' +
  'int|00936d;1248|Sharp Green|9ace69;1249|Harvest Green|0ea146;1250|Dark Green|007047;1251|Vibrant Green|00914c;' +
  '1252|Deep Atlantic|375b63;1253|Toast|cd7a4e;1254|Flamingo|e38d81;1255|Gold|c1956c;1256|Sirocco|af7f56;1257|Ora' +
  'nge / Brown|9c562f;1258|Light Cocoa|7e4833;1259|Dark Brown|775854;1260|Wheat|c0b085;1261|Pastel Lilac|939dc3;1' +
  '263|Sterling|7e7897;1264|Thistle|938c9e;1266|Jamie Blue|2b5392;1267|PaleYellow|ece2ab;1270|Glow|e4ba82;1272|Im' +
  'pala|dba272;1273|Candied Ginger|a78c61;1274|Sky Blue|70a8c6;1275|Cosmic Sky|7991b7;1276|Pale Purple|407497;127' +
  '7|Blue|273c52;1278|Pumpkin|ff6616;1279|Peppermint|008173;1280|Jade|007763;1281|Atom Red|9f233f;1282|Pale Aqua|' +
  '6ac6a3;1284|Green Forest|006253;1286|Dawn Blue|cfcdca;1287|Metal|6b6869;1288|Moon Mist|7a7976;1289|Capri|4698a' +
  '5;1290|Blue Spruce|154b4b;1291|Mallard Blue|006473;1292|Light Blue|8ec4c3;1293|M. D. Green|006d70;1294|Blue / ' +
  'Green|00819b;1295|Dark Blue / Green|008cac;1296|Peacock|005f7e;1297|Baltic Blue|0071a3;1298|Brite Jade|00867a;' +
  '1299|Aqua Pearl|00b9ac;1301|Bluestone|38a87d;1302|Pale Aqua|7ace96;1303|Dark Army Green|364033;1304|Dark Green' +
  '|0e4e3f;1305|Light Green / Yellow|c1b597;1306|Arcadian Green|7b7966;1307|Scarlet|da4751;1308|Medium Green / Ye' +
  'llow|6b6d59;1309|Wild Pink|d66399;1310|Hot Peony|953c73;1311|Pale Purple|8e8bb8;1312|Purple Accent|58496f;1313' +
  '|Purple Accent|443555;1315|Pink Mist|e49ca7;1317|Emily Pink|e9a09b;1318|Dark Grey|424047;1319|Hot Pink|a26689;' +
  '1320|Medium Purple|5a405c;1321|Petal Pink|e192b8;1322|Dark Purple / Navy|413f79;1323|Yellow|cdaf4c;1328|Shadow' +
  ' Gray|987d6e;1329|Dark Olive Green|7c6054;1330|Violet|515e97;1334|Mulberry|613267;1335|Violet|4565a2;1336|Dark' +
  ' Brown|6e5851;1337|Pussywillow Gray|999a87;1338|Olive Drab|ab8f6a;1339|Pale Gray Green|a7a595;1340|Crescent Mo' +
  'on|8d8430;1341|K. A. Bronze|a46462;1342|Amber Beige|c19988;1343|Blue Ink|353862;1344|Beige|8f7154;1347|Earthen' +
  ' Tan|765b34;1348|Earthen Tan|795d3c;1349|Pale Yellow|edce88;1350|Green / Gold|b5a348;1351|Green Bay|145a4a;135' +
  '2|Black Eyed Susie|b88b30;1353|Slate Blue|4f6b80;1354|Cerise|cc4b6d;1356|Rose Beige|b599a1;1357|Green|484634;1' +
  '358|Dark Brown|774d4d;1359|Pollen Gold|cf982d;1360|Country Blue|7691a1;1361|Medium Grey|5e605e;1362|Light Midn' +
  'ight|514c5e;1363|Purple Cloud|798191;1364|Lake Blue|47596e;1365|Light Midnight|40495f;1366|Violet Blue|2c356b;' +
  '1367|Navy|2d2f37;1368|Blue Ribbon|2a374a;1369|Kelly|3a793e;1370|Evergreen|234f3b;1371|Green|20544e;1372|Schola' +
  'stic|f0a653;1373|Ozone|599ab5;1374|Warm Wine|602c31;1375|Pale Purple|3c7d9e;1376|Salem Blue|234d67;1377|Neon G' +
  'reen|71ac6b;1378|Sunkist|dd3823;1379|Coral|e15445;1380|Bluestone|009986;1381|Cabernet|8c2842;1382|Dark Maroon|' +
  '653d47;1383|Cherrystone|9c1f54;1384|Wine|6e2b38;1385|Wine|612533;1386|Plum|4d303d;1387|Light Grape|74677e;1388' +
  '|Medium Purple|5c3551;1389|Brushed Burgundy|732e4a;1390|Dark Green|2c453d;1391|Green Forest|4e6b61;1392|Harbor' +
  ' Green|6a7a6a;1393|Hedge|414137;1394|Green / Yellow|505443;1395|Mitchell Green|3d493f;1396|Water Lilly|516150;' +
  '1397|Evergreen|21453b';

const DEFAULT_COLORS = MADEIRA_RAYON.split(';').map((row) => {
  const [ref, name, hex] = row.split('|');
  return { id: ref, label: `${ref} · ${name}`, hex: `#${hex}` };
});

// Zones en fractions de l'image : centre (x, y), largeur w, hauteur h, rotation en degrés.
const DEFAULT_POSITIONS = [
  { id: 'coeur', label: 'Cœur', zone: { x: 0.64, y: 0.31, w: 0.17, h: 0.07, rot: 0 } },
  { id: 'centre', label: 'Centre poitrine', zone: { x: 0.5, y: 0.4, w: 0.42, h: 0.15, rot: 0 } },
];

const TECHNIQUES = [
  { id: 'broderie', label: 'Broderie', description: 'Prénom ou texte brodé au fil, en relief' },
  { id: 'dtf', label: 'Impression DTF', description: 'Votre logo imprimé puis posé à chaud' },
];

// Icônes (traits 1,5 px, couleur du texte)
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  zoom: svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M11 8.5v5M8.5 11h5"/>'),
  upload: svg('<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v3.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V15"/>'),
  file: svg('<path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3.5Z"/><path d="M14 3.5V8h4.5"/>'),
  close: svg('<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>'),
  check: svg('<path d="m6 12.5 4 4 8-9"/>'),
};

// Famille de couleur en français, déduite de la teinte : la recherche « rose », « bleu »… fonctionne sur un nuancier en anglais
function colorFamily(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (l > 0.9 && sat < 0.5) return 'blanc ecru';
  if (l < 0.13) return 'noir';
  if (sat < 0.12) return l > 0.6 ? 'gris clair argent' : 'gris anthracite';
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if ((h < 45 || h > 330) && l < 0.42 && sat < 0.6) return 'marron chocolat';
  if (h >= 20 && h < 50 && sat < 0.45 && l >= 0.42) return 'beige sable nude';
  if (h >= 345 || h < 12) return l > 0.65 ? 'rose' : 'rouge bordeaux';
  if (h < 40) return l > 0.7 ? 'rose peche saumon' : 'orange corail';
  if (h < 62) return sat < 0.5 ? 'or dore moutarde' : 'jaune or';
  if (h < 160) return 'vert';
  if (h < 195) return 'turquoise bleu vert';
  if (h < 255) return l < 0.3 ? 'bleu marine' : 'bleu';
  if (h < 290) return 'violet lavande';
  return l > 0.6 ? 'rose' : 'fuchsia prune';
}

// Teintes proposées en premier : le fil du nuancier le plus proche de chacune
const POPULAR_TARGETS = ['#ffffff', '#1d1d1f', '#c9a23a', '#b9bdc3', '#f2c4ce', '#e58aa8', '#b3202a',
  '#1f2d5a', '#9cc3e6', '#9fb59a', '#d9c3a5', '#6b4a35'];
function nearestColors(colors, targets) {
  const ids = [];
  for (const t of targets) {
    const [r, g, b] = hexToRgb(t);
    let best = null, bestD = Infinity;
    for (const col of colors) {
      if (ids.includes(col.id)) continue;
      const [r2, g2, b2] = hexToRgb(col.hex);
      const d = 2 * (r - r2) ** 2 + 4 * (g - g2) ** 2 + 3 * (b - b2) ** 2;
      if (d < bestD) { bestD = d; best = col.id; }
    }
    if (best) ids.push(best);
  }
  return ids;
}

const SIZES = [
  { id: 'S', label: 'S', factor: 0.62 },
  { id: 'M', label: 'M', factor: 0.8 },
  { id: 'L', label: 'L', factor: 1 },
];

const THREAD_MM = 0.4; // épaisseur d'un fil à broder (40 wt)
// Dossier des polices numérisées (fonts/*.json), surchargeable par config.fontsBaseUrl
const FONTS_BASE = new URL('./fonts/', document.currentScript?.src || location.href).href;

/* ---------- utilitaires ---------- */

const mkCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const css = ([r, g, b]) => `rgb(${r},${g},${b})`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- polices numérisées (points Ink/Stitch) ---------- */

const stitchFonts = new Map(); // url → { state, data }

// JSON produit par tools/export_inkstitch_font.py : courses en 1/50 mm, codées en différences
function decodeStitchFont(raw) {
  const k = 1 / (raw.units || 50);
  const glyphs = {};
  for (const [ch, g] of Object.entries(raw.glyphs)) {
    glyphs[ch] = {
      minX: g.minX,
      adv: g.adv,
      runs: g.runs.map((r) => {
        const pts = new Float32Array(r.length);
        let x = 0, y = 0;
        for (let i = 0; i < r.length; i += 2) {
          x += r[i]; y += r[i + 1];
          pts[i] = x * k; pts[i + 1] = y * k;
        }
        return pts;
      }),
    };
  }
  return { ...raw, glyphs };
}

// Mise en page identique au lettrage Ink/Stitch (chasse, crénage, interligne), lignes centrées.
// Retourne les points de broderie (segments consécutifs d'une course) en mm, dans l'ordre de couture.
function layoutStitches(font, lines) {
  const kern = font.kerning || {};
  const placed = [];
  lines.forEach((raw, li) => {
    const text = font.letterCase === 'upper' ? raw.toUpperCase() : font.letterCase === 'lower' ? raw.toLowerCase() : raw;
    const y = li * font.leading;
    const runs = [];
    let x = 0, last = null;
    for (const c of text.normalize('NFC')) {
      const ch = font.glyphs[c] ? c : c.normalize('NFD')[0]; // lettre accentuée absente → lettre de base
      const g = font.glyphs[ch];
      if (c === ' ' || !g) { x += font.wordSpacing; last = null; continue; }
      if (last !== null) x += g.minX - (kern[`${last} ${ch}`] ?? kern[last + ch] ?? 0);
      for (const pts of g.runs) runs.push({ pts, dx: x });
      x += g.adv - g.minX;
      last = ch;
    }
    let lo = Infinity, hi = -Infinity;
    for (const r of runs) for (let i = 0; i < r.pts.length; i += 2) { lo = Math.min(lo, r.pts[i] + r.dx); hi = Math.max(hi, r.pts[i] + r.dx); }
    const shift = runs.length ? -(lo + hi) / 2 : 0;
    for (const r of runs) placed.push({ pts: r.pts, dx: r.dx + shift, dy: y });
  });

  let n = 0;
  for (const r of placed) n += r.pts.length / 2 - 1;
  const segs = new Float32Array(n * 4);
  const bbox = [Infinity, Infinity, -Infinity, -Infinity];
  let o = 0;
  for (const { pts, dx, dy } of placed) {
    for (let i = 0; i + 3 < pts.length; i += 2) {
      segs[o++] = pts[i] + dx; segs[o++] = pts[i + 1] + dy;
      segs[o++] = pts[i + 2] + dx; segs[o++] = pts[i + 3] + dy;
    }
    for (let i = 0; i < pts.length; i += 2) {
      bbox[0] = Math.min(bbox[0], pts[i] + dx); bbox[1] = Math.min(bbox[1], pts[i + 1] + dy);
      bbox[2] = Math.max(bbox[2], pts[i] + dx); bbox[3] = Math.max(bbox[3], pts[i + 1] + dy);
    }
  }
  return { segs, count: n, bbox };
}

/* ---------- rendu WebGL : chaque point est un fil en relief, éclairé ---------- */

// Passe 1 : carte de hauteur. Chaque point = capsule de fil (section ronde, brins torsadés,
// plongée dans le tissu aux extrémités). Le point cousu après recouvre le précédent (profondeur).
const VS_STITCH = `#version 300 es
in vec2 a_corner;
in vec4 a_seg;
uniform vec2 u_size;
uniform vec4 u_xf;
uniform float u_r;
uniform float u_count;
out vec2 v_p;
flat out vec4 v_seg;
void main() {
  vec2 a = a_seg.xy * u_xf.x + u_xf.zw, b = a_seg.zw * u_xf.x + u_xf.zw;
  vec2 d = b - a;
  float len = max(length(d), 1e-4);
  vec2 u = d / len, n = vec2(-u.y, u.x);
  float m = u_r + 1.0;
  vec2 p = a + u * (a_corner.x * (len + 2.0 * m) - m) + n * a_corner.y * m;
  v_p = p;
  v_seg = vec4(a, b);
  float z = 1.0 - 2.0 * (float(gl_InstanceID) + 1.0) / (u_count + 2.0);
  gl_Position = vec4(p.x / u_size.x * 2.0 - 1.0, 1.0 - p.y / u_size.y * 2.0, z, 1.0);
}`;

const FS_STITCH = `#version 300 es
precision highp float;
in vec2 v_p;
flat in vec4 v_seg;
uniform float u_r;
uniform float u_detail;
out vec4 o;
void main() {
  vec2 a = v_seg.xy, b = v_seg.zw, d = b - a;
  float len = max(length(d), 1e-4);
  vec2 u = d / len, n = vec2(-u.y, u.x), q = v_p - a;
  float al = dot(q, u), ac = dot(q, n);
  float t = length(q - u * clamp(al, 0.0, len)) / u_r;
  if (t >= 1.0) discard;
  float prof = sqrt(1.0 - t * t);
  float ply = (0.5 + 0.5 * cos(6.2831853 * (al + ac * 0.6) / (u_r * 1.7))) * u_detail;
  float e = min(al, len - al) / u_r;
  float sink = mix(0.3, 1.0, smoothstep(-0.8, 1.8, e));
  o = vec4(prof * (1.0 - 0.18 * ply) * sink, u * 0.5 + 0.5, 1.0);
}`;

// Passe 2 : éclairage par pixel. Normale tirée de la hauteur, diffus, reflet anisotrope le long
// du fil (Kajiya-Kay) et occlusion dans les creux entre les fils.
const VS_QUAD = `#version 300 es
in vec2 a_corner;
out vec2 v_uv;
void main() { v_uv = a_corner; gl_Position = vec4(a_corner * 2.0 - 1.0, 0.0, 1.0); }`;

const FS_LIGHT = `#version 300 es
precision highp float;
uniform sampler2D u_g;
uniform vec2 u_texel;
uniform float u_r;
uniform vec3 u_color;
uniform float u_detail;
in vec2 v_uv;
out vec4 o;
float H(vec2 uv) { return texture(u_g, uv).r; }
void main() {
  vec4 g = texture(u_g, v_uv);
  if (g.a < 0.5) { o = vec4(0.0); return; }
  float hs = u_r * 0.9;
  float hl = H(v_uv - vec2(u_texel.x, 0.0)), hr = H(v_uv + vec2(u_texel.x, 0.0));
  float hd = H(v_uv - vec2(0.0, u_texel.y)), hu = H(v_uv + vec2(0.0, u_texel.y));
  vec3 N = normalize(vec3((hl - hr) * hs * 0.5, (hd - hu) * hs * 0.5, 1.0));
  vec2 t2 = normalize(g.gb * 2.0 - 1.0);
  vec3 T0 = vec3(t2.x, -t2.y, 0.0);
  vec3 T = normalize(T0 - N * dot(N, T0) + 1e-5);
  vec3 L = normalize(vec3(-0.45, 0.55, 0.75));
  vec3 Hv = normalize(L + vec3(0.0, 0.0, 1.0));
  float diff = max(dot(N, L), 0.0);
  float th = dot(T, Hv);
  float sinTH = sqrt(max(0.0, 1.0 - th * th));
  float spec = (pow(sinTH, mix(16.0, 70.0, u_detail)) * mix(0.3, 0.5, u_detail) + pow(sinTH, 10.0) * 0.12) * smoothstep(0.05, 0.4, g.r);
  float occ = 0.0;
  for (int i = 0; i < 8; i++) {
    float an = float(i) * 0.7853982;
    occ += max(H(v_uv + vec2(cos(an), sin(an)) * u_texel * u_r * 0.9) - g.r, 0.0);
  }
  float ao = 1.0 - clamp(occ * 0.2, 0.0, 0.6);
  vec3 col = u_color * (0.3 + 0.8 * diff) * ao * (0.7 + 0.3 * g.r) + vec3(spec) * mix(vec3(1.0), u_color, 0.35);
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

class StitchRenderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    const gl = this.gl = this.canvas.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
    if (!gl) return;
    this.maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.float = !!gl.getExtension('EXT_color_buffer_float');
    const compile = (vs, fs) => {
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      return p;
    };
    try {
      this.pStitch = compile(VS_STITCH, FS_STITCH);
      this.pLight = compile(VS_QUAD, FS_LIGHT);
    } catch (e) {
      console.warn('[embroidery-preview] WebGL indisponible', e);
      this.gl = null;
      return;
    }
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), gl.STATIC_DRAW);
    this.quadUv = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadUv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    this.segBuf = gl.createBuffer();
    this.segData = null;
    this.fbo = gl.createFramebuffer();
    this.tex = gl.createTexture();
    this.depth = gl.createRenderbuffer();
    this.fbSize = [0, 0];
  }

  get ok() { return !!this.gl; }

  // design : { segs (mm), count } ; xf : [échelle px/mm, décalage x, décalage y] ; r : rayon du fil en px ;
  // detail (0-1) : relief des brins, estompé quand le fil ne fait que 1-2 px à l'écran (évite le scintillement)
  render(design, w, h, xf, r, rgb, detail = 1) {
    const gl = this.gl;
    this.canvas.width = w;
    this.canvas.height = h;
    if (this.fbSize[0] !== w || this.fbSize[1] !== h) {
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, this.float ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, this.float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
      for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
      for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
      this.fbSize = [w, h];
    }
    if (this.segData !== design.segs) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.segBuf);
      gl.bufferData(gl.ARRAY_BUFFER, design.segs, gl.STATIC_DRAW);
      this.segData = design.segs;
    }

    // Passe 1 : hauteurs
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.pStitch);
    const ps = this.pStitch;
    const aCorner = gl.getAttribLocation(ps, 'a_corner'), aSeg = gl.getAttribLocation(ps, 'a_seg');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(aCorner);
    gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(aCorner, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.segBuf);
    gl.enableVertexAttribArray(aSeg);
    gl.vertexAttribPointer(aSeg, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(aSeg, 1);
    gl.uniform2f(gl.getUniformLocation(ps, 'u_size'), w, h);
    gl.uniform4f(gl.getUniformLocation(ps, 'u_xf'), xf[0], xf[0], xf[1], xf[2]);
    gl.uniform1f(gl.getUniformLocation(ps, 'u_r'), r);
    gl.uniform1f(gl.getUniformLocation(ps, 'u_count'), design.count);
    gl.uniform1f(gl.getUniformLocation(ps, 'u_detail'), detail);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, design.count);
    gl.vertexAttribDivisor(aSeg, 0);
    gl.disableVertexAttribArray(aSeg);

    // Passe 2 : lumière
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.pLight);
    const pl = this.pLight;
    const aC = gl.getAttribLocation(pl, 'a_corner');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadUv);
    gl.enableVertexAttribArray(aC);
    gl.vertexAttribPointer(aC, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(gl.getUniformLocation(pl, 'u_g'), 0);
    gl.uniform2f(gl.getUniformLocation(pl, 'u_texel'), 1 / w, 1 / h);
    gl.uniform1f(gl.getUniformLocation(pl, 'u_r'), r);
    gl.uniform3f(gl.getUniformLocation(pl, 'u_color'), rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    gl.uniform1f(gl.getUniformLocation(pl, 'u_detail'), detail);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return this.canvas;
  }
}

// Repli sans WebGL 2 : chaque point tracé comme un trait arrondi
function renderStitchesCanvas(design, w, h, xf, r, rgb) {
  const c = mkCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.lineCap = 'round';
  const s = design.segs;
  for (const [width, color] of [[2 * r, mix(rgb, [0, 0, 0], 0.35)], [1.3 * r, rgb]]) {
    ctx.lineWidth = width;
    ctx.strokeStyle = css(color);
    ctx.beginPath();
    for (let i = 0; i < s.length; i += 4) {
      ctx.moveTo(s[i] * xf[0] + xf[1], s[i + 1] * xf[0] + xf[2]);
      ctx.lineTo(s[i + 2] * xf[0] + xf[1], s[i + 3] * xf[0] + xf[2]);
    }
    ctx.stroke();
  }
  return c;
}

/* ---------- logos DTF (fichiers vectoriels du client) ---------- */

const LOGO_MAX_BYTES = 10 * 1024 * 1024;
const PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';
let pdfjsPromise = null;

// pdf.js n'est chargé que si un client envoie un PDF
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  pdfjsPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${PDFJS_BASE}/pdf.min.js`;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.js`;
      resolve(window.pdfjsLib);
    };
    s.onerror = () => { pdfjsPromise = null; reject(new Error("Lecture des PDF indisponible pour l'instant, réessayez.")); };
    document.head.appendChild(s);
  });
  return pdfjsPromise;
}

// Lit un logo vectoriel : SVG, PDF, ou AI enregistré compatible PDF. Erreurs rédigées pour le client.
async function readLogo(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const isSvg = file.type === 'image/svg+xml' || ext === 'svg';
  const isPdf = file.type === 'application/pdf' || ext === 'pdf' || ext === 'ai';
  if (ext === 'eps') throw new Error("Les fichiers EPS ne peuvent pas être prévisualisés : envoyez votre logo en SVG ou en PDF.");
  if (!isSvg && !isPdf) throw new Error('Envoyez votre logo en fichier vectoriel : SVG ou PDF.');
  if (file.size > LOGO_MAX_BYTES) throw new Error('Fichier trop lourd : 10 Mo maximum.');

  if (isSvg) {
    const doc = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
    const svg = doc.documentElement;
    if (svg.nodeName !== 'svg' || doc.querySelector('parsererror')) throw new Error('Ce fichier SVG est illisible.');
    const num = (v) => (v && !v.includes('%') ? parseFloat(v) : NaN);
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    let w = num(svg.getAttribute('width')), h = num(svg.getAttribute('height'));
    if (!(w > 0 && h > 0) && vb.length === 4) { w = vb[2]; h = vb[3]; }
    if (!(w > 0 && h > 0)) { w = 1000; h = 1000; }
    if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Ce fichier SVG est illisible.'));
      i.src = url;
    });
    return {
      kind: 'svg', img, aspect: w / h,
      warning: svg.querySelector('image') ? 'Ce SVG contient une image non vectorisée : le rendu imprimé peut être flou.' : '',
    };
  }

  const pdfjs = await loadPdfJs();
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  } catch {
    throw new Error(ext === 'ai'
      ? 'Ce fichier AI ne peut pas être lu : enregistrez-le avec l’option « Créer un fichier compatible PDF », ou envoyez un PDF.'
      : 'Ce fichier PDF est illisible.');
  }
  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  return { kind: 'pdf', page, aspect: vp.width / vp.height, warning: pdf.numPages > 1 ? 'Seule la première page du PDF est utilisée.' : '' };
}

function ensureFontStylesheet() {
  if (document.querySelector('link[data-embroidery-fonts]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONT_CSS;
  link.dataset.embroideryFonts = '1';
  document.head.appendChild(link);
}

// Minuscules sans accents, pour la recherche de fil
const normalize = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------- styles ---------- */

const STYLE = `
:host { display:block; width:100%; container-type:inline-size; color:var(--ep-ink); font-family:var(--ep-font); font-size:15px; line-height:1.5;
  --ep-ink:#5b4d43; --ep-muted:#6f6055; --ep-line:#e6dccd; --ep-bg:#fff8f1; --ep-surface:#ffffff; --ep-stage:#f6efe4;
  --ep-accent:#a2672d; --ep-accent-soft:#f6eadc; --ep-danger:#a3362b; --ep-danger-bg:#f9e3df; --ep-warn:#7a5212; --ep-warn-bg:#fbf0dc;
  --ep-font:"Josefin Sans", "Avenir Next", system-ui, sans-serif; --ep-display:"Fahkwang", Georgia, serif; --ep-radius:6px; }
* { box-sizing:border-box; }
.wrap { display:grid; gap:24px; grid-template-columns:minmax(0,1fr); }
/* Mobile : l'aperçu reste visible en haut pendant les choix */
.stage-col { position:sticky; top:var(--ep-sticky-top, 0px); z-index:5; background:var(--ep-page, var(--ep-bg)); padding-bottom:10px; }
.live { margin:0; padding:8px 2px; font-size:13px; font-weight:500; color:var(--ep-ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  border-bottom:1px solid var(--ep-line); box-shadow:0 6px 8px -6px rgba(91,77,67,.25); background:var(--ep-page, var(--ep-bg)); }
.caption { display:none; }
.caption-m { display:block; }
@container (max-width: 759px) {
  .stage-col { padding-bottom:0; }
  .zoom { min-width:44px; padding:0; justify-content:center; right:8px; bottom:8px; }
  .zoom span { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }
}
@container (min-width: 760px) {
  .wrap { grid-template-columns:minmax(0,1.25fr) minmax(300px,1fr); gap:40px; align-items:start; }
  .stage-col { top:calc(var(--ep-sticky-top, 0px) + 16px); z-index:auto; background:none; padding-bottom:0; }
  .live { display:none; }
}
.preview { position:relative; display:flex; justify-content:center; align-items:center; background:var(--ep-stage);
  border:1px solid var(--ep-line); border-radius:12px; min-height:160px; overflow:hidden; }
.preview[data-loading] { aspect-ratio:4/5; max-height:60vh; }
@media (prefers-reduced-motion: no-preference) {
  .preview[data-loading] { background:linear-gradient(90deg, var(--ep-stage), #f9f3ea, var(--ep-stage)); background-size:200% 100%; animation:ep-shimmer 1.4s linear infinite; }
}
@keyframes ep-shimmer { from { background-position:100% 0; } to { background-position:-100% 0; } }
canvas { display:block; max-width:100%; }
.zoom { position:absolute; right:12px; bottom:12px; display:inline-flex; align-items:center; gap:8px; font:inherit; font-size:13px;
  letter-spacing:.03em; padding:0 16px; min-height:44px; border:1px solid var(--ep-line); border-radius:999px;
  background:var(--ep-surface); color:var(--ep-ink); cursor:pointer; box-shadow:0 1px 3px rgba(91,77,67,.14); }
.zoom svg { width:16px; height:16px; flex:none; }
.zoom[aria-pressed="true"] { background:var(--ep-ink); color:var(--ep-surface); border-color:var(--ep-ink); }
.status { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); font-size:13px; white-space:nowrap; padding:6px 12px; border-radius:999px;
  background:var(--ep-surface); color:var(--ep-muted); box-shadow:0 1px 3px rgba(91,77,67,.14); pointer-events:none; }
.status:empty { display:none; }
.status.error { background:var(--ep-danger-bg); color:var(--ep-danger); white-space:normal; text-align:center; width:max-content; max-width:80%; }
.caption, .caption-m { margin:10px 2px 0; font-size:13px; color:var(--ep-muted); }
.controls { display:flex; flex-direction:column; counter-reset:step; }
.controls[hidden] { display:none; }
.step { counter-increment:step; padding:24px 0; border-top:1px solid var(--ep-line); display:flex; flex-direction:column; gap:12px; }
.step.first { border-top:0; padding-top:0; }
.step[hidden] { display:none; }
.step-head { display:flex; align-items:baseline; gap:10px; min-width:0; }
.step-head::before { content:counter(step, decimal-leading-zero); font-size:12px; letter-spacing:.08em; color:var(--ep-accent); font-weight:600; }
.step-title { margin:0; font-family:var(--ep-display); font-weight:500; font-size:18px; color:var(--ep-ink); }
@container (min-width: 760px) { .step-title { font-size:20px; } }
.step-value { margin-left:auto; font-size:13px; color:var(--ep-muted); text-align:right; min-width:0; max-width:55%;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hint { font-size:13px; color:var(--ep-muted); margin:0; }
.label { font-size:13px; font-weight:600; color:var(--ep-ink); margin:4px 0 0; }
.tech-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.card { font:inherit; text-align:left; display:flex; flex-direction:column; gap:2px; padding:14px; border:1px solid var(--ep-line);
  border-radius:var(--ep-radius); background:var(--ep-surface); color:inherit; cursor:pointer; min-height:76px; }
.card strong { font-weight:600; font-size:15px; }
.card span { font-size:13px; color:var(--ep-muted); line-height:1.4; }
.card[aria-pressed="true"], .chip[aria-pressed="true"], .font-card[aria-pressed="true"] {
  border-color:var(--ep-accent); box-shadow:inset 0 0 0 1px var(--ep-accent); background:var(--ep-accent-soft); }
.chips { display:flex; flex-wrap:wrap; gap:8px; }
.chip { font:inherit; font-size:14px; padding:0 18px; min-height:44px; border:1px solid var(--ep-line); border-radius:999px;
  background:var(--ep-surface); color:inherit; cursor:pointer; }
.chip[hidden] { display:none; }
.chip small { font-size:12px; color:var(--ep-muted); margin-left:6px; }
.chip small::before { content:"· "; }
.seg { display:inline-grid; grid-auto-flow:column; grid-auto-columns:minmax(56px,1fr); border:1px solid var(--ep-line);
  border-radius:999px; padding:3px; background:var(--ep-surface); align-self:flex-start; }
.seg button { font:inherit; font-size:14px; border:0; background:transparent; color:inherit; border-radius:999px; min-height:44px; padding:0 14px; cursor:pointer; }
.seg button[aria-pressed="true"] { background:var(--ep-ink); color:var(--ep-surface); }
.lines { display:flex; flex-direction:column; gap:10px; }
.line { display:flex; flex-direction:column; gap:4px; scroll-margin-top:200px; }
.line-head { display:flex; justify-content:space-between; font-size:13px; color:var(--ep-muted); }
.line-head .full { color:var(--ep-accent); font-weight:600; }
.line input { width:100%; font:inherit; font-size:17px; padding:0 14px; min-height:48px; border:1px solid var(--ep-line); border-radius:var(--ep-radius);
  background:var(--ep-surface); color:inherit; }
textarea::placeholder, input::placeholder { color:#7f7064; }
.counts { display:flex; flex-wrap:wrap; gap:4px 16px; font-size:13px; color:var(--ep-muted); }
.counts .full { color:var(--ep-accent); font-weight:600; }
.font-grid { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px; }
.font-card { position:relative; font:inherit; display:flex; flex-direction:column; gap:4px; padding:8px 8px 10px; border:1px solid var(--ep-line);
  border-radius:var(--ep-radius); background:var(--ep-surface); color:inherit; cursor:pointer; min-width:0; }
.font-card canvas { width:100%; height:48px; }
@container (min-width: 760px) { .font-card canvas { height:56px; } }
.font-card span { font-size:12px; color:var(--ep-muted); text-align:center; line-height:1.2; min-height:2.4em; display:flex; align-items:center; justify-content:center; }
.font-card .tick { position:absolute; top:6px; right:6px; width:18px; height:18px; border-radius:50%; background:var(--ep-accent); color:var(--ep-surface); display:none; place-items:center; }
.font-card .tick svg { width:12px; height:12px; stroke-width:2.2; }
.font-card[aria-pressed="true"] .tick { display:grid; }
.thread-current { display:flex; align-items:center; gap:12px; }
.thread-current i { width:40px; height:40px; border-radius:50%; box-shadow:inset 0 0 0 1px rgba(0,0,0,.12); flex:none; }
.thread-current b { font-weight:600; display:block; } .thread-current small { display:block; color:var(--ep-muted); font-size:12.5px; }
.swatches { display:flex; flex-wrap:wrap; gap:8px; }
.swatch { width:44px; height:44px; padding:0; border-radius:50%; border:3px solid var(--ep-surface); box-shadow:0 0 0 1px rgba(91,77,67,.25);
  cursor:pointer; flex:none; }
.swatch[aria-pressed="true"] { box-shadow:0 0 0 2px var(--ep-accent); }
.swatch[hidden] { display:none; }
details.palette { border:1px solid var(--ep-line); border-radius:var(--ep-radius); background:var(--ep-surface); }
details.palette summary { cursor:pointer; padding:0 14px; min-height:48px; align-items:center; font-size:14px; list-style:none; display:flex; justify-content:space-between; gap:12px; }
details.palette summary::-webkit-details-marker { display:none; }
details.palette summary::after { content:""; width:8px; height:8px; border-right:1.5px solid var(--ep-accent); border-bottom:1.5px solid var(--ep-accent); transform:rotate(45deg) translateY(-3px); flex:none; }
details.palette[open] summary::after { transform:rotate(-135deg) translateY(-3px); }
details.palette summary .hint { margin-left:auto; }
.palette-body { padding:0 14px 14px; display:flex; flex-direction:column; gap:10px; }
.palette-body .swatches { max-height:min(320px, 45vh); overflow-y:auto; overscroll-behavior:contain; padding:4px; }
input[type=search] { width:100%; font:inherit; font-size:16px; padding:10px 12px; border:1px solid var(--ep-line); border-radius:var(--ep-radius);
  background:var(--ep-bg); color:inherit; }
.empty { font-size:13px; color:var(--ep-muted); margin:0; }
.drop { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:4px; padding:26px 16px;
  border:1.5px dashed #c2926a; border-radius:var(--ep-radius); background:var(--ep-surface); cursor:pointer; }
.drop.over { background:var(--ep-accent-soft); border-color:var(--ep-accent); }
.drop svg { width:28px; height:28px; color:var(--ep-accent); margin-bottom:4px; }
.drop strong { font-weight:600; } .drop span { font-size:13px; color:var(--ep-muted); }
.drop .touch { display:none; }
@media (hover:none) { .drop .mouse { display:none; } .drop .touch { display:inline; } }
.drop[hidden] { display:none; }
.drop input { position:absolute; inset:0; opacity:0; cursor:pointer; }
.file { display:flex; align-items:center; gap:12px; padding:8px 8px 8px 14px; border:1px solid var(--ep-line); border-radius:var(--ep-radius); background:var(--ep-surface); }
.file[hidden] { display:none; }
.file .thumb { width:40px; height:40px; flex:none; border-radius:4px; background:var(--ep-stage); display:grid; place-items:center; overflow:hidden; color:var(--ep-accent); }
.file .thumb img { max-width:34px; max-height:34px; }
.file .thumb svg { width:22px; height:22px; }
.file .name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; }
.file .size { font-size:13px; color:var(--ep-muted); }
.icon-btn { font:inherit; border:0; background:transparent; color:var(--ep-muted); width:44px; height:44px; border-radius:50%; cursor:pointer;
  display:grid; place-items:center; flex:none; }
.icon-btn svg { width:18px; height:18px; }
.icon-btn:hover { background:var(--ep-accent-soft); color:var(--ep-ink); }
.note { font-size:13px; padding:10px 12px; border-radius:var(--ep-radius); margin:0; }
.note.warn { background:var(--ep-warn-bg); color:var(--ep-warn); }
.note.error { background:var(--ep-danger-bg); color:var(--ep-danger); }
.note[hidden] { display:none; }
.recap { margin-top:8px; padding:16px 18px; border-radius:var(--ep-radius); background:var(--ep-bg); border:1px solid var(--ep-line); }
.recap h3 { margin:0 0 10px; font-family:var(--ep-display); font-weight:500; font-size:15px; }
.recap dl { margin:0; display:grid; grid-template-columns:110px minmax(0,1fr); gap:6px 16px; font-size:14px; }
.recap dt { color:var(--ep-muted); } .recap dd { margin:0; text-align:right; overflow-wrap:anywhere; min-width:0; }
.recap dd i { display:inline-block; width:12px; height:12px; border-radius:50%; vertical-align:-1px; margin-right:6px; box-shadow:inset 0 0 0 1px rgba(0,0,0,.15); }
.recap dd small { color:var(--ep-muted); font-size:12px; margin-left:4px; }
.recap .caption-m { margin:12px 0 0; padding-top:10px; border-top:1px solid var(--ep-line); font-size:12px; }
button:focus-visible, textarea:focus-visible, input:focus-visible, summary:focus-visible, .drop:focus-within {
  outline:2px solid var(--ep-ink); outline-offset:3px; }
.step[data-hide] { display:none; }
@media (prefers-reduced-motion: no-preference) {
  .card, .chip, .font-card, .swatch, .seg button, .zoom, .drop { transition:background-color .15s, box-shadow .15s, border-color .15s, color .15s; }
}
`;

/* ---------- composant ---------- */

class EmbroideryPreview extends HTMLElement {
  static get observedAttributes() {
    return ['config', 'state', 'debug', 'controls', 'request-snapshot'];
  }

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._images = new Map();
    this._design = null;
    this._renderer = null;
    this._config = this._normalizeConfig({});
    this._state = this._defaultState();
    this._raf = 0;
    this._emitTimer = 0;
    this._built = false;
  }

  connectedCallback() {
    ensureFontStylesheet();
    if (!this._built) this._buildShell();
    this._loadFonts();
    this._ro = new ResizeObserver(() => this._schedule());
    // Clavier iPhone : la hauteur visible change sans changer la largeur
    this._onViewport = () => this._schedule();
    window.visualViewport?.addEventListener('resize', this._onViewport);
    this._ro.observe(this._preview);
    this._schedule();
    this._emitChange();
  }

  disconnectedCallback() {
    this._ro?.disconnect();
    window.visualViewport?.removeEventListener('resize', this._onViewport);
    cancelAnimationFrame(this._raf);
  }

  attributeChangedCallback(name, _old, value) {
    if (name === 'config') {
      try {
        this._config = this._normalizeConfig(JSON.parse(value || '{}'));
      } catch (e) {
        console.warn('[embroidery-preview] config JSON invalide', e);
        return;
      }
      this._state = { ...this._defaultState(), ...this._keepValid(this._state) };
      if (this._built) this._buildControls();
      this._loadFonts();
      this._emitChange();
    } else if (name === 'state') {
      try {
        const s = JSON.parse(value || '{}');
        if (typeof s.text === 'string') { s.text = this._cleanText(s.text); this._touched = true; }
        this._state = { ...this._state, ...this._keepValid(s) };
        if (this._built) this._syncControls();
        this._emitChange();
      } catch (e) {
        console.warn('[embroidery-preview] state JSON invalide', e);
      }
    } else if (name === 'controls' && this._built) {
      this._controls.hidden = value === 'false';
    } else if (name === 'request-snapshot') {
      this._snapshot();
      return;
    }
    this._schedule();
  }

  /* ----- config & état ----- */

  _normalizeConfig(c) {
    return {
      image: c.image || '',
      positions: Array.isArray(c.positions) && c.positions.length ? c.positions : DEFAULT_POSITIONS,
      colors: Array.isArray(c.colors) && c.colors.length ? c.colors : DEFAULT_COLORS,
      fonts: Array.isArray(c.fonts) && c.fonts.length ? c.fonts : DEFAULT_FONTS,
      maxLines: clamp(Number(c.maxLines) || 3, 1, 5),
      maxChars: clamp(Number(c.maxChars) || 20, 1, 60),
      defaultText: typeof c.defaultText === 'string' ? c.defaultText : '',
      accent: c.accent || null,
      fontsBaseUrl: c.fontsBaseUrl || null,
      caption: typeof c.caption === 'string' ? c.caption : 'Aperçu indicatif : chaque pièce est personnalisée à la main dans notre atelier.',
      // Marque des fils, reprise dans le récapitulatif de commande (nuancier par défaut : Madeira Rayon)
      threadBrand: c.threadBrand ?? (Array.isArray(c.colors) && c.colors.length ? '' : 'Madeira Rayon'),
      defaultColorId: c.defaultColorId || '1001',
      popularColors: Array.isArray(c.popularColors) ? c.popularColors
        : nearestColors(Array.isArray(c.colors) && c.colors.length ? c.colors : DEFAULT_COLORS, POPULAR_TARGETS),
      // Techniques proposées : celles de la config, et autorisées sur au moins une zone (éditeur de zones)
      techniques: TECHNIQUES.filter((t) => (!Array.isArray(c.techniques) || c.techniques.includes(t.id)) &&
        (!Array.isArray(c.positions) || !c.positions.length || c.positions.some((p) => !Array.isArray(p.techniques) || p.techniques.includes(t.id)))),
    };
  }

  _defaultState() {
    const c = this._config;
    return {
      technique: (c.techniques[0] || TECHNIQUES[0]).id,
      text: this._cleanText(c.defaultText),
      fontId: c.fonts[0].id,
      colorId: (c.colors.find((x) => x.id === c.defaultColorId) || c.colors[0]).id,
      positionId: c.positions[0].id,
      sizeId: 'M',
    };
  }

  _keepValid(s) {
    const c = this._config;
    const out = {};
    if (typeof s.text === 'string' && (s.text || this._touched)) out.text = s.text;
    if (c.fonts.some((f) => f.id === s.fontId)) out.fontId = s.fontId;
    if (c.colors.some((x) => x.id === s.colorId)) out.colorId = s.colorId;
    if (c.positions.some((p) => p.id === s.positionId)) out.positionId = s.positionId;
    if (SIZES.some((x) => x.id === s.sizeId)) out.sizeId = s.sizeId;
    if (c.techniques.some((t) => t.id === s.technique)) out.technique = s.technique;
    return out;
  }

  _cleanText(raw) {
    const { maxLines, maxChars } = this._config;
    return String(raw || '')
      .replace(/\r/g, '')
      .split('\n')
      .slice(0, maxLines)
      .map((l) => l.slice(0, maxChars))
      .join('\n');
  }

  _font() { return this._config.fonts.find((f) => f.id === this._state.fontId) || this._config.fonts[0]; }
  _color() { return this._config.colors.find((c) => c.id === this._state.colorId) || this._config.colors[0]; }
  // Zones où la technique choisie est autorisée (toutes si la zone ne précise rien)
  _positions() {
    const all = this._config.positions;
    const ok = all.filter((p) => !Array.isArray(p.techniques) || p.techniques.includes(this._state.technique));
    return ok.length ? ok : all;
  }

  _position() { return this._positions().find((p) => p.id === this._state.positionId) || this._positions()[0]; }
  _size() { return SIZES.find((s) => s.id === this._state.sizeId) || SIZES[1]; }
  _lines() { return this._state.text.split('\n').map((l) => l.trim()).filter(Boolean); }

  _loadFonts() {
    if (!document.fonts) return;
    for (const f of this._config.fonts) {
      document.fonts.load(`${f.weight || 400} 40px "${f.family}"`).then(() => this._schedule(), () => {});
    }
  }

  /* ----- UI ----- */

  _buildShell() {
    this._root.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap">
        <div class="stage-col">
          <div class="preview" part="preview">
            <canvas role="img" aria-label="Aperçu de votre personnalisation"></canvas>
            <div class="status" aria-live="polite"></div>
            <button type="button" class="zoom" aria-pressed="false" aria-label="Voir de près">${ICONS.zoom}<span>Voir de près</span></button>
          </div>
          <p class="live" aria-hidden="true"></p>
          <p class="caption"></p>
        </div>
        <div class="controls" part="controls"></div>
      </div>`;
    this._preview = this._root.querySelector('.preview');
    this._canvas = this._root.querySelector('canvas');
    this._status = this._root.querySelector('.status');
    this._controls = this._root.querySelector('.controls');
    this._controls.hidden = this.getAttribute('controls') === 'false';
    this._zoomBtn = this._root.querySelector('.zoom');
    this._zoomBtn.addEventListener('click', () => {
      this._zoom = !this._zoom;
      this._zoomBtn.setAttribute('aria-pressed', String(this._zoom));
      this._zoomBtn.querySelector('span').textContent = this._zoom ? 'Vue complète' : 'Voir de près';
      this._zoomBtn.setAttribute('aria-label', this._zoom ? 'Vue complète' : 'Voir de près');
      this._schedule();
    });

    this._controls.addEventListener('change', (e) => {
      if (e.target.classList.contains('logo-file') && e.target.files[0]) this._setLogo(e.target.files[0]);
    });
    this._controls.addEventListener('click', (e) => {
      if (e.target.closest('.logo-remove')) return this._clearLogo();
      const btn = e.target.closest('button[data-group]');
      if (!btn) return;
      this._state = { ...this._state, [btn.dataset.group]: btn.dataset.id };
      this._state.positionId = this._position().id;
      this._syncControls();
      this._schedule();
      this._emitChange();
    });
    this._controls.addEventListener('input', (e) => {
      if (e.target.type === 'search') return this._filterThreads(e.target.value);
      if (!e.target.matches('input[data-line]')) return;
      // Une ligne par champ ; les lignes vides de fin sont ignorées
      const cleaned = this._cleanText(this._lineInputs.map((i) => i.value.replace(/\n/g, ' ')).join('\n').replace(/\n+$/, ''));
      this._state = { ...this._state, text: cleaned };
      this._touched = true;
      this._syncControls();
      this._schedule();
      this._emitChange();
    });
    // Pendant la saisie au clavier (mobile), l'aperçu se fait plus petit
    for (const type of ['focusin', 'focusout']) {
      this._controls.addEventListener(type, (e) => {
        if (!e.target.matches('input[data-line]')) return;
        this._typing = type === 'focusin';
        this._schedule();
      });
    }
    // Entrée : ligne suivante (ou fin de saisie sur la dernière)
    this._controls.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.matches('input[data-line]')) return;
      e.preventDefault();
      const next = this._lineInputs[Number(e.target.dataset.line) + 1];
      next ? next.focus() : e.target.blur();
    });
    // Glisser-déposer du logo
    for (const type of ['dragenter', 'dragover']) {
      this._controls.addEventListener(type, (e) => {
        const drop = e.target.closest('.drop');
        if (!drop) return;
        e.preventDefault();
        drop.classList.add('over');
      });
    }
    for (const type of ['dragleave', 'drop']) {
      this._controls.addEventListener(type, (e) => {
        const drop = e.target.closest('.drop');
        if (!drop) return;
        drop.classList.remove('over');
        if (type === 'drop') {
          e.preventDefault();
          if (e.dataTransfer.files[0]) this._setLogo(e.dataTransfer.files[0]);
        }
      });
    }
    this._built = true;
    this._buildControls();
  }

  _buildControls() {
    const c = this._config;
    if (c.accent) this.style.setProperty('--ep-accent', c.accent);
    this._root.querySelector('.caption').textContent = c.caption;
    this._live = this._root.querySelector('.live');
    const attrs = (key, it) => `data-group="${key}" data-id="${escapeHtml(it.id)}"`;
    const head = (title, value = '') => `<div class="step-head"><h3 class="step-title">${title}</h3><span class="step-value" data-value="${value}"></span></div>`;
    const swatch = (col) =>
      `<button type="button" class="swatch" ${attrs('colorId', col)} data-search="${escapeHtml(normalize(`${col.label} ${colorFamily(col.hex)}`))}" style="background:${escapeHtml(col.hex)}" aria-label="${escapeHtml(col.label)}" title="${escapeHtml(col.label)}"></button>`;
    const popular = c.colors.filter((col) => c.popularColors.includes(col.id));

    this._controls.innerHTML = `
      <section class="step" ${c.techniques.length > 1 ? '' : 'hidden'}>
        ${head('Technique', 'technique')}
        <div class="tech-grid">
          ${c.techniques.map((t) => `<button type="button" class="card" ${attrs('technique', t)}><strong>${escapeHtml(t.label)}</strong><span>${escapeHtml(t.description)}</span></button>`).join('')}
        </div>
      </section>
      <section class="step tech-broderie">
        ${head('Votre texte')}
        <div class="lines">
          ${Array.from({ length: c.maxLines }, (_, i) => `<label class="line"><span class="line-head"><span>Ligne ${i + 1}${i ? ' (facultatif)' : ''}</span><span class="count" aria-live="polite"></span></span>
            <input type="text" data-line="${i}" maxlength="${c.maxChars}" placeholder="${i ? '' : 'Votre prénom ou votre texte'}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="${i < c.maxLines - 1 ? 'next' : 'done'}"></label>`).join('')}
        </div>
      </section>
      <section class="step tech-dtf">
        ${head('Votre logo')}
        <label class="drop">
          ${ICONS.upload}
          <strong><span class="mouse">Déposez votre logo ici</span><span class="touch">Choisir votre logo</span></strong>
          <span><span class="mouse">ou cliquez pour le choisir · </span>fichier vectoriel (SVG ou PDF), 10 Mo max, pour une impression nette</span>
          <input type="file" class="logo-file" id="logo-file" accept=".svg,.pdf,.ai,image/svg+xml,application/pdf" aria-label="Choisir votre logo">
        </label>
        <div class="file" hidden><span class="thumb"></span><span class="name"></span><span class="size"></span>
          <button type="button" class="icon-btn logo-remove" aria-label="Retirer le logo">${ICONS.close}</button></div>
        <p class="note warn" hidden></p>
        <p class="note error" role="alert" hidden></p>
      </section>
      <section class="step tech-broderie">
        ${head('Police', 'font')}
        <div class="font-grid" style="grid-template-columns:repeat(${c.fonts.length % 3 === 0 || c.fonts.length > 6 ? 3 : 2}, minmax(0,1fr))">
          ${c.fonts.map((f) => `<button type="button" class="font-card" ${attrs('fontId', f)} aria-label="${escapeHtml(f.label)}"><i class="tick">${ICONS.check}</i><canvas data-font="${escapeHtml(f.id)}" aria-hidden="true"></canvas><span>${escapeHtml(f.label)}</span></button>`).join('')}
        </div>
      </section>
      <section class="step tech-broderie">
        ${head('Couleur du fil')}
        <div class="thread-current"><i></i><div><b></b><small>${escapeHtml(c.threadBrand)}</small></div></div>
        ${popular.length ? `<p class="label">Les plus demandées</p><div class="swatches">${popular.map(swatch).join('')}</div>` : ''}
        <details class="palette" ${popular.length ? '' : 'open'}>
          <summary>Tout le nuancier <span class="hint">${c.colors.length} couleurs</span></summary>
          <div class="palette-body">
            ${c.colors.length > 24 ? '<input type="search" id="thread-search" placeholder="Référence, couleur (rose, bleu…) ou nom anglais" aria-label="Chercher une couleur de fil par référence, couleur ou nom anglais" autocomplete="off">' : ''}
            <div class="swatches all">${c.colors.map(swatch).join('')}</div>
            <p class="empty" hidden>Aucune couleur ne correspond.</p>
          </div>
        </details>
      </section>
      <section class="step step-position">
        ${head('Emplacement', 'position')}
        <div class="chips">${c.positions.map((p) => `<button type="button" class="chip" ${attrs('positionId', p)}>${escapeHtml(p.label)}${p.view ? `<small>${escapeHtml(p.view)}</small>` : ''}</button>`).join('')}</div>
      </section>
      <section class="step">
        ${head('Taille', 'size')}
        <div class="seg" role="group" aria-label="Taille">${SIZES.map((s) => `<button type="button" ${attrs('sizeId', s)}>${s.label}</button>`).join('')}</div>
      </section>
      <div class="recap" aria-live="polite"><h3>Votre personnalisation</h3><dl></dl><p class="caption-m">${escapeHtml(c.caption)}</p></div>`;
    this._lineInputs = [...this._controls.querySelectorAll('input[data-line]')];
    this._thumbKeys = new Map();
    this._syncControls();
  }

  async _setLogo(file) {
    this._logoError = '';
    this._setStatus('Lecture du logo…');
    this._syncControls();
    try {
      const logo = await readLogo(file);
      this._logo = { ...logo, name: file.name, type: file.type || file.name.split('.').pop(), size: file.size };
      const dataUrl = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(file);
      });
      // Velo récupère le fichier d'origine pour l'enregistrer avec la commande
      this.dispatchEvent(new CustomEvent('embroidery-logo', {
        detail: { name: file.name, type: this._logo.type, size: file.size, dataUrl }, bubbles: true, composed: true,
      }));
    } catch (e) {
      this._logo = null;
      this._logoError = e.message;
    }
    this._setStatus('');
    this._syncControls();
    this._schedule();
    this._emitChange();
  }

  _clearLogo() {
    this._logo = null;
    this._logoError = '';
    this._controls.querySelector('.logo-file').value = '';
    this.dispatchEvent(new CustomEvent('embroidery-logo', { detail: null, bubbles: true, composed: true }));
    this._syncControls();
    this._schedule();
    this._emitChange();
  }

  _filterThreads(query) {
    const q = normalize(query).trim();
    let shown = 0;
    this._controls.querySelectorAll('.swatches.all .swatch').forEach((b) => {
      b.hidden = !!q && !b.dataset.search.includes(q);
      if (!b.hidden) shown++;
    });
    this._controls.querySelector('.empty').hidden = shown > 0;
  }

  _syncControls() {
    if (!this._lineInputs) return;
    const c = this._config, s = this._state;
    const dtf = s.technique === 'dtf';
    const technique = c.techniques.find((t) => t.id === s.technique) || TECHNIQUES[0];
    const pos = this._position(), font = this._font(), color = this._color(), size = this._size();
    const q = (sel) => this._controls.querySelector(sel);

    this._controls.querySelectorAll('.tech-dtf').forEach((el) => { el.hidden = !dtf; });
    this._controls.querySelectorAll('.tech-broderie').forEach((el) => { el.hidden = dtf; });
    const allowed = new Set(this._positions().map((p) => p.id));
    this._controls.querySelectorAll('button[data-group="positionId"]').forEach((b) => { b.hidden = !allowed.has(b.dataset.id); });
    this._controls.querySelectorAll('button[data-group]').forEach((b) => {
      b.setAttribute('aria-pressed', String(s[b.dataset.group] === b.dataset.id));
    });

    const where = pos.view ? `${pos.label} (${pos.view})` : pos.label;
    const values = { technique: technique.label, position: where, font: font.label, size: size.label };
    this._controls.querySelectorAll('[data-value]').forEach((el) => { el.textContent = values[el.dataset.value] || ''; });

    // Texte : compteur par ligne
    const lines = s.text.split('\n');
    this._lineInputs.forEach((input, i) => {
      const v = lines[i] || '';
      if (input.value !== v && this._root.activeElement !== input) input.value = v;
      // Compteur affiché seulement à l'approche de la limite
      const count = input.closest('.line').querySelector('.count');
      const n = input.value.length;
      count.textContent = n >= c.maxChars * 0.7 ? `${n}/${c.maxChars}` : '';
      count.classList.toggle('full', n >= c.maxChars);
    });
    q('.step-position').toggleAttribute('data-hide', allowed.size < 2);
    const steps = [...this._controls.querySelectorAll('.step')];
    const first = steps.find((el) => !el.hidden && !el.hasAttribute('data-hide'));
    steps.forEach((el) => el.classList.toggle('first', el === first));

    // Fil
    q('.thread-current i').style.background = color.hex;
    q('.thread-current b').textContent = color.label;

    // Logo
    const file = q('.file');
    file.hidden = !this._logo;
    if (this._logo) {
      file.querySelector('.name').textContent = this._logo.name;
      file.querySelector('.size').textContent = `${Math.max(1, Math.round(this._logo.size / 1024))} Ko`;
      const thumb = file.querySelector('.thumb');
      if (thumb.dataset.for !== this._logo.name) {
        thumb.dataset.for = this._logo.name;
        thumb.innerHTML = this._logo.kind === 'svg' ? `<img src="${this._logo.img.src}" alt="">` : ICONS.file;
      }
    }
    q('.drop').hidden = !!this._logo;
    const warn = q('.note.warn'), error = q('.note.error');
    warn.textContent = this._logo?.warning || '';
    warn.hidden = !this._logo?.warning;
    error.textContent = this._logoError || '';
    error.hidden = !this._logoError;

    // Récapitulatif
    const rows = [['Technique', technique.label], ['Emplacement', where]];
    const [ref, ...nameParts] = color.label.split(' · ');
    const colorName = nameParts.join(' · ') || color.label;
    if (dtf) rows.push(['Logo', this._logo ? this._logo.name : 'À ajouter']);
    else rows.push(['Texte', this._lines().join(' / ') || 'À saisir'], ['Police', font.label],
      ['Couleur du fil', { html: `<i style="background:${escapeHtml(color.hex)}"></i>${escapeHtml(colorName)}${nameParts.length ? `<small>${escapeHtml([c.threadBrand, ref].filter(Boolean).join(' '))}</small>` : ''}` }]);
    rows.push(['Taille', size.label]);
    q('.recap dl').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v.html ?? escapeHtml(v)}</dd>`).join('');
    // Résumé d'une ligne sous l'aperçu (mobile)
    this._live.textContent = (dtf
      ? [this._logo?.name || 'Ajoutez votre logo', where]
      : [this._lines().join(' / ') || 'Saisissez votre texte', font.label, colorName, where]).join(' · ');

    this._drawFontThumbs();
  }

  // Miniature de chaque police : le texte du client (ou « Prénom »), dessiné avec les vrais points de la police
  _drawFontThumbs() {
    if (!this._controls || this._state.technique === 'dtf') return;
    // Le premier mot suffit, et reste lisible dans une petite carte
    const sample = (this._lines()[0] || 'Prénom').split(/\s+/)[0].slice(0, 10);
    const ink = getComputedStyle(this).getPropertyValue('--ep-ink').trim() || '#5b4d43';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._controls.querySelectorAll('canvas[data-font]').forEach((cv) => {
      const font = this._config.fonts.find((f) => f.id === cv.dataset.font);
      const data = this._stitchFont(font, true);
      const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
      const key = `${sample}|${w}x${h}|${!!data}`;
      if (!w || !h || this._thumbKeys.get(cv) === key) return;
      this._thumbKeys.set(cv, key);
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      if (!data) return;
      const design = layoutStitches(data, [sample]);
      if (!design.count) return;
      const [x0, y0, x1, y1] = design.bbox;
      const s = Math.min((w * 0.9) / Math.max(x1 - x0, 1), (h * 0.8) / Math.max(y1 - y0, 1));
      const ox = (w - (x1 - x0) * s) / 2 - x0 * s, oy = (h - (y1 - y0) * s) / 2 - y0 * s;
      ctx.strokeStyle = ink;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(0.6, THREAD_MM * s * 0.8);
      ctx.beginPath();
      const g = design.segs;
      for (let i = 0; i < g.length; i += 4) {
        ctx.moveTo(g[i] * s + ox, g[i + 1] * s + oy);
        ctx.lineTo(g[i + 2] * s + ox, g[i + 3] * s + oy);
      }
      ctx.stroke();
    });
  }

  /* ----- événements ----- */

  _detail() {
    const font = this._font(), color = this._color(), pos = this._position(), size = this._size();
    const lines = this._lines();
    const technique = this._config.techniques.find((t) => t.id === this._state.technique) || TECHNIQUES[0];
    if (technique.id === 'dtf') {
      const logo = this._logo;
      return {
        technique: technique.id,
        logo: logo ? { name: logo.name, type: logo.type, size: logo.size } : null,
        position: { id: pos.id, label: pos.label },
        size: size.id,
        valid: !!logo,
        summary: `Technique : ${technique.label} | Logo : ${logo ? logo.name : '—'} | Emplacement : ${pos.view ? `${pos.label} (${pos.view})` : pos.label} | Taille : ${size.id}`,
      };
    }
    return {
      technique: technique.id,
      text: lines.join('\n'),
      lines,
      font: { id: font.id, label: font.label },
      color: { id: color.id, label: color.label, hex: color.hex },
      position: { id: pos.id, label: pos.label },
      size: size.id,
      valid: lines.length > 0,
      summary: `Technique : ${technique.label} | Texte : "${lines.join(' / ')}" | Police : ${font.label} | Fil : ${[this._config.threadBrand, color.label].filter(Boolean).join(' ')} | ` +
        `Emplacement : ${pos.view ? `${pos.label} (${pos.view})` : pos.label} | Taille : ${size.id}`,
    };
  }

  _emitChange() {
    clearTimeout(this._emitTimer);
    this._emitTimer = setTimeout(() => {
      this.dispatchEvent(new CustomEvent('embroidery-change', { detail: this._detail(), bubbles: true, composed: true }));
    }, 120);
  }

  _snapshot() {
    let detail;
    try {
      detail = { dataUrl: this._canvas.toDataURL('image/jpeg', 0.88), ...this._detail() };
    } catch (e) {
      detail = { error: "Image non exportable (CORS) : l'image produit doit être servie avec Access-Control-Allow-Origin." };
    }
    this.dispatchEvent(new CustomEvent('embroidery-snapshot', { detail, bubbles: true, composed: true }));
  }

  /* ----- chargement image ----- */

  _getImage(url) {
    if (!url) return null;
    let entry = this._images.get(url);
    if (entry) return entry;
    entry = { state: 'loading', img: null, cors: true };
    this._images.set(url, entry);
    const load = (cors) => {
      const img = new Image();
      if (cors) img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => Object.assign(entry, { state: 'ok', img, cors }) && this._schedule();
      img.onerror = () => (cors ? load(false) : (entry.state = 'error', this._schedule()));
      img.src = url;
    };
    load(true);
    return entry;
  }

  /* ----- rendu ----- */

  _schedule() {
    cancelAnimationFrame(this._raf);
    clearTimeout(this._drawTimer);
    const draw = () => {
      cancelAnimationFrame(this._raf);
      clearTimeout(this._drawTimer);
      this._draw();
    };
    this._raf = requestAnimationFrame(draw);
    // Repli si le navigateur suspend les animations (onglet ou cadre en arrière-plan)
    this._drawTimer = setTimeout(draw, 250);
  }

  _draw() {
    if (!this._canvas) return;
    const pos = this._position();
    const entry = this._getImage(pos.image || this._config.image);
    // Pas de photo configurée : rien à montrer au client
    this._root.querySelector('.stage-col').hidden = !entry;
    if (!entry) return;
    this._preview.toggleAttribute('data-loading', entry.state === 'loading');
    if (entry.state === 'loading') return this._setStatus('Chargement de la photo…');
    if (entry.state === 'error') return this._setStatus("La photo ne s'est pas chargée. Réessayez dans un instant.", true);
    this._setStatus('');

    const img = entry.img;
    const availW = this._preview.clientWidth || 480;
    // Mobile : aperçu plus bas pour qu'il reste visible pendant les choix
    const viewH = window.visualViewport?.height || window.innerHeight;
    const maxH = this.clientWidth < 760
      ? (this._typing ? 120 : Math.max(170, Math.min(viewH * 0.28, 230)))
      : Math.max(260, Math.min(window.innerHeight * 0.8, 900));
    const aspect = img.naturalHeight / img.naturalWidth;
    let cssW = availW, cssH = cssW * aspect;
    if (cssH > maxH) { cssH = maxH; cssW = cssH / aspect; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
    const cv = this._canvas;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    cv.style.width = `${cssW}px`;
    cv.style.height = `${cssH}px`;

    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    // Vue rapprochée : on agrandit virtuellement la photo pour que la zone remplisse l'aperçu,
    // la broderie est alors numérisée et rendue à haute résolution (les fils deviennent visibles).
    const z = pos.zone;
    const scale = this._zoom ? clamp(1 / (1.5 * Math.max(z.w, z.h)), 1, 8) : 1;
    const VW = W * scale, VH = H * scale;
    const ox = clamp(z.x * VW - W / 2, 0, VW - W), oy = clamp(z.y * VH - H / 2, 0, VH - H);
    ctx.drawImage(img, -ox, -oy, VW, VH);

    if (this._state.technique === 'dtf') {
      if (this._logo) this._drawPrint(ctx, VW, VH, ox, oy, W, H, pos, entry.cors);
    } else {
      const lines = this._lines();
      if (lines.length) this._drawEmbroidery(ctx, VW, VH, ox, oy, W, H, pos, lines, entry.cors);
    }
    if (this.getAttribute('debug') === 'true' && !this._zoom) this._drawZones(ctx, W, H, pos.image || this._config.image);
    this._drawFontThumbs();
  }

  _setStatus(msg, error = false) {
    if (!this._status) return;
    this._status.textContent = msg;
    this._status.classList.toggle('error', error);
  }

  // W, H : taille (éventuellement agrandie) de la photo ; ox, oy : décalage de la vue ; CW, CH : taille du canvas
  _drawEmbroidery(ctx, W, H, ox, oy, CW, CH, pos, lines, cors) {
    const font = this._font();
    const base = hexToRgb(this._color().hex);
    const size = this._size();
    const z = pos.zone;
    const zw = z.w * W, zh = z.h * H, cx = z.x * W - ox, cy = z.y * H - oy;
    const rot = ((z.rot || 0) * Math.PI) / 180;

    // 1. Points de la police numérisée, mis en page (en cache : couleur et zoom ne relancent pas la mise en page)
    const data = this._stitchFont(font);
    if (!data) return;
    const key = JSON.stringify([font.id, lines]);
    if (this._design?.key !== key) this._design = { key, ...layoutStitches(data, lines) };
    const design = this._design;
    if (!design.count) return;

    // 2. Échelle : le texte tient dans la zone ; le fil garde son épaisseur réelle à cette échelle
    const [x0, y0, x1, y1] = design.bbox;
    const mmW = Math.max(x1 - x0, 1), mmH = Math.max(y1 - y0, 1);
    const s = Math.min(zw / mmW, zh / mmH) * size.factor; // px par mm
    const r = (THREAD_MM / 2) * s;
    const pad = r * 3 + 2;
    const lw = Math.ceil(mmW * s + pad * 2), lh = Math.ceil(mmH * s + pad * 2);

    // 3. Rendu des fils, sur-échantillonné pour que chaque fil fasse plusieurs pixels de large
    this._renderer ??= new StitchRenderer();
    const gpu = this._renderer.ok;
    const k = Math.max(0.5, Math.min(clamp(6 / r, 1, 6), (gpu ? this._renderer.maxSize : 4096) / Math.max(lw, lh), Math.sqrt(16e6 / (lw * lh))));
    const rw = Math.ceil(lw * k), rh = Math.ceil(lh * k);
    const xf = [s * k, (pad - x0 * s) * k, (pad - y0 * s) * k];
    const layer = gpu
      ? this._renderer.render(design, rw, rh, xf, r * k, base, clamp((r - 0.8) / 2.2, 0, 1))
      : renderStitchesCanvas(design, rw, rh, xf, r * k, base);

    this._compose(ctx, layer, lw, lh, cx, cy, rot, CW, CH, cors, {
      shadow: 'rgba(0,0,0,0.45)', blur: Math.max(1, r * 1.6), offset: Math.max(0.5, r * 0.7), shade: 0.9,
    });
  }

  // DTF : le logo du client imprimé sur un film, posé à chaud — aplat net, léger brillant, suit les plis du tissu
  _drawPrint(ctx, W, H, ox, oy, CW, CH, pos, cors) {
    const size = this._size();
    const z = pos.zone;
    const zw = z.w * W * size.factor, zh = z.h * H * size.factor, cx = z.x * W - ox, cy = z.y * H - oy;
    const rot = ((z.rot || 0) * Math.PI) / 180;
    const aspect = this._logo.aspect;
    let lw = zw, lh = zw / aspect;
    if (lh > zh) { lh = zh; lw = zh * aspect; }
    lw = Math.max(1, Math.round(lw));
    lh = Math.max(1, Math.round(lh));
    const art = this._logoArt(lw, lh);
    if (!art) return;

    const layer = mkCanvas(lw, lh);
    const lc = layer.getContext('2d');
    lc.imageSmoothingQuality = 'high';
    lc.drawImage(art, 0, 0, lw, lh);
    lc.globalCompositeOperation = 'source-atop';
    const gloss = lc.createLinearGradient(0, 0, lw, lh);
    gloss.addColorStop(0, 'rgba(255,255,255,0.14)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0)');
    gloss.addColorStop(1, 'rgba(255,255,255,0.06)');
    lc.fillStyle = gloss;
    lc.fillRect(0, 0, lw, lh);

    const t = Math.max(lw, lh);
    this._compose(ctx, layer, lw, lh, cx, cy, rot, CW, CH, cors, {
      shadow: 'rgba(0,0,0,0.22)', blur: Math.max(1, t * 0.004), offset: Math.max(0.5, t * 0.0015), shade: 1,
    });
  }

  // Logo prêt à dessiner à la taille voulue : le SVG est vectoriel, le PDF est rendu par pdf.js (asynchrone)
  _logoArt(w, h) {
    const logo = this._logo;
    if (logo.kind === 'svg') return logo.img;
    const key = `${w}x${h}`;
    if (logo.cache?.key !== key && logo.pending !== key) {
      logo.pending = key;
      const viewport = logo.page.getViewport({ scale: w / logo.page.getViewport({ scale: 1 }).width });
      const c = mkCanvas(viewport.width, viewport.height);
      logo.page.render({ canvasContext: c.getContext('2d'), viewport, background: 'rgba(0,0,0,0)' }).promise
        .then(() => {
          if (this._logo !== logo) return;
          logo.cache = { key, canvas: c };
          this._schedule();
        })
        .catch(() => {});
    }
    return logo.cache?.canvas || null;
  }

  // Pose un calque (broderie ou impression) sur la photo : placement, ombre portée, plis du tissu
  _compose(ctx, layer, lw, lh, cx, cy, rot, CW, CH, cors, look) {
    // Placement (rotation) dans un calque plein cadre
    const emb = mkCanvas(CW, CH);
    const ec = emb.getContext('2d');
    ec.imageSmoothingQuality = 'high';
    ec.translate(cx, cy);
    ec.rotate(rot);
    ec.drawImage(layer, -lw / 2, -lh / 2, lw, lh);

    // Ombrage du tissu (plis) : capturé avant de poser le calque
    const cos = Math.abs(Math.cos(rot)), sin = Math.abs(Math.sin(rot));
    const bw0 = lw * cos + lh * sin, bh0 = lw * sin + lh * cos;
    const bx = Math.max(0, Math.floor(cx - bw0 / 2)), by = Math.max(0, Math.floor(cy - bh0 / 2));
    const bw = Math.min(CW - bx, Math.ceil(bw0)), bh = Math.min(CH - by, Math.ceil(bh0));
    let shade = null;
    if (cors && bw > 0 && bh > 0) {
      try {
        const data = ctx.getImageData(bx, by, bw, bh); // lecture unique par rendu
        const d = data.data;
        let sum = 0;
        const lum = new Float32Array(bw * bh);
        for (let i = 0, j = 0; i < d.length; i += 4, j++) {
          lum[j] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          sum += lum[j];
        }
        const avg = sum / lum.length;
        for (let i = 0, j = 0; i < d.length; i += 4, j++) {
          const v = clamp(128 + (lum[j] - avg) * 1.4, 0, 255);
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 255;
        }
        shade = mkCanvas(bw, bh);
        const sc = shade.getContext('2d');
        sc.putImageData(data, 0, 0);
        sc.globalCompositeOperation = 'destination-in';
        sc.drawImage(emb, -bx, -by);
      } catch {
        shade = null; // image "tainted" : on se passe de l'ombrage
      }
    }

    // Pose avec ombre portée (épaisseur du fil ou du film)
    ctx.save();
    ctx.shadowColor = look.shadow;
    ctx.shadowBlur = look.blur;
    ctx.shadowOffsetX = ctx.shadowOffsetY = look.offset;
    ctx.drawImage(emb, 0, 0);
    ctx.restore();

    if (shade) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = look.shade;
      ctx.drawImage(shade, bx, by);
      ctx.restore();
    }
  }

  _stitchFont(font, quiet = false) {
    const url = new URL(font.stitches || `${font.id}.json`, this._config.fontsBaseUrl || FONTS_BASE).href;
    let entry = stitchFonts.get(url);
    if (!entry) {
      entry = { state: 'loading', data: null };
      stitchFonts.set(url, entry);
      fetch(url)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
        .then((raw) => Object.assign(entry, { state: 'ok', data: decodeStitchFont(raw) }))
        .catch((e) => {
          entry.state = 'error';
          console.warn('[embroidery-preview] police de broderie introuvable', url, e);
        })
        .finally(() => this._schedule());
    }
    if (!quiet && entry.state === 'loading') this._setStatus('Chargement de la police…');
    if (!quiet && entry.state === 'error') this._setStatus('Police de broderie indisponible');
    return entry.data;
  }

  _drawZones(ctx, W, H, image) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.font = `600 ${Math.round(12 * (window.devicePixelRatio || 1))}px system-ui, sans-serif`;
    for (const p of this._config.positions) {
      if ((p.image || this._config.image) !== image) continue;
      const z = p.zone;
      ctx.save();
      ctx.translate(z.x * W, z.y * H);
      ctx.rotate(((z.rot || 0) * Math.PI) / 180);
      ctx.strokeStyle = p.id === this._state.positionId ? '#ff2d78' : 'rgba(255,45,120,0.5)';
      ctx.strokeRect((-z.w * W) / 2, (-z.h * H) / 2, z.w * W, z.h * H);
      ctx.fillStyle = '#ff2d78';
      ctx.fillText(p.label, (-z.w * W) / 2, (-z.h * H) / 2 - 6);
      ctx.restore();
    }
    ctx.restore();
  }
}

if (!customElements.get('embroidery-preview')) {
  customElements.define('embroidery-preview', EmbroideryPreview);
}
}
