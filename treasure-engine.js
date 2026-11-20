/* Dragon's Hoard - motore di generazione del tesoro
 * Conversione della macro MapTool "Esperienza Pathfinder E Tesoro".
 * Logica pura: nessun accesso a DOM o storage, così si può testare da solo.
 */
(function (root) {
  'use strict';

  // Scala dei GS: indice 0..4 = frazioni, poi 1, 2, 3, ...
  const FRAZIONI = ['1/8', '1/6', '1/4', '1/3', '1/2'];
  const XP_FRAZ = [50, 65, 100, 135, 200];
  const TESORO_FRAZ = [35, 45, 65, 85, 130];
  const DIVISORE_FRAZ = [8, 6, 4, 3, 2];

  const TESORO_PER_GS = [
    260, 550, 800, 1150, 1550, 2000, 2600, 3350, 4250, 5450, 7000, 9000, 11600,
    15000, 19500, 25000, 32000, 41000, 53000, 67000, 84000, 105000, 132000,
    165000, 208000
  ]; // indice 0 = GS 1 ... indice 24 = GS 25

  /** Legge un GS scritto dall'utente ("7", "1/3") -> { intero, frazione } */
  function interpretaGS(testo) {
    const t = String(testo).trim().replace(/\s+/g, '');
    const i = FRAZIONI.indexOf(t);
    if (i !== -1) return { gs: 1, frazione: i + 1, etichetta: FRAZIONI[i] };
    const n = Math.floor(Number(t.replace(',', '.')));
    const gs = Number.isFinite(n) ? Math.min(Math.max(n, 1), 60) : 1;
    return { gs: gs, frazione: 0, etichetta: String(gs) };
  }

  /** Passo successivo/precedente sulla scala dei GS (per i bottoni - e +) */
  function scalaGS(etichetta, passo) {
    const scala = FRAZIONI.concat(Array.from({ length: 60 }, (_, k) => String(k + 1)));
    let i = scala.indexOf(interpretaGS(etichetta).etichetta);
    i = Math.min(Math.max(i + passo, 0), scala.length - 1);
    return scala[i];
  }

  function esperienzaPerGS(gs) {
    if (gs === 1) return 400;
    if (gs === 2) return 600;
    if (gs === 3) return 800;
    const molt = Math.pow(2, Math.floor(gs / 2) - 1);
    return (gs % 2 === 0 ? 600 : 800) * molt;
  }

  function valoreTesoroPerGS(gs) {
    if (gs <= 25) return TESORO_PER_GS[gs - 1];
    return Math.ceil((208000 * Math.pow(1.2, gs - 25)) / 1000) * 1000;
  }

  function formatta(n) { return String(n).replace('.', ','); }

  /**
   * opzioni: { gs: "7" | "1/3", partecipanti, moltiplicatore, rng? }
   * rng: funzione che restituisce un numero in [0,1) (utile per i test)
   */
  function generaTesoro(opzioni) {
    const rng = opzioni.rng || Math.random;
    const tira = (n, facce) => { // somma di n dadi a "facce" facce
      let s = 0;
      for (let k = 0; k < n; k++) s += Math.floor(rng() * facce) + 1;
      return s;
    };
    const d = (facce) => tira(1, facce);

    const g = interpretaGS(opzioni.gs);
    const GS = g.gs;
    const fr = g.frazione; // 0 = intero, 1..5 = frazione
    const part = Math.max(Math.floor(Number(opzioni.partecipanti)) || 1, 1);
    const molt = Math.max(Math.floor(Number(opzioni.moltiplicatore)) || 1, 1);
    const dividi = (x) => Math.floor(x / DIVISORE_FRAZ[fr - 1]);

    // Esperienza e valore del tesoro
    const esperienza = fr ? XP_FRAZ[fr - 1] : esperienzaPerGS(GS);
    const valBase = fr ? TESORO_FRAZ[fr - 1] : valoreTesoroPerGS(GS);

    // Monete
    let monete = tira(1, Math.floor(valBase / 2) * 100 * molt + 1) - 1;
    if (d(100) <= 15 - Math.floor(GS / 2)) monete = 0;
    let mp = 0, mo = 0, ma = 0;
    if (monete >= 1000) {
      mp = tira(1, Math.floor(monete / 1000) + 1) - 1;
      monete -= mp * 1000;
    }
    if (monete >= 100) {
      const f = Math.floor(monete / 100);
      mo = Math.max(d(f), d(f));
      monete -= mo * 100;
    }
    if (monete >= 10) {
      const f = Math.floor(monete / 10);
      ma = Math.max(d(f), d(f), d(f));
      monete -= ma * 10;
    }
    const mr = monete;

    // Beni (gemme / oggetti d'arte)
    let beni = '';
    let dadoBeni = 0;
    const gemOggArt = GS + d(20);
    const gradoOggArt = 20 + Math.ceil(GS / 2);
    if (gemOggArt >= 20) dadoBeni = d(100);
    if (dadoBeni >= 1) beni = 'gemme';
    if (dadoBeni >= 46 && gemOggArt >= gradoOggArt) beni = 'arte';
    if (dadoBeni >= 81 && gemOggArt >= gradoOggArt) beni = 'entrambi';

    let gemme = tira(1, Math.max(GS - 2, 1) * molt);
    let oggArte = tira(1, Math.max(Math.floor(GS / 2), 1) * molt);
    if (fr) { gemme = dividi(gemme); oggArte = dividi(oggArte); }
    if (beni !== 'gemme' && beni !== 'entrambi') gemme = 0;
    if (beni !== 'arte' && beni !== 'entrambi') oggArte = 0;

    // Oggetti (comuni / magici)
    let categoria = '';
    const oggComMagi = GS + d(10);
    if (oggComMagi >= 5) categoria = 'comuni';
    if (oggComMagi >= 11) categoria = 'minori';
    if (oggComMagi >= 18) categoria = 'medi';
    if (oggComMagi >= 24) categoria = 'maggiori';

    let comuni = tira(1, (GS + Math.floor(GS / 2)) * molt);
    if (fr === 4) comuni = Math.ceil(comuni / 3);
    if (fr === 5) comuni = Math.ceil(comuni / 2);
    let minori = tira(1, (1 + Math.floor(GS / 2)) * molt);
    let medi = tira(1, (1 + Math.floor(GS / 6)) * molt);
    const dadoMagg = Math.max(Math.floor(GS / 8), 1) + (GS >= 19 ? Math.floor(GS / 19) : 0);
    let maggiori = fr === 0 ? tira(1, dadoMagg * molt) : 0;

    const livello = { '': 0, comuni: 1, minori: 2, medi: 3, maggiori: 4 }[categoria];
    if (livello < 1) comuni = 0;
    if (livello < 2) minori = 0;
    if (livello < 3) medi = 0;
    if (livello < 4) maggiori = 0;
    if (fr >= 1 && fr <= 3) comuni = 0;
    if (fr >= 1) { minori = 0; medi = 0; maggiori = 0; }

    // Valori derivati
    const valTesoro = valBase * molt;
    const valATesta = Math.floor((valTesoro / part) * 100) / 100;
    const valoreMoneteMO = (mr + ma * 10 + mo * 100 + mp * 1000) / 100;

    return {
      gs: g.etichetta, partecipanti: part, moltiplicatore: molt,
      esperienza: esperienza,
      esperienzaIndividuale: Math.floor(esperienza / part),
      valoreTesoro: valTesoro,
      valoreTesoroATesta: formatta(valATesta),
      monete: { mr: mr, ma: ma, mo: mo, mp: mp },
      valoreMoneteMO: valoreMoneteMO,
      beni: { gemme: gemme, oggettiArte: oggArte, listaGemme: generaGemme(gemme, rng), listaArte: generaOggettiArte(oggArte, rng) },
      oggetti: { comuni: comuni, minori: minori, medi: medi, maggiori: maggiori },
      categoriaOggetti: categoria
    };
  }

  // ---- Tabelle, gemme e oggetti d'arte ----
  const ROMANI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  // valore = n dadi a "facce" facce + base, per categoria
  const GEMME_VAL = [[4, 4, 0], [1, 64, 16], [1, 121, 39], [1, 640, 160], [1, 1201, 399], [1, 6400, 1600], [1, 8000, 4000], [1, 64000, 16000], [1, 120000, 40000], [1, 640000, 160000]];
  const ARTE_VAL = [[1, 90, 10], [1, 150, 30], [1, 500, 100], [1, 900, 100], [1, 1000, 200], [1, 1500, 300], [1, 2000, 400], [1, 2500, 500], [1, 3000, 1000], [1, 5000, 1000],
    [1, 6000, 2000], [1, 10000, 2000], [1, 20000, 4000], [1, 30000, 10000], [1, 90000, 30000], [1, 200000, 40000], [1, 300000, 100000], [1, 900000, 300000], [1, 2000000, 400000], [1, 4500000, 500000]];
  const MAX_GEMME = 50, MAX_ARTE = 20; // limiti dell'elenco dettagliato (come nelle macro originali)

  function tiraEspressione(expr, rng) { // "1d4+3"
    const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(String(expr).replace(/\s+/g, ''));
    if (!m) return 1;
    let s = Number(m[3] || 0);
    for (let k = 0; k < Number(m[1]); k++) s += Math.floor(rng() * Number(m[2])) + 1;
    return s;
  }

  /** Estrae una riga da una tabella; null se la tabella non esiste */
  function pescaTabella(nome, rng, roll) {
    const t = (root.DH_TABELLE || {})[nome];
    if (!t) return null;
    const n = roll ? tiraEspressione(roll, rng) : Math.floor(rng() * t.d) + 1;
    const riga = t.r.find(x => n >= x[0] && n <= x[1]);
    return riga ? riga[2] : '';
  }

  /** Risolve i segnaposto {{...}} dei testi delle tabelle */
  function risolvi(testo, rng, prof) {
    prof = prof || 0;
    if (prof > 8) return testo;
    const mancante = n => '[tabella “' + n + '” mancante]';
    const out = String(testo).replace(/\{\{(.*?)\}\}/g, (_, tok) => {
      const i = tok.indexOf(':'), cmd = tok.slice(0, i), arg = tok.slice(i + 1);
      if (cmd === '50') return rng() < 0.5 ? arg : '';
      if (cmd === 'scelta') { const o = arg.split('|'); return o[Math.floor(rng() * o.length)]; }
      if (cmd === 'taglia') {
        const v = pescaTabella('Taglia Casuale', rng, arg);
        if (v === null) return mancante('Taglia Casuale');
        return (v === 'Media' || v === '') ? '' : 'di taglia ' + v;
      }
      if (cmd === 'tab') {
        const p = arg.split('|'), nome = p[0];
        let roll = null, noend = null;
        p.slice(1).forEach(x => { if (x.startsWith('roll=')) roll = x.slice(5); if (x.startsWith('noend=')) noend = x.slice(6); });
        let v = null;
        for (let k = 0; k < 50; k++) {
          v = pescaTabella(nome, rng, roll);
          if (v === null) return mancante(nome);
          if (!(noend && v.endsWith(noend))) break;
        }
        return risolvi(v, rng, prof + 1);
      }
      return '';
    });
    return prof === 0 ? out.replace(/\s{2,}/g, ' ').replace(/\s+([,;:.)])/g, '$1').trim() : out;
  }

  function generaVoci(n, rng, selettore, prefisso, valori) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const sel = parseInt(pescaTabella(selettore, rng), 10);
      if (!sel || !valori[sel - 1]) { out.push({ nome: '(tabelle non disponibili)', val: 0, cat: 'I' }); continue; }
      const v = valori[sel - 1];
      let val = v[2];
      for (let j = 0; j < v[0]; j++) val += Math.floor(rng() * v[1]) + 1;
      out.push({ nome: risolvi(pescaTabella(prefisso + sel, rng) || '', rng), val: val, cat: ROMANI[sel - 1] });
    }
    return out;
  }
  const generaGemme = (n, rng) => generaVoci(Math.min(n, MAX_GEMME), rng || Math.random, 'Gemme', 'Gemma', GEMME_VAL);
  const generaOggettiArte = (n, rng) => generaVoci(Math.min(n, MAX_ARTE), rng || Math.random, 'Oggetti Arte', 'Oggetto Arte', ARTE_VAL);
  function riepilogo(lista) {
    let tot = 0, alta = 0;
    lista.forEach(x => { tot += x.val; alta = Math.max(alta, ROMANI.indexOf(x.cat) + 1); });
    return { totale: tot, categoriaAlta: ROMANI[alta - 1] || 'I' };
  }

  /** Suggerimenti per un oggetto d'arte personalizzato (macro "Generatore Di Oggetti D'Arte Casuali").
   *  Mantiene valore e categoria dell'oggetto che sostituisce. */
  function generaPersonalizzato(val, cat, rng) {
    rng = rng || Math.random;
    const P = 'Oggetti Arte Casuali';
    const pesca = nome => pescaTabella(nome, rng);
    const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    const tipo = pesca(P);
    let spec = 0;
    // stessi passaggi, nello stesso ordine, della macro originale
    [['t', 'Arredamento'], ['t', 'Gioco'], ['t', 'Gioiello'], ['t', 'Opera Artistica'], ['s', 'Solido Geometrico'],
     ['t', 'Strumento Musicale'], ['t', 'Utensile'], ['t', 'Vestito'], ['s', 'Armatura'], ['s', 'Scudo'], ['s', 'Arma']
    ].forEach(p => {
      if (eq(p[0] === 't' ? tipo : spec, p[1])) { const v = pesca(P + ' ' + p[1]); if (v !== null) spec = v; }
    });
    const materiale = (base, passi) => {
      let m = pesca(P + ' ' + base);
      passi.forEach(p => { if (m !== null && eq(m, p[0])) { const v = pesca(P + ' ' + p[1]); if (v !== null) m = v; } });
      return m;
    };
    const ROB = [['Avorio o Corno', 'Avorio'], ['Legno Duro', 'Legno Duro'], ['Legno Tenero', 'Legno Tenero'], ['Metallo', 'Metallo'], ['Pietra', 'Pietra']];
    const FRA = ['Pelle', 'Pelle Esotica', 'Pelliccia', 'Pelliccia Esotica', 'Piume', 'Piume Esotiche', 'Tessuto'].map(x => [x, x]);
    const r = x => risolvi(x === null ? '(tabella non disponibile)' : x, rng);
    const opz = [0, 1, 2].map(() => ({
      rob: r(materiale('Materiale Robusto', ROB)), fra: r(materiale('Materiale Fragile', FRA)),
      scena: r(pesca(P + ' Scene')), abb: r(pesca(P + ' Abbellimento'))
    }));
    return { alt: true, nome: 'Oggetto personalizzato', val: val, cat: cat, tipo: r(tipo), spec: r(spec === 0 ? '—' : spec), opz: opz, dim: r(pesca(P + ' Dimensioni')) };
  }

  const API = { generaTesoro, generaPersonalizzato, generaGemme, generaOggettiArte, riepilogo, risolvi, MAX_GEMME, MAX_ARTE, interpretaGS, scalaGS, esperienzaPerGS, valoreTesoroPerGS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DragonsHoard = Object.assign(root.DragonsHoard || {}, API);
})(typeof window !== 'undefined' ? window : globalThis);
