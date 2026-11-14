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
  // Alphabet brodé par la machine d'Anaïs (tools/export_pes_font.py) : les points sont ceux de son logiciel
  { id: 'julian', label: 'Julian', family: 'system-ui', weight: 400, stitches: 'julian.json', stroke: 0.8 },
  // Polices d'Anaïs, numérisées automatiquement par tools/build_fonts.sh (noms d'atelier : la police d'origine n'est pas montrée)
  { id: 'romane', label: 'Romane', family: 'system-ui', weight: 400, stitches: 'romane.json' },
  { id: 'milan', label: 'Milan', family: 'system-ui', weight: 400, stitches: 'milan.json' },
  { id: 'alice', label: 'Alice', family: 'system-ui', weight: 400, stitches: 'alice.json' },
  { id: 'leandro', label: 'Leandro', family: 'system-ui', weight: 400, stitches: 'leandro.json' },
  { id: 'jokin', label: 'Jokin', family: 'system-ui', weight: 400, stitches: 'jokin.json' },
  { id: 'alma', label: 'Alma', family: 'system-ui', weight: 400, stitches: 'alma.json' },
  { id: 'luken', label: 'Luken', family: 'system-ui', weight: 400, stitches: 'luken.json' },
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
  minus: svg('<path d="M6 12h12"/>'),
  plus: svg('<path d="M12 6v12M6 12h12"/>'),
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

// Description et sections d'infos du produit (texte riche Wix) : on garde la mise en forme, sans script ni attribut actif
function cleanHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  doc.querySelectorAll('script, style, iframe, object, embed, form, link, meta').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) {
      if (/^on/i.test(a.name) || a.name === 'style' || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
    }
    if (el.tagName === 'A') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); }
  });
  return doc.body.firstElementChild.innerHTML;
}

// Produit Wix Stores transmis par la page (vue fusionnée) : options, variantes, prix, stock, champs texte, sections
function normalizeShop(shop) {
  if (!shop || typeof shop !== 'object' || !shop.name) return null;
  const options = (Array.isArray(shop.options) ? shop.options : []).map((o) => ({
    name: String(o.name || ''),
    type: o.type === 'color' ? 'color' : 'drop_down',
    choices: (Array.isArray(o.choices) ? o.choices : []).filter((ch) => ch.visible !== false).map((ch) => ({
      value: String(ch.value ?? ''), label: String(ch.label || ch.value || ''), inStock: ch.inStock !== false, media: ch.media || '',
    })),
  })).filter((o) => o.name && o.choices.length);
  return {
    name: String(shop.name),
    homeUrl: shop.homeUrl || '/',
    description: cleanHtml(shop.description),
    sections: (Array.isArray(shop.sections) ? shop.sections : []).filter((x) => x && x.title)
      .map((x) => ({ title: String(x.title), html: cleanHtml(x.description) })),
    media: (Array.isArray(shop.media) ? shop.media : []).filter(Boolean),
    options,
    variants: (Array.isArray(shop.variants) ? shop.variants : []).filter((v) => v && v.id && v.visible !== false),
    defaultVariantId: shop.defaultVariantId || null,
    currency: shop.currency || 'EUR',
    price: Number(shop.price) || 0,
    discountedPrice: Number(shop.discountedPrice ?? shop.price) || 0,
    formattedPrice: shop.formattedPrice || '',
    formattedDiscountedPrice: shop.formattedDiscountedPrice || shop.formattedPrice || '',
    inStock: shop.inStock !== false,
    maxQuantity: Number(shop.maxQuantity) > 0 ? Number(shop.maxQuantity) : 99,
    customTextFields: (Array.isArray(shop.customTextFields) ? shop.customTextFields : []).filter((f) => f && f.title)
      .map((f) => ({ title: String(f.title), maxLength: Number(f.maxLength) || 500, mandatory: !!f.mandatory })),
    paypal: shop.paypal !== false,
    paypalUrl: shop.paypalUrl || 'https://www.paypal.com/fr/digital-wallet/ways-to-pay/buy-now-pay-later',
  };
}

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
.line-head .full { color:var(--ep-ink); font-weight:600; }
.line input { width:100%; font:inherit; font-size:17px; padding:0 14px; min-height:48px; border:1px solid var(--ep-line); border-radius:var(--ep-radius);
  background:var(--ep-surface); color:inherit; }
textarea::placeholder, input::placeholder { color:#7f7064; }
.counts { display:flex; flex-wrap:wrap; gap:4px 16px; font-size:13px; color:var(--ep-muted); }
.counts .full { color:var(--ep-ink); font-weight:600; }
.font-grid { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px; }
.font-card { position:relative; font:inherit; display:flex; flex-direction:column; gap:4px; padding:8px 8px 10px; border:1px solid var(--ep-line);
  border-radius:var(--ep-radius); background:var(--ep-surface); color:inherit; cursor:pointer; min-width:0; }
.font-card canvas { width:100%; height:48px; }
@container (min-width: 760px) { .font-card canvas { height:56px; } }
.font-card span { font-size:12px; color:var(--ep-muted); text-align:center; line-height:1.2; min-height:2.4em; display:flex; align-items:center; justify-content:center; }
.font-card .tick { position:absolute; top:6px; right:6px; width:18px; height:18px; border-radius:50%; background:var(--ep-accent); color:var(--ep-surface); display:none; place-items:center; }
.font-card .tick svg { width:12px; height:12px; stroke-width:2.2; }
.font-card[aria-pressed="true"] .tick { display:grid; }
.swatches { display:flex; flex-wrap:wrap; gap:8px; }
.swatch { width:44px; height:44px; padding:0; border-radius:50%; border:3px solid var(--ep-surface); box-shadow:0 0 0 1px rgba(91,77,67,.25);
  cursor:pointer; flex:none; }
.swatch[aria-pressed="true"], .swatch[aria-checked="true"] { box-shadow:0 0 0 2px var(--ep-accent); }
.sr-only { position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }
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
/* ----- vue fusionnée : fiche produit ----- */
.crumbs { font-size:13px; color:var(--ep-muted); margin:0 0 16px; overflow-wrap:anywhere; }
.crumbs a { color:inherit; text-decoration:none; } .crumbs a:hover { text-decoration:underline; }
.crumbs span { margin:0 6px; }
.thumbs { display:flex; gap:8px; margin-top:10px; overflow-x:auto; padding:2px; scrollbar-width:thin; }
.thumbs[hidden] { display:none; }
.thumb-btn { position:relative; flex:none; width:64px; height:64px; padding:0; border:1px solid var(--ep-line); border-radius:var(--ep-radius);
  background:var(--ep-stage) center/cover no-repeat; cursor:pointer; }
.thumb-btn[aria-pressed="true"] { border-color:var(--ep-accent); box-shadow:inset 0 0 0 1px var(--ep-accent); }
.thumb-btn .tag { position:absolute; left:3px; right:3px; bottom:3px; font-size:10px; line-height:1.3; border-radius:3px; background:var(--ep-surface); color:var(--ep-ink); padding:1px 2px; }
.shop-head { display:flex; flex-direction:column; gap:10px; padding-bottom:20px; }
.shop-title { margin:0; font-family:var(--ep-display); font-weight:500; font-size:26px; line-height:1.2; color:var(--ep-ink); overflow-wrap:anywhere; text-wrap:balance; }
.step-title, .opt-value { overflow-wrap:anywhere; }
@container (min-width: 760px) { .shop-title { font-size:30px; } }
.price { margin:0; font-size:20px; display:flex; gap:10px; align-items:baseline; flex-wrap:wrap; }
.price s { font-size:15px; color:var(--ep-muted); }
.price .from { font-size:14px; color:var(--ep-muted); }
.paypal { margin:0; font-size:13px; color:var(--ep-muted); }
.paypal a { color:var(--ep-ink); }
.desc { font-size:14px; color:var(--ep-ink); }
.desc p { margin:0 0 8px; }
.desc.clamp { max-height:7.5em; overflow:hidden; -webkit-mask-image:linear-gradient(#000 60%, transparent); mask-image:linear-gradient(#000 60%, transparent); }
.link-btn { font:inherit; font-size:14px; padding:0; border:0; background:none; color:var(--ep-ink); text-decoration:underline; cursor:pointer; align-self:flex-start; min-height:32px; }
.link-btn[hidden] { display:none; }
.opt-select { width:100%; font:inherit; font-size:16px; padding:0 40px 0 14px; min-height:48px; border:1px solid var(--ep-line); border-radius:var(--ep-radius);
  background:var(--ep-surface); color:inherit; appearance:none; cursor:pointer;
  background-image:linear-gradient(45deg, transparent 50%, var(--ep-accent) 50%), linear-gradient(135deg, var(--ep-accent) 50%, transparent 50%);
  background-position:calc(100% - 20px) 50%, calc(100% - 15px) 50%; background-size:5px 5px; background-repeat:no-repeat; }
/* Choix épuisé : estompé et barré (le barré s'ajoute à la couleur, qui reste visible dessous) */
.opt-swatch[disabled] { opacity:.5; cursor:not-allowed;
  background-image:linear-gradient(to top left, transparent calc(50% - 1px), var(--ep-ink) calc(50% - 1px), var(--ep-ink) calc(50% + 1px), transparent calc(50% + 1px)) !important; }
.opt-error, .field-error { margin:0; font-size:14px; font-weight:600; line-height:1.4; color:var(--ep-danger); display:flex; gap:8px; align-items:baseline; }
.opt-error[hidden], .field-error[hidden] { display:none; }
.opt-error::before, .field-error::before { content:"!"; flex:none; width:18px; height:18px; border-radius:50%; background:var(--ep-danger); color:#fff; font-size:12px;
  line-height:18px; text-align:center; transform:translateY(-1px); }
.ctf textarea[aria-invalid="true"] { outline:2px solid var(--ep-danger); outline-offset:3px; }
.opt-select option:disabled { color:#8a7c70; }
.missing .opt-select, .missing .swatches { outline:2px solid var(--ep-danger); outline-offset:3px; border-radius:var(--ep-radius); }
.ctf textarea { width:100%; font:inherit; font-size:16px; padding:10px 14px; min-height:80px; border:1px solid var(--ep-line); border-radius:var(--ep-radius);
  background:var(--ep-surface); color:inherit; resize:vertical; }
/* Bloc « Personnaliser » : carte repliable (fermée par défaut), séparée des options du produit */
.perso { border:1px solid var(--ep-line); border-radius:12px; background:var(--ep-accent-soft); margin:8px 0 4px; }
.perso[open] { background:var(--ep-surface); }
.perso > summary { list-style:none; cursor:pointer; min-height:68px; padding:12px 16px; display:flex; align-items:center; gap:12px; border-radius:12px; }
.perso > summary::-webkit-details-marker { display:none; }
.perso > summary::after { content:""; width:9px; height:9px; border-right:1.5px solid var(--ep-accent); border-bottom:1.5px solid var(--ep-accent); transform:rotate(45deg) translateY(-3px); flex:none; }
.perso[open] > summary::after { transform:rotate(-135deg) translateY(-3px); }
.perso-text { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.perso-title { font-family:var(--ep-display); font-size:18px; font-weight:500; color:var(--ep-ink); }
.perso-title small { font-family:var(--ep-font); font-size:12px; color:var(--ep-muted); font-weight:400; margin-left:8px; letter-spacing:.03em; }
.perso-sub { font-size:13px; color:var(--ep-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.perso-body { padding:0 16px 6px; display:flex; flex-direction:column; }
/* Vue fusionnée : plus de numéros (options et personnalisation ne forment plus un seul formulaire), étapes plus compactes */
.merged .step-head::before { display:none; }
.merged .step { padding:18px 0; }
.merged .shop-head { padding-bottom:12px; gap:8px; }
.merged .paypal { font-size:12px; line-height:1.4; }
.merged .desc.clamp { max-height:4.6em; }
.merged .perso .step.first { border-top:0; padding-top:4px; }
.merged .step-title { font-size:17px; }
.buy { display:flex; flex-direction:column; gap:12px; padding:20px 0; border-top:1px solid var(--ep-line); }
.merged .buy { display:grid; grid-template-columns:auto minmax(0,1fr); gap:10px; align-items:stretch; padding:16px 0 20px; border-top:0; }
.merged .buy > * { grid-column:1 / -1; }
.merged .buy > .qty { grid-column:1; }
.merged .buy > .buy-btn[data-action="cart"] { grid-column:2; }
.merged .buy > .recap { margin:0; padding:12px 14px; }
.merged .recap h3 { font-size:14px; margin-bottom:8px; }
.merged .recap dl { font-size:13px; grid-template-columns:96px minmax(0,1fr); gap:4px 12px; }
.sticky-bar { display:none; }
@container (max-width: 759px) {
  .merged .sticky-bar:not([hidden]) { display:flex; position:sticky; bottom:0; z-index:6; align-items:center; gap:14px; margin:0 -4px;
    padding:10px 14px calc(10px + env(safe-area-inset-bottom, 0px)); background:var(--ep-page, var(--ep-bg)); border-top:1px solid var(--ep-line);
    box-shadow:0 -6px 12px -8px rgba(91,77,67,.3); }
  .merged .controls.typing .sticky-bar { display:none; }
  .sticky-bar .btn { flex:1; width:auto; }
  .merged .sticky-bar:not([hidden]) { flex-wrap:wrap; }
  .sticky-bar .bar-error { order:-1; flex:1 0 100%; margin:0; }
}
.bar-price { font-family:var(--ep-display); font-size:18px; white-space:nowrap; color:var(--ep-ink); }
.qty { display:inline-flex; align-items:center; border:1px solid var(--ep-line); border-radius:var(--ep-radius); background:var(--ep-surface); align-self:flex-start; }
.qty input { width:52px; text-align:center; font:inherit; font-size:16px; border:0; background:none; color:inherit; min-height:44px; -moz-appearance:textfield; }
.qty input::-webkit-inner-spin-button, .qty input::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
.btn { font:inherit; font-size:15px; letter-spacing:.03em; min-height:50px; padding:0 20px; border-radius:999px; cursor:pointer; width:100%;
  border:1px solid var(--ep-ink); background:var(--ep-surface); color:var(--ep-ink); }
.btn.primary { background:var(--ep-ink); color:var(--ep-surface); }
.btn[disabled], .btn[aria-disabled="true"] { opacity:.5; cursor:not-allowed; }
.btn[aria-busy="true"] { cursor:progress; }
.qty-btn[aria-disabled="true"] { opacity:.35; cursor:not-allowed; }
.sections details { border-top:1px solid var(--ep-line); }
.sections details:last-child { border-bottom:1px solid var(--ep-line); }
.sections summary { cursor:pointer; list-style:none; min-height:48px; display:flex; align-items:center; justify-content:space-between; font-size:15px; }
.sections summary::-webkit-details-marker { display:none; }
.sections summary::after { content:"+"; font-size:20px; color:var(--ep-accent); }
.sections details[open] summary::after { content:"−"; }
.sections .sec-body { font-size:14px; padding-bottom:14px; }
/* ===== Vue fusionnée, passe 2 : direction visuelle (crème / brun, titres Fahkwang, bouton principal plein) ===== */
.merged { --ep-radius:10px; --ep-soft-line:#efe6d8; --ep-field:#9a8c7d; }
.merged .controls { font-size:16px; line-height:1.55; }
.merged .preview { border-radius:16px; }
.merged .shop-head { gap:12px; padding-bottom:22px; }
.merged .shop-title { font-size:28px; line-height:1.15; letter-spacing:.005em; }
.merged .price { font-family:var(--ep-display); font-size:24px; line-height:1.2; gap:4px 12px; }
.merged .price .from { font-family:var(--ep-font); font-size:14px; }
.merged .price s { font-family:var(--ep-font); font-size:16px; }
.merged .paypal { font-size:13px; line-height:1.5; }
.merged .desc { font-size:16px; line-height:1.6; }
.merged .desc p { margin:0 0 10px; }
.merged .desc.clamp { max-height:4.8em; }
.merged .link-btn { font-size:15px; min-height:44px; margin-top:-8px; }
.merged .step { padding:22px 0; gap:14px; border-top:1px solid var(--ep-soft-line); }
.merged .step.first { border-top:0; padding-top:0; }
.merged .step-title { font-size:18px; line-height:1.3; }
.merged .step-value, .merged .hint, .merged .line-head, .merged .counts, .merged .empty { font-size:14px; }
.merged .label { font-size:14px; margin:0; }
.merged .shop-opt:first-of-type, .merged .shop-head + .step { border-top:1px solid var(--ep-soft-line); }
.merged .opt-select, .merged .line input, .merged .ctf textarea, .merged input[type=search] { border-color:var(--ep-field); border-radius:var(--ep-radius); }
.merged .opt-select { min-height:52px; }
.merged .line input { font-size:18px; min-height:52px; }
.merged .swatch[aria-pressed="true"], .merged .swatch[aria-checked="true"] { box-shadow:0 0 0 2px var(--ep-ink); }
.merged .card, .merged .font-card, details.palette { border-color:var(--ep-line); }
.merged details.palette, .merged .file, .merged .drop { border-radius:var(--ep-radius); }
.merged .perso { margin:12px 0 4px; border-radius:16px; }
.merged .perso[open] { border-color:#d9cdbb; }
.merged .perso > summary { min-height:72px; padding:14px 18px; border-radius:16px; }
.merged .perso-title { display:flex; flex-direction:column; gap:2px; font-size:19px; line-height:1.25; }
.merged .perso-title small { margin:0; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--ep-muted); }
.merged .perso-sub { font-size:14px; }
.merged .perso-body { padding:0 18px 8px; }
.merged .buy { gap:12px; padding:22px 0 26px; border-top:1px solid var(--ep-soft-line); }
.merged .buy > .qty { align-self:stretch; justify-content:space-between; border-color:var(--ep-field); border-radius:999px; }
.merged .qty input { width:44px; }
.merged .buy > .recap { margin:0 0 6px; padding:2px 0 2px 16px; background:none; border:0; border-left:2px solid var(--ep-accent); border-radius:0; }
.merged .recap h3 { font-size:16px; margin:0 0 10px; }
.merged .recap dl { font-size:14px; grid-template-columns:104px minmax(0,1fr); gap:6px 12px; }
.merged .recap dd { text-align:left; }
.merged .recap .caption-m { margin:12px 0 0; padding-top:0; border-top:0; font-size:13px; }
.merged .btn { min-height:54px; font-size:16px; letter-spacing:.02em; white-space:nowrap; padding:0 22px; border-width:1.5px; background:transparent; }
.merged .btn.primary { background:var(--ep-ink); color:#fff; }
@media (hover:hover) {
  .merged .btn:not(.primary):not([disabled]):not([aria-disabled="true"]):hover { background:var(--ep-accent-soft); }
  .merged .btn.primary:not([disabled]):not([aria-disabled="true"]):hover { background:#463a32; }
}
.merged .sections { margin-top:4px; }
.merged .sections details { border-top:1px solid var(--ep-soft-line); }
.merged .sections details:last-child { border-bottom:1px solid var(--ep-soft-line); }
.merged .sections summary { min-height:58px; gap:12px; font-family:var(--ep-display); font-size:16px; }
.merged .sections summary::after, .merged .sections details[open] summary::after { content:""; width:8px; height:8px; flex:none;
  border-right:1.5px solid var(--ep-ink); border-bottom:1.5px solid var(--ep-ink); transform:rotate(45deg) translateY(-2px); }
.merged .sections details[open] summary::after { transform:rotate(-135deg) translateY(-2px); }
.merged .sections .sec-body { font-size:15px; line-height:1.65; padding:0 0 20px; }
.merged .thumbs { gap:10px; margin-top:12px; padding:3px; }
.merged .thumb-btn { width:72px; height:72px; border-radius:10px; overflow:hidden; }
.merged .thumb-btn[aria-pressed="true"] { border-color:var(--ep-ink); box-shadow:0 0 0 1px var(--ep-ink); }
.merged .thumb-btn .tag { left:50%; right:auto; bottom:4px; transform:translateX(-50%); width:max-content; font-size:10.5px; line-height:1.45;
  padding:0 7px; border-radius:999px; background:rgba(255,248,241,.9); }
@container (min-width: 760px) {
  .merged.wrap { grid-template-columns:minmax(0,1.2fr) minmax(360px,1fr); gap:56px; }
  .merged .shop-title { font-size:36px; }
  .merged .price { font-size:26px; }
  .merged .step-title { font-size:19px; }
  .merged .btn.primary { box-shadow:0 6px 14px -8px rgba(91,77,67,.6); }
}
@container (max-width: 759px) {
  /* Seul l'aperçu reste collé en haut ; les vignettes défilent avec la page */
  .merged.wrap { gap:0; }
  .merged .stage-col { display:contents; }
  .merged .stage-col[hidden] { display:none; }
  .merged .preview { position:sticky; top:var(--ep-sticky-top, 0px); z-index:5; margin-top:8px;
    box-shadow:0 0 0 8px var(--ep-page, var(--ep-bg)), 0 12px 16px -10px rgba(91,77,67,.4); }
  .merged .preview .live { position:absolute; left:8px; bottom:8px; z-index:1; max-width:calc(100% - 72px); padding:6px 12px; border:0; border-radius:999px;
    box-shadow:0 1px 3px rgba(91,77,67,.18); background:rgba(255,255,255,.93); font-size:12.5px; line-height:1.3; }
  .merged .thumbs { margin-top:16px; }
  .merged .controls { margin-top:16px; }
  .merged .line { scroll-margin-top:290px; }
  .merged .tech-grid { grid-template-columns:1fr; }
  .merged .card { min-height:64px; }
  /* Carte repliée : une carte ; dépliée : pleine largeur, sans cadre latéral, pour ne pas rétrécir le contenu */
  .merged .perso:not([open]) > summary { padding:14px 16px; }
  .merged .perso[open] { border-width:1px 0; border-radius:0; background:transparent; }
  .merged .perso[open] > summary { padding:14px 0; border-radius:0; }
  .merged .perso-body { padding:0 0 8px; }
  .merged .buy { grid-template-columns:auto minmax(0,1fr); }
  .merged .buy > .buy-btn[data-action="cart"] { padding:0 12px; letter-spacing:.01em; }
  .merged .bar-price { font-size:17px; }
  .merged .sticky-bar:not([hidden]) { gap:12px; padding-inline:16px; }
  /* Place pour la bulle de discussion Wix, fixée en bas à droite de l'écran (réglable par --ep-bar-inset) */
  .merged .sticky-bar:not([hidden]) { padding-right:var(--ep-bar-inset, 72px); }
  .merged .sticky-bar .btn { flex:1 1 auto; min-width:0; min-height:48px; padding:0 14px; }
}
@media (prefers-reduced-motion: no-preference) {
  .merged .btn { transition:background-color .15s, color .15s, box-shadow .15s; }
}
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
    return ['config', 'state', 'debug', 'controls', 'request-snapshot', 'shop-status'];
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
    // Vue fusionnée : choix d'options, quantité, champs texte du produit, photo affichée hors aperçu
    this._sel = {};
    this._qty = 1;
    this._ctf = {};
    this._photo = null;
    this._shopStatus = { busy: false, error: '' };
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
    } else if (name === 'shop-status') {
      // La page indique l'ajout au panier en cours ou son échec
      try { this._shopStatus = { busy: false, error: '', ...JSON.parse(value || '{}') }; } catch { this._shopStatus = { busy: false, error: '' }; }
      this._syncShop();
      return;
    }
    this._schedule();
  }

  /* ----- config & état ----- */

  _normalizeConfig(c) {
    return {
      image: c.image || '',
      shop: normalizeShop(c.shop),
      positions: Array.isArray(c.positions) && c.positions.length ? c.positions : DEFAULT_POSITIONS,
      colors: Array.isArray(c.colors) && c.colors.length ? c.colors : DEFAULT_COLORS,
      fonts: Array.isArray(c.fonts) && c.fonts.length ? c.fonts : DEFAULT_FONTS,
      maxLines: clamp(Number(c.maxLines) || 3, 1, 5),
      maxChars: clamp(Number(c.maxChars) || 20, 1, 60),
      defaultText: typeof c.defaultText === 'string' ? c.defaultText : '',
      accent: c.accent || null,
      fontsBaseUrl: c.fontsBaseUrl || null,
      // Aperçu : 'flat' = la police en aplat, couleur du fil ; 'threads' = rendu des points brodés (relief, ombres)
      render: c.render === 'threads' ? 'threads' : 'flat',
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
      <nav class="crumbs" aria-label="Fil d'Ariane" hidden></nav>
      <div class="wrap">
        <div class="stage-col">
          <div class="preview" part="preview">
            <canvas role="img" aria-label="Aperçu de votre personnalisation"></canvas>
            <div class="status" aria-live="polite"></div>
            <button type="button" class="zoom" aria-pressed="false" aria-label="Voir de près">${ICONS.zoom}<span>Voir de près</span></button>
          </div>
          <div class="thumbs" role="group" aria-label="Photos du produit" hidden></div>
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
    this._thumbs = this._root.querySelector('.thumbs');
    this._thumbs.addEventListener('click', (e) => {
      const b = e.target.closest('.thumb-btn');
      if (!b) return;
      // Vue d'une zone : retour à l'aperçu de la personnalisation ; autre photo : affichée telle quelle
      const img = (p) => p.image || this._config.image;
      const pos = this._config.positions.find((p) => img(p) === b.dataset.url);
      if (pos) {
        this._photo = null;
        if (img(this._position()) !== b.dataset.url) this._state = { ...this._state, positionId: (this._positions().find((p) => img(p) === b.dataset.url) || pos).id };
        this._syncControls();
        this._emitChange();
      } else {
        this._photo = b.dataset.url;
      }
      this._syncShop();
      this._schedule();
    });
    this._zoomBtn.addEventListener('click', () => {
      this._zoom = !this._zoom;
      this._zoomBtn.setAttribute('aria-pressed', String(this._zoom));
      this._zoomBtn.querySelector('span').textContent = this._zoom ? 'Vue complète' : 'Voir de près';
      this._zoomBtn.setAttribute('aria-label', this._zoom ? 'Vue complète' : 'Voir de près');
      this._schedule();
    });

    this._controls.addEventListener('change', (e) => {
      if (e.target.classList.contains('logo-file') && e.target.files[0]) this._setLogo(e.target.files[0]);
      if (e.target.matches('select[data-opt]')) this._choose(e.target.dataset.opt, e.target.value);
      if (e.target.matches('.qty input')) e.target.value = this._qty;
    });
    this._controls.addEventListener('click', (e) => {
      if (e.target.closest('.logo-remove')) return this._clearLogo();
      if (this._onShopClick(e)) return;
      const btn = e.target.closest('button[data-group]');
      if (!btn) return;
      this._photo = null;
      this._state = { ...this._state, [btn.dataset.group]: btn.dataset.id };
      this._state.positionId = this._position().id;
      this._syncControls();
      this._schedule();
      this._emitChange();
    });
    this._controls.addEventListener('input', (e) => {
      if (e.target.type === 'search') return this._filterThreads(e.target.value);
      if (e.target.matches('[data-ctf]')) { this._ctf[e.target.dataset.ctf] = e.target.value; this._revalidate(); return this._syncShop(); }
      if (e.target.matches('.qty input')) { this._qty = clamp(Math.round(Number(e.target.value)) || 1, 1, this._config.shop?.maxQuantity || 99); return this._syncShop(); }
      if (!e.target.matches('input[data-line]')) return;
      this._photo = null;
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
        this._controls.classList.toggle('typing', this._typing);
        this._schedule();
      });
    }
    // Ouverture du bloc « Personnaliser » : les miniatures de police ne se dessinent qu'une fois visibles
    this._controls.addEventListener('toggle', (e) => {
      if (!e.target.matches('details.perso')) return;
      e.target.querySelector(':scope > summary')?.setAttribute('aria-expanded', String(e.target.open));
      this._persoSeen = true;
      this._drawFontThumbs();
      this._schedule();
    }, true);
    // Entrée : ligne suivante (ou fin de saisie sur la dernière)
    this._controls.addEventListener('keydown', (e) => {
      if (e.target.matches('.opt-swatch')) return this._onSwatchKey(e);
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
      `<button type="button" class="swatch" ${attrs('colorId', col)} data-search="${escapeHtml(normalize(`${col.label} ${colorFamily(col.hex)}`))}" style="background:${escapeHtml(col.hex)}" aria-label="Fil ${escapeHtml(colorFamily(col.hex).split(' ')[0])}"></button>`;
    const popular = c.colors.filter((col) => c.popularColors.includes(col.id));
    // Vue fusionnée : pas de zone live sur le récap (il serait relu à chaque lettre saisie)
    const recap = `<div class="recap" ${c.shop ? '' : 'aria-live="polite"'}><h3>Votre personnalisation</h3><dl></dl><p class="caption-m">${escapeHtml(c.caption)}</p></div>`;

    this._controls.innerHTML = `${this._shopTopHtml()}
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
        ${popular.length ? `<p class="label">Les plus demandées</p><div class="swatches">${popular.map(swatch).join('')}</div>` : ''}
        <details class="palette" ${popular.length ? '' : 'open'}>
          <summary>Tout le nuancier <span class="hint">${c.colors.length} couleurs</span></summary>
          <div class="palette-body">
            ${c.colors.length > 24 ? '<input type="search" id="thread-search" placeholder="Chercher une couleur (rose, bleu…)" aria-label="Chercher une couleur de fil" autocomplete="off">' : ''}
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
      ${c.shop ? '</div></details>' : recap}
      ${this._shopBottomHtml(recap)}`;
    this._buildShopChrome();
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
    const rows = c.shop && c.techniques.length < 2 ? [['Emplacement', where]] : [['Technique', technique.label], ['Emplacement', where]];
    if (dtf) rows.push(['Logo', this._logo ? this._logo.name : 'À ajouter']);
    else rows.push(['Texte', this._lines().join(' / ') || 'À saisir'], ['Police', font.label],
      ['Couleur du fil', { html: `<i style="background:${escapeHtml(color.hex)}"></i>` }]);
    rows.push(['Taille', size.label]);
    q('.recap dl').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v.html ?? escapeHtml(v)}</dd>`).join('');
    // Vue fusionnée : le récapitulatif n'a de sens que si l'article est personnalisé
    q('.recap').hidden = !!c.shop && !this._personalised();
    // Résumé d'une ligne sous l'aperçu (mobile)
    this._live.textContent = (dtf
      ? [this._logo?.name || 'Ajoutez votre logo', where]
      : [this._lines().join(' / ') || 'Saisissez votre texte', font.label, where]).join(' · ');

    this._drawFontThumbs();
    this._syncShop();
  }

  /* ----- vue fusionnée : fiche produit ----- */

  _shopTopHtml() {
    const shop = this._config.shop;
    if (!shop) return '';
    const opt = (o, i) => {
      const id = `opt-${i}`;
      const err = `${id}-err`;
      const body = o.type === 'color'
        ? `<div class="swatches" role="radiogroup" aria-labelledby="${id}" aria-describedby="${err}" aria-required="true">${o.choices.map((ch) =>
          `<button type="button" class="swatch opt-swatch" role="radio" aria-checked="false" tabindex="-1" data-opt="${escapeHtml(o.name)}" data-val="${escapeHtml(ch.value)}" style="background:${escapeHtml(ch.value)}" aria-label="${escapeHtml(ch.label)}${ch.inStock ? '' : ', épuisé'}" title="${escapeHtml(ch.label)}${ch.inStock ? '' : ' (épuisé)'}" ${ch.inStock ? '' : 'disabled'}></button>`).join('')}</div>`
        : `<select class="opt-select" data-opt="${escapeHtml(o.name)}" aria-labelledby="${id}" aria-describedby="${err}" aria-required="true"><option value="">Choisir une option</option>${o.choices.map((ch) =>
          `<option value="${escapeHtml(ch.value)}" ${ch.inStock ? '' : 'disabled'}>${escapeHtml(ch.label)}${ch.inStock ? '' : ' (épuisé)'}</option>`).join('')}</select>`;
      return `<section class="step shop-opt" data-optname="${escapeHtml(o.name)}"><div class="step-head"><h3 class="step-title" id="${id}">${escapeHtml(o.name)}</h3><span class="step-value opt-value"></span></div>${body}<p class="opt-error" id="${err}" hidden></p></section>`;
    };
    return `
      <header class="shop-head">
        <h1 class="shop-title">${escapeHtml(shop.name)}</h1>
        <p class="price" aria-live="polite" aria-atomic="true"></p>
        <p class="paypal" hidden></p>
        ${shop.description ? `<div class="desc clamp">${shop.description}</div><button type="button" class="link-btn more" aria-expanded="false">Lire plus</button>` : ''}
      </header>
      ${shop.options.map(opt).join('')}
      ${shop.customTextFields.map((f, i) => `<section class="step ctf"><div class="step-head"><h3 class="step-title"><label for="ctf-${i}">${escapeHtml(f.title)}${f.mandatory ? '<span aria-hidden="true"> *</span>' : ''}</label></h3></div>
        <textarea id="ctf-${i}" data-ctf="${escapeHtml(f.title)}" maxlength="${f.maxLength}" aria-describedby="ctf-${i}-err" ${f.mandatory ? 'required aria-required="true"' : ''}></textarea>
        <p class="field-error" id="ctf-${i}-err" hidden></p></section>`).join('')}
      <details class="perso"><summary aria-expanded="false"><span class="perso-text"><span class="perso-title"><small>Facultatif</small>Personnaliser cet article</span><span class="perso-sub"></span></span></summary><div class="perso-body">`;
  }

  _shopBottomHtml(recap = '') {
    const shop = this._config.shop;
    if (!shop) return '';
    return `
      <div class="buy">
        ${recap}
        <div class="qty" role="group" aria-label="Choisir la quantité">
          <button type="button" class="icon-btn qty-btn" data-step="-1" aria-label="Diminuer la quantité">${ICONS.minus}</button>
          <input type="number" inputmode="numeric" min="1" max="${shop.maxQuantity}" value="1" aria-label="Quantité">
          <button type="button" class="icon-btn qty-btn" data-step="1" aria-label="Augmenter la quantité">${ICONS.plus}</button>
        </div>
        <button type="button" class="btn primary buy-btn" data-action="cart"></button>
        <button type="button" class="btn buy-btn" data-action="buy">Commander et payer</button>
        <p class="note error shop-error" role="alert" hidden></p>
        <p class="sr-only sr-status" role="status" aria-live="polite"></p>
      </div>
      ${shop.sections.length ? `<div class="sections">${shop.sections.map((x) => `<details><summary>${escapeHtml(x.title)}</summary><div class="sec-body">${x.html}</div></details>`).join('')}</div>` : ''}
      <div class="sticky-bar" role="group" aria-label="Achat rapide" hidden inert aria-hidden="true"><p class="note error shop-error bar-error" role="alert" hidden></p><span class="bar-price"></span><button type="button" class="btn primary buy-btn" data-action="cart"></button></div>`;
  }

  _buildShopChrome() {
    const shop = this._config.shop;
    const crumbs = this._root.querySelector('.crumbs');
    crumbs.hidden = !shop;
    this._root.querySelector('.wrap').classList.toggle('merged', !!shop);
    this._io?.disconnect();
    // Mobile fusionné : le résumé d'une ligne se superpose à l'aperçu (sticky) ; sinon il reste sous l'aperçu
    const liveHost = shop ? this._preview : this._root.querySelector('.stage-col');
    if (this._live && this._live.parentNode !== liveHost) liveHost.insertBefore(this._live, shop ? this._status : this._root.querySelector('.caption'));
    if (!shop) { this._thumbs.hidden = true; return; }
    // Barre d'achat mobile : visible tant que le bloc d'achat n'est pas à l'écran
    const bar = this._controls.querySelector('.sticky-bar'), buy = this._controls.querySelector('.buy');
    if (bar && buy && 'IntersectionObserver' in window) {
      // Masquée aussi pour les technologies d'assistance (inert) tant que le vrai bloc d'achat est à l'écran
      this._io = new IntersectionObserver((entries) => {
        const hide = entries[entries.length - 1].isIntersecting;
        bar.hidden = hide;
        bar.toggleAttribute('inert', hide);
        bar.setAttribute('aria-hidden', String(hide));
        this._syncError();
      });
      this._io.observe(buy);
    }
    crumbs.innerHTML = `<a href="${escapeHtml(shop.homeUrl)}">Accueil</a><span aria-hidden="true">/</span>${escapeHtml(shop.name)}`;
    // Vignettes : d'abord les vues avec zones (aperçu de la personnalisation), puis les autres photos du produit
    const views = [...new Set(this._config.positions.map((p) => p.image || this._config.image).filter(Boolean))];
    // Vignette légère pour les photos Wix ; les autres adresses sont utilisées telles quelles
    const small = (u) => (/^https:\/\/static\.wixstatic\.com\/media\/[^/]+$/.test(u) ? `${u}/v1/fill/w_128,h_128,q_80/t.jpg` : u);
    const items = [...views.map((url) => ({ url, tag: 'Aperçu' })), ...shop.media.filter((u) => !views.includes(u)).map((url) => ({ url }))];
    this._thumbs.hidden = items.length < 2;
    this._thumbs.innerHTML = items.map((it, i) => `<button type="button" class="thumb-btn" data-url="${escapeHtml(it.url)}" style="background-image:url('${escapeHtml(small(it.url))}')"
      aria-label="${it.tag ? 'Aperçu de votre personnalisation' : `Photo ${i + 1}`}">${it.tag ? `<span class="tag">${it.tag}</span>` : ''}</button>`).join('');
  }

  // Variante correspondant aux options choisies (toutes les options doivent être choisies)
  _variant() {
    const shop = this._config.shop;
    if (!shop.options.length) return shop.variants[0] || (shop.defaultVariantId ? { id: shop.defaultVariantId } : null);
    if (shop.options.some((o) => !this._sel[o.name])) return null;
    const label = (o) => o.choices.find((ch) => ch.value === this._sel[o.name])?.label;
    return shop.variants.find((v) => shop.options.every((o) => {
      const val = v.choices?.[o.name];
      return val === this._sel[o.name] || val === label(o);
    })) || null;
  }

  _choose(name, value) {
    const shop = this._config.shop;
    const o = shop.options.find((x) => x.name === name);
    if (!o) return;
    this._sel = { ...this._sel, [name]: value || undefined };
    this._revalidate();
    // Photo liée au choix (couleur…) : montrée comme le ferait la fiche Wix
    const media = o.choices.find((ch) => ch.value === value)?.media;
    if (media && !this._config.positions.some((p) => (p.image || this._config.image) === media)) this._photo = media;
    this._syncShop();
    this._schedule();
  }

  _onShopClick(e) {
    const shop = this._config.shop;
    if (!shop) return false;
    const sw = e.target.closest('.opt-swatch');
    if (sw) { this._choose(sw.dataset.opt, sw.dataset.val); return true; }
    const q = e.target.closest('.qty-btn');
    if (q) { this._qty = clamp(this._qty + Number(q.dataset.step), 1, shop.maxQuantity); this._syncShop(); return true; }
    if (e.target.closest('.more')) {
      const d = this._controls.querySelector('.desc');
      const open = d.classList.toggle('clamp');
      e.target.closest('.more').textContent = open ? 'Lire plus' : 'Lire moins';
      e.target.closest('.more').setAttribute('aria-expanded', String(!open));
      return true;
    }
    const buy = e.target.closest('.buy-btn');
    if (buy) {
      // Le message d'erreur s'affiche près du bouton pressé (bloc d'achat ou barre mobile)
      this._pressed = buy.closest('.sticky-bar') ? 'bar' : 'buy';
      this._buy(buy.dataset.action);
      return true;
    }
    return false;
  }

  _onSwatchKey(e) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const group = [...e.target.closest('.swatches').querySelectorAll('.opt-swatch:not([disabled])')];
    const i = group.indexOf(e.target);
    let n;
    if (step) n = (i + step + group.length) % group.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = group.length - 1;
    else return;
    e.preventDefault();
    group[n].focus();
    this._choose(group[n].dataset.opt, group[n].dataset.val);
  }

  // Ce qui empêche l'achat : options ou champs obligatoires manquants, combinaison indisponible, produit épuisé
  _validate() {
    const shop = this._config.shop;
    const missing = shop.options.filter((o) => !this._sel[o.name]).map((o) => o.name);
    const emptyFields = shop.customTextFields.filter((f) => f.mandatory && !(this._ctf[f.title] || '').trim()).map((f) => f.title);
    const variant = this._variant();
    const list = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}` : a[0]);
    let error = '';
    if (!shop.inStock) error = 'Cet article est épuisé pour le moment.';
    else if (missing.length) error = `Choisissez ${list(missing.map((n) => `votre ${n.toLowerCase()}`))}.`;
    else if (emptyFields.length) error = `Il reste à compléter : ${emptyFields.join(', ')}.`;
    else if (!variant) error = shop.options.length ? "Cette combinaison n'est pas disponible. Essayez un autre choix." : "Cet article n'est pas disponible pour le moment.";
    else if (variant.inStock === false) error = "Cette combinaison est épuisée. Essayez un autre choix.";
    return { error, missing, emptyFields, variant };
  }

  // Après un premier refus, le message suit les choix du client et disparaît dès que tout est bon
  _revalidate() {
    if (!this._invalid) return;
    const v = this._validate();
    this._invalid = !!v.error;
    if (!v.missing.length && !v.emptyFields.length) this._missing = false;
    this._shopStatus = { busy: false, error: v.error };
  }

  _personalised() {
    return this._state.technique === 'dtf' ? !!this._logo : this._lines().length > 0;
  }

  _buy(action) {
    const shop = this._config.shop;
    if (this._shopStatus.busy) return;
    const { error, missing, emptyFields, variant } = this._validate();
    this._invalid = !!error;
    this._missing = !!(missing.length || emptyFields.length);
    if (error) {
      this._shopStatus = { busy: false, error };
      this._syncShop();
      // Le focus va au premier élément à corriger, puis la page défile jusqu'à lui
      const target = this._controls.querySelector('.shop-opt.missing select, .shop-opt.missing .opt-swatch[tabindex="0"], .ctf textarea[aria-invalid="true"]');
      // Saut direct : un défilement doux est interrompu par le focus et par la barre d'achat qui se masque
      const smooth = 'auto';
      if (target) {
        target.scrollIntoView({ block: 'center', behavior: smooth });
        target.focus({ preventScroll: true });
      } else if (this._pressed !== 'bar') {
        this._controls.querySelector('.shop-error:not(.bar-error)')?.scrollIntoView({ block: 'center', behavior: smooth });
      }
      return;
    }
    this._action = action;
    this._shopStatus = { busy: true, error: '' };
    this._syncShop();
    const customText = Object.fromEntries(Object.entries(this._ctf).filter(([, v]) => (v || '').trim()));
    this.dispatchEvent(new CustomEvent('shop-action', {
      detail: { action, variantId: variant.id, quantity: this._qty, customText, personalised: this._personalised(), embroidery: this._detail() },
      bubbles: true, composed: true,
    }));
  }

  _fmt(n) {
    try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: this._config.shop.currency }).format(n); } catch { return `${n.toFixed(2)} €`; }
  }

  _syncShop() {
    const shop = this._config.shop;
    if (!shop || !this._controls) return;
    const q = (sel) => this._controls.querySelector(sel);
    const variant = this._variant();
    // Prix : celui de la variante choisie ; sinon le prix du produit, ou « À partir de » si les variantes diffèrent
    const v = variant?.price != null ? variant : null;
    const prices = shop.variants.map((x) => Number(x.discountedPrice ?? x.price)).filter((n) => n > 0);
    const min = prices.length ? Math.min(...prices) : shop.discountedPrice;
    const varies = !v && prices.length && Math.max(...prices) !== min;
    const now = v ? Number(v.discountedPrice ?? v.price) : varies ? min : shop.discountedPrice;
    const was = v ? Number(v.price) : varies ? 0 : shop.price;
    const fNow = v ? (v.formattedDiscountedPrice || v.formattedPrice) : varies ? this._fmt(min) : shop.formattedDiscountedPrice;
    // Réécrit seulement si le contenu change : la zone live n'annonce pas le même prix à chaque frappe
    const priceHtml = `${varies ? '<span class="from">Dès</span> ' : ''}<span class="now">${escapeHtml(fNow || this._fmt(now))}</span>${was > now ? ` <s>${escapeHtml(v?.formattedPrice || shop.formattedPrice || this._fmt(was))}</s>` : ''}`;
    if (this._priceHtml !== priceHtml) { this._priceHtml = priceHtml; q('.price').innerHTML = priceHtml; }
    // Paiement en 4 fois PayPal (entre 30 € et 2 000 €), comme sur la fiche Wix
    const pp = q('.paypal');
    const ppOk = shop.paypal && now >= 30 && now <= 2000;
    pp.hidden = !ppOk;
    if (ppOk) {
      const ppHtml = `Payez en 4 fois sans frais : 4 × ${escapeHtml(this._fmt(Math.round((now / 4) * 100) / 100))}. Attention ! Un crédit coûte de l'argent et doit être remboursé. <a href="${escapeHtml(shop.paypalUrl)}" target="_blank" rel="noopener" aria-label="En savoir plus sur le paiement en 4 fois (nouvel onglet)">En savoir plus</a>`;
      if (this._ppHtml !== ppHtml) { this._ppHtml = ppHtml; pp.innerHTML = ppHtml; }
    }
    const more = q('.more');
    if (more) more.hidden = q('.desc').scrollHeight <= q('.desc').clientHeight + 2 && q('.desc').classList.contains('clamp');

    // Options
    this._controls.querySelectorAll('.shop-opt').forEach((sec) => {
      const name = sec.dataset.optname;
      const o = shop.options.find((x) => x.name === name);
      const val = this._sel[name];
      sec.querySelector('.opt-value').textContent = o.choices.find((ch) => ch.value === val)?.label || '';
      // Choix manquant après un refus : contour rouge + message juste sous l'option
      const flagged = !!this._missing && !val;
      sec.classList.toggle('missing', flagged);
      const control = sec.querySelector('select, .swatches');
      control.setAttribute('aria-invalid', String(flagged));
      const optErr = sec.querySelector('.opt-error');
      optErr.textContent = flagged ? `Choisissez votre ${name.toLowerCase()}` : '';
      optErr.hidden = !flagged;
      const sel = sec.querySelector('select');
      if (sel && sel.value !== (val || '')) sel.value = val || '';
      // Groupe radio : une seule tabulation (choix actuel, sinon premier choix disponible), flèches pour le reste
      const radios = [...sec.querySelectorAll('.opt-swatch')];
      const stop = radios.find((b) => !b.disabled && b.dataset.val === val) || radios.find((b) => !b.disabled);
      radios.forEach((b) => {
        b.setAttribute('aria-checked', String(b.dataset.val === val));
        b.tabIndex = b === stop ? 0 : -1;
      });
    });
    // Champs texte obligatoires restés vides
    this._controls.querySelectorAll('.ctf').forEach((sec) => {
      const ta = sec.querySelector('textarea');
      const flagged = !!this._missing && ta.required && !ta.value.trim();
      ta.setAttribute('aria-invalid', String(flagged));
      const fe = sec.querySelector('.field-error');
      fe.textContent = flagged ? 'Ce champ est à remplir' : '';
      fe.hidden = !flagged;
    });

    // Achat
    const qty = q('.qty input');
    if (qty && this._root.activeElement !== qty) qty.value = this._qty;
    const busy = this._shopStatus.busy;
    const action = this._action || 'cart';
    const label = (a) => (!shop.inStock ? 'Épuisé'
      : a === 'buy' ? (busy && action === 'buy' ? 'Commande en cours…' : 'Commander et payer')
        : busy && action !== 'buy' ? 'Ajout en cours…' : 'Ajouter au panier');
    // Occupé : aria-disabled (le focus reste sur le bouton) ; épuisé : vraiment désactivé
    this._controls.querySelectorAll('.buy-btn').forEach((b) => {
      const text = label(b.dataset.action);
      if (b.textContent !== text) b.textContent = text;
      b.disabled = !shop.inStock;
      b.setAttribute('aria-disabled', String(busy || !shop.inStock));
      b.setAttribute('aria-busy', String(busy));
    });
    if (qty) qty.disabled = !shop.inStock;
    this._controls.querySelectorAll('.qty-btn').forEach((b) => {
      const off = !shop.inStock || (Number(b.dataset.step) < 0 ? this._qty <= 1 : this._qty >= shop.maxQuantity);
      b.setAttribute('aria-disabled', String(off));
    });
    // Annonce vocale (zone polie) : ajout en cours, puis confirmation
    const sr = q('.sr-status');
    if (sr) {
      let msg = sr.textContent;
      if (busy) msg = action === 'buy' ? 'Commande en cours…' : 'Ajout au panier en cours…';
      else if (this._wasBusy) msg = !this._shopStatus.error && action !== 'buy' ? 'Article ajouté au panier.' : '';
      if (sr.textContent !== msg) sr.textContent = msg;
    }
    this._wasBusy = busy;
    const barPrice = q('.bar-price');
    if (barPrice) barPrice.textContent = `${varies ? 'Dès ' : ''}${fNow || this._fmt(now)}`;

    // Bloc « Personnaliser » : résumé quand il est replié, ouvert d'office si l'article est déjà personnalisé
    const perso = q('details.perso');
    if (perso) {
      const dtf = this._state.technique === 'dtf';
      const sub = !this._personalised() ? 'Un prénom, un texte ou un logo, fait main'
        : dtf ? `Logo : ${this._logo.name} · ${this._position().label}` : `« ${this._lines().join(' / ')} » · police ${this._font().label}`;
      const subEl = perso.querySelector('.perso-sub');
      if (subEl.textContent !== sub) { subEl.textContent = sub; subEl.title = this._personalised() ? sub : ''; }
      if (!this._persoSeen && this._personalised()) { this._persoSeen = true; perso.open = true; }
    }
    this._syncError();

    // Vignettes
    const shown = this._photo || this._position().image || this._config.image;
    this._thumbs.querySelectorAll('.thumb-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.url === shown)));
  }

  // Message d'achat (erreur de validation ou échec du panier), affiché près du bouton pressé : bloc d'achat ou barre mobile
  _syncError() {
    if (!this._controls) return;
    const msg = this._shopStatus.error || '';
    const bar = this._controls.querySelector('.sticky-bar');
    const onBar = this._pressed === 'bar' && !!bar && !bar.hidden;
    const put = (el, text) => {
      if (!el) return;
      if (el.textContent !== text) el.textContent = text;
      el.hidden = !text;
    };
    put(this._controls.querySelector('.shop-error:not(.bar-error)'), onBar ? '' : msg);
    put(this._controls.querySelector('.bar-error'), onBar ? msg : '');
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
      // Traits élargis pour que les points se rejoignent : la lettre apparaît pleine, comme une police normale.
      // font.stroke règle cette largeur par police (Julian, déjà dense, garde des traits fins)
      ctx.strokeStyle = ink;
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(0.6, THREAD_MM * s * (font.stroke ?? 1.5));
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
    const photoOnly = !!(this._photo && this._config.shop);
    const entry = this._getImage(photoOnly ? this._photo : pos.image || this._config.image);
    this._zoomBtn.hidden = photoOnly;
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
      ? (this._typing ? 110 : Math.max(160, Math.min(viewH * 0.26, 220)))
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
    if (photoOnly) {
      ctx.drawImage(img, 0, 0, W, H);
      return;
    }
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

    if (this._config.render === 'flat') {
      // Les points tracés comme des traits pleins de l'épaisseur du fil : la forme exacte de la police, sans relief
      const layer = mkCanvas(lw, lh);
      const lc = layer.getContext('2d');
      lc.strokeStyle = this._color().hex;
      lc.lineCap = lc.lineJoin = 'round';
      lc.lineWidth = Math.max(1.2, r * 3); // assez large pour que la lettre soit pleine
      lc.beginPath();
      const g = design.segs;
      for (let i = 0; i < g.length; i += 4) {
        lc.moveTo((g[i] - x0) * s + pad, (g[i + 1] - y0) * s + pad);
        lc.lineTo((g[i + 2] - x0) * s + pad, (g[i + 3] - y0) * s + pad);
      }
      lc.stroke();
      // Ombre légère, pour qu'un fil clair reste lisible sur un tissu clair
      this._compose(ctx, layer, lw, lh, cx, cy, rot, CW, CH, false, {
        shadow: 'rgba(0,0,0,0.25)', blur: Math.max(1, r), offset: 0, shade: 0,
      });
      return;
    }

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
