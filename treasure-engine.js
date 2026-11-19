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
      beni: { gemme: gemme, oggettiArte: oggArte },
      oggetti: { comuni: comuni, minori: minori, medi: medi, maggiori: maggiori },
      categoriaOggetti: categoria
    };
  }

  const API = { generaTesoro, interpretaGS, scalaGS, esperienzaPerGS, valoreTesoroPerGS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DragonsHoard = Object.assign(root.DragonsHoard || {}, API);
})(typeof window !== 'undefined' ? window : globalThis);
