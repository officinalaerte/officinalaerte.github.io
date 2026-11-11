// Officina Laerte - generatore di cartelle della tombola ed estrattore
// Stesso algoritmo usato per le 72 cartelle del libro "Tombola di Natale".
'use strict';
const TOMBOLA = (() => {
  const rnd = () => {
    if (window.crypto && crypto.getRandomValues) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; }
    return Math.random();
  };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // una serie: 6 cartelle, ognuna 3 righe x 9 colonne (null = casella vuota)
  function tenta() {
    // colonne: 1-9, 10-19, ..., 80-90
    const cols = [...Array(9)].map((_, c) => shuffle([...Array(c === 0 ? 9 : c === 8 ? 11 : 10)].map((_, i) => (c === 0 ? 1 : c * 10) + i)));
    for (let tries = 0; tries < 500; tries++) {
      // quanti numeri per colonna in ciascuna delle 6 cartelle (da 1 a 3, 15 per cartella)
      const cnt = [...Array(6)].map(() => Array(9).fill(1));
      const rest = cols.map(c => c.length - 6);
      let ok = true;
      for (let card = 0; card < 6 && ok; card++) {
        let need = 6;
        const order = shuffle([...Array(9).keys()]).sort((a, b) => rest[b] - rest[a] + (rnd() - .5) * 1.5);
        for (const c of order) {
          if (!need) break;
          const left = 5 - card; // cartelle rimanenti dopo questa
          const must = Math.max(0, rest[c] - left * 2);
          let take = Math.min(2, rest[c], need, Math.max(must, rnd() < .5 ? 1 : 0));
          if (take === 0 && rest[c] > 0 && need > 0 && rnd() < .5) take = 1;
          cnt[card][c] += take; rest[c] -= take; need -= take;
        }
        if (need) { for (const c of order) { while (need && rest[c] > 0 && cnt[card][c] < 3) { cnt[card][c]++; rest[c]--; need--; } } }
        if (need) ok = false;
      }
      if (!ok || rest.some(r => r)) continue;
      // distribuzione nelle righe: 5 numeri per riga
      const cards = [];
      for (let card = 0; card < 6 && ok; card++) {
        let grid = null;
        for (let t = 0; t < 400 && !grid; t++) {
          const g = [[], [], []].map(() => Array(9).fill(false)); const rows = [0, 0, 0]; let bad = false;
          const order = shuffle([...Array(9).keys()]).sort((a, b) => cnt[card][b] - cnt[card][a]);
          for (const c of order) {
            const k = cnt[card][c];
            const cand = shuffle([0, 1, 2]).sort((a, b) => rows[a] - rows[b]).slice(0, k);
            if (cand.some(r => rows[r] >= 5)) { bad = true; break; }
            cand.forEach(r => { g[r][c] = true; rows[r]++; });
          }
          if (!bad && rows.every(r => r === 5)) grid = g;
        }
        if (!grid) { ok = false; break; }
        cards.push(grid);
      }
      if (!ok) continue;
      // riempimento: in ogni colonna i numeri crescono dall'alto in basso
      const pool = cols.map(c => [...c]);
      return cards.map((g, card) => {
        const out = [[], [], []].map(() => Array(9).fill(null));
        for (let c = 0; c < 9; c++) {
          const nums = pool[c].splice(0, cnt[card][c]).sort((a, b) => a - b);
          let i = 0; for (let r = 0; r < 3; r++) if (g[r][c]) out[r][c] = nums[i++];
        }
        return out;
      });
    }
    return null;
  }
  function serie() { for (let i = 0; i < 100; i++) { const s = tenta(); if (s && verifica(s).length === 0) return s; } throw new Error('serie non generata'); }

  // controlla tutte le regole; restituisce l'elenco degli errori (vuoto = serie valida)
  function verifica(s) {
    const err = [];
    if (!Array.isArray(s) || s.length !== 6) return ['la serie non ha 6 cartelle'];
    const visti = new Map();
    s.forEach((card, k) => {
      if (card.length !== 3) err.push(`cartella ${k + 1}: righe ${card.length}`);
      let tot = 0;
      card.forEach((row, r) => {
        if (row.length !== 9) err.push(`cartella ${k + 1} riga ${r + 1}: colonne ${row.length}`);
        const n = row.filter(x => x !== null).length; tot += n;
        if (n !== 5) err.push(`cartella ${k + 1} riga ${r + 1}: ${n} numeri`);
        row.forEach((x, c) => {
          if (x === null) return;
          const lo = c === 0 ? 1 : c * 10, hi = c === 0 ? 9 : c === 8 ? 90 : c * 10 + 9;
          if (!Number.isInteger(x) || x < lo || x > hi) err.push(`cartella ${k + 1}: ${x} nella colonna ${c + 1}`);
          visti.set(x, (visti.get(x) || 0) + 1);
        });
      });
      if (tot !== 15) err.push(`cartella ${k + 1}: ${tot} numeri`);
      for (let c = 0; c < 9; c++) {
        const col = card.map(row => row[c]).filter(x => x !== null);
        if (col.length === 0) err.push(`cartella ${k + 1}: colonna ${c + 1} vuota`);
        for (let i = 1; i < col.length; i++) if (col[i] <= col[i - 1]) err.push(`cartella ${k + 1}: colonna ${c + 1} non crescente`);
      }
    });
    for (let n = 1; n <= 90; n++) if (visti.get(n) !== 1) err.push(`numero ${n} presente ${visti.get(n) || 0} volte`);
    if (visti.size !== 90) err.push(`numeri distinti: ${visti.size}`);
    return err;
  }

  // ---------------------------------------------------------------- disegno
  const cartella = (card, label) => `<table class="cartella"><caption>${label}</caption><tbody>${card.map(row => `<tr>${row.map(x => x === null ? '<td class="v"></td>' : `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  // tabellone classico: 9 righe x 10 colonne, diviso in 6 blocchi da 15 numeri
  const tabellone = (usciti = new Set(), ultimo = 0) => {
    let h = '<div class="tabellone" role="grid" aria-label="Tabellone dei numeri da 1 a 90">';
    for (let b = 0; b < 6; b++) {
      const r0 = Math.floor(b / 2) * 3, c0 = (b % 2) * 5;
      h += '<div class="blocco">';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
        const n = (r0 + r) * 10 + c0 + c + 1;
        h += `<span class="${usciti.has(n) ? 'u' : ''}${n === ultimo ? ' ult' : ''}"${usciti.has(n) ? ' aria-label="' + n + ', uscito"' : ''}>${n}</span>`;
      }
      h += '</div>';
    }
    return h + '</div>';
  };
  return { serie, verifica, cartella, tabellone, rnd };
})();

// ---------------------------------------------------------------- pagina
(function () {
  const $ = id => document.getElementById(id);
  if (!$('serie')) return;
  const genera = () => {
    const n = Math.max(1, Math.min(10, parseInt($('quante').value, 10) || 1));
    let h = '';
    for (let i = 1; i <= n; i++) {
      const s = TOMBOLA.serie();
      h += `<section class="serie" aria-label="Serie ${i}"><h3 class="serie-tit">Serie ${i} <small>· 6 cartelle con tutti i numeri da 1 a 90</small></h3><div class="cartelle">${s.map((c, k) => TOMBOLA.cartella(c, `Serie ${i} · cartella ${k + 1}`)).join('')}</div></section>`;
    }
    $('serie').innerHTML = h;
    $('esito').textContent = `Generate ${n} ${n === 1 ? 'serie' : 'serie'} (${n * 6} cartelle).`;
  };
  $('genera').addEventListener('click', genera);
  $('stampa').addEventListener('click', () => { document.body.classList.remove('stampa-tab'); window.print(); });
  $('stampa-tab').addEventListener('click', () => { document.body.classList.add('stampa-tab'); window.print(); });
  window.addEventListener('afterprint', () => document.body.classList.remove('stampa-tab'));
  $('tab-stampa').innerHTML = TOMBOLA.tabellone();
  genera();

  // estrattore
  let usciti = [];
  const show = () => {
    const ult = usciti[usciti.length - 1] || 0;
    $('estratto').textContent = ult || '–';
    if (ult) {
      const [nap, it] = SMORFIA[ult - 1];
      $('significato').innerHTML = `<b>${nap}</b>${nap.toLowerCase() !== it.toLowerCase() ? ` <span>· ${it}</span>` : ''}`;
    } else $('significato').textContent = 'Premi «Estrai» per iniziare.';
    $('conta').textContent = `${usciti.length} di 90 estratti`;
    $('ultimi').textContent = usciti.length > 1 ? 'Precedenti: ' + usciti.slice(-6, -1).reverse().join(', ') : '';
    $('tab-live').innerHTML = TOMBOLA.tabellone(new Set(usciti), ult);
    $('estrai').disabled = usciti.length >= 90;
  };
  $('estrai').addEventListener('click', () => {
    const rest = [];
    for (let n = 1; n <= 90; n++) if (!usciti.includes(n)) rest.push(n);
    if (!rest.length) return;
    usciti.push(rest[Math.floor(TOMBOLA.rnd() * rest.length)]);
    show();
  });
  $('ricomincia').addEventListener('click', () => { if (!usciti.length || confirm('Ricominciare da capo? I numeri estratti verranno azzerati.')) { usciti = []; show(); } });
  show();
})();
