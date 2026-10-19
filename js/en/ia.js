// Página IA: juego incrustado, árbol alfa-beta por pasos, tablas pieza-casilla y capas de Pac-Man.
(function () {
  "use strict";
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, padre) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (padre) padre.appendChild(e);
    return e;
  }

  /* ---------- 1. Juego: se carga solo al pulsar (unos 36 MB) ---------- */
  var cargar = document.getElementById("juego-cargar");
  if (cargar) {
    cargar.addEventListener("click", function () {
      var pantalla = document.getElementById("juego-pantalla");
      var f = document.createElement("iframe");
      f.src = "../juegos/ajedrez/index.html?lang=en";
      f.title = "Chess by Carlos Mollá";
      f.allow = "autoplay; fullscreen; gamepad";
      f.setAttribute("allowfullscreen", "");
      pantalla.innerHTML = "";
      pantalla.appendChild(f);
      f.addEventListener("load", function () { try { f.focus(); } catch (e) {} });
    });
  }

  /* ---------- 2. Árbol alfa-beta, explicado por pasos ---------- */
  var svg = document.getElementById("arbol-svg");
  if (svg) {
    var HOJAS = [3, 5, 6, 9, 1, 2, 0, -1];
    var nodos = [], aristas = {};
    // Estructura: 0 raíz (MAX), 1-2 MIN, 3-6 MAX, 7-14 hojas
    var pos = [[320, 34], [160, 112], [480, 112], [80, 190], [240, 190], [400, 190], [560, 190]];
    for (var h = 0; h < 8; h++) pos.push([40 + h * 80, 268]);
    var hijos = function (i) { return i < 7 ? [2 * i + 1, 2 * i + 2] : []; };
    var gA = el("g", {}, svg), gN = el("g", {}, svg);
    for (var i = 1; i < 15; i++) {
      var p = Math.floor((i - 1) / 2);
      aristas[i] = el("line", { "class": "ar-arista", x1: pos[p][0], y1: pos[p][1], x2: pos[i][0], y2: pos[i][1] }, gA);
    }
    el("text", { "class": "ar-et", x: 8, y: 38 }, gN).textContent = "MAX";
    el("text", { "class": "ar-et", x: 8, y: 116 }, gN).textContent = "MIN";
    el("text", { "class": "ar-et", x: 8, y: 194 }, gN).textContent = "MAX";
    for (var n = 0; n < 15; n++) {
      var g = el("g", { "class": "ar-nodo" }, gN), x = pos[n][0], y = pos[n][1];
      if (n >= 7) {
        el("rect", { x: x - 18, y: y - 15, width: 36, height: 30, rx: 6 }, g);
        el("text", { x: x, y: y }, g).textContent = HOJAS[n - 7];
      } else {
        var esMax = n === 0 || n >= 3;
        var d = esMax ? "M" + x + " " + (y - 20) + " L" + (x + 22) + " " + (y + 15) + " L" + (x - 22) + " " + (y + 15) + " Z"
                      : "M" + (x - 22) + " " + (y - 15) + " L" + (x + 22) + " " + (y - 15) + " L" + x + " " + (y + 20) + " Z";
        el("path", { d: d }, g);
        el("text", { x: x, y: esMax ? y + 4 : y - 3, "class": "ar-val" }, g).textContent = "";
        if (n === 0) el("text", { x: x + 34, y: y + 4, "class": "ar-ab", "text-anchor": "start", style: "text-anchor:start" }, g).textContent = "";
        else el("text", { x: x, y: y + 33, "class": "ar-ab" }, g).textContent = "";
      }
      nodos.push(g);
    }
    // Explicación por pasos (el visitante avanza a su ritmo)
    // Nodos: 0 raíz (MAX), 1-2 MIN, 3-6 MAX, 7-14 posiciones finales [3, 5, 6, 9, 1, 2, 0, −1]
    var PASOS = [
      { t: "The decision tree", x: "At the top is the move the AI has to choose. Upward triangles are the AI's turns (MAX), which looks for the highest score; downward ones are the opponent's turns (MIN), which looks for the lowest. At the bottom, the score of each final position.", act: [0] },
      { t: "First branch", x: "The AI analyses its two options in the first branch: 3 and 5. Since it chooses on that turn, it keeps the 5.", ev: [7, 8], val: { 3: "5" }, act: [3, 7, 8] },
      { t: "The opponent takes note", x: "Along this path, the opponent can hold the AI to 5 at most. It records this as β = 5: the most it is willing to concede.", ab: { 1: "β = 5" }, val: { 1: "≤ 5" }, act: [1] },
      { t: "A better option… for the AI", x: "In the neighbouring branch, the first position is already worth 6. The AI would get at least 6, and the opponent will never choose this path when it has one that holds the AI to 5.", ev: [9], val: { 4: "≥ 6" }, act: [4, 9] },
      { t: "First pruning", x: "That is why the last position in this branch is not evaluated: whatever it is worth, the opponent will not allow it. This side of the tree is settled with a value of 5.", poda: [10], val: { 4: "6", 1: "5" }, act: [1, 10] },
      { t: "A guaranteed minimum", x: "By playing to the left, the AI is guaranteed 5 points. It records this as α = 5: any alternative will have to beat it.", ab: { 0: "α = 5" }, val: { 0: "≥ 5" }, act: [0] },
      { t: "The other move", x: "Now it analyses the move on the right. The opponent's first reply holds the AI to 2 at most (β = 2).", ev: [11, 12], val: { 5: "2", 2: "≤ 2" }, ab: { 2: "β = 2" }, act: [2, 5, 11, 12] },
      { t: "Second pruning", x: "2 is worse than the 5 it already has guaranteed (β ≤ α), so the rest of this branch is discarded entirely, without analysing any of its positions.", poda: [6], val: { 2: "2" }, act: [2, 6] },
      { t: "Decision", x: "The AI plays to the left, with a value of 5. It has reached the same answer as if it had analysed everything, but evaluating only 5 of the 8 positions. In a real game, that saving multiplies at every level of the tree and makes it possible to calculate more moves ahead in the same time.", val: { 0: "5" }, mejor: true, act: [0] }
    ];
    var numEl = document.getElementById("arbol-num"), tituloEl = document.getElementById("arbol-titulo");
    var texto = document.getElementById("arbol-texto"), cont = document.getElementById("arbol-n");
    var ant = document.getElementById("arbol-ant"), sig = document.getElementById("arbol-sig");
    var puntos = document.getElementById("arbol-puntos"), actual = 0;
    PASOS.forEach(function (_, k) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", "Go to step " + (k + 1)); b.tabIndex = -1;
      b.addEventListener("click", function () { ir(k); });
      puntos.appendChild(b);
    });
    puntos.removeAttribute("aria-hidden");
    function descendientes(i) { var r = [i]; hijos(i).forEach(function (h) { r = r.concat(descendientes(h)); }); return r; }
    function ir(k) {
      actual = Math.max(0, Math.min(PASOS.length - 1, k));
      var ev = [], val = {}, ab = {}, podadas = [], mejor = false;
      for (var p = 0; p <= actual; p++) {
        var s = PASOS[p];
        (s.ev || []).forEach(function (n) { ev.push(n); });
        Object.keys(s.val || {}).forEach(function (n) { val[n] = s.val[n]; });
        Object.keys(s.ab || {}).forEach(function (n) { ab[n] = s.ab[n]; });
        (s.poda || []).forEach(function (n) { podadas = podadas.concat(descendientes(n)); });
        if (s.mejor) mejor = true;
      }
      var vistos = {};
      ev.concat(Object.keys(val).map(Number)).forEach(function (n) { while (n > 0) { vistos[n] = 1; n = Math.floor((n - 1) / 2); } });
      nodos.forEach(function (g, n) {
        var c = "ar-nodo";
        if (ev.indexOf(n) >= 0) c += " evaluada";
        if (podadas.indexOf(n) >= 0) c += " podada";
        if (PASOS[actual].act.indexOf(n) >= 0) c += " actual";
        if (mejor && n === 0) c += " mejor";
        g.setAttribute("class", c);
        if (n < 7) {
          g.querySelector(".ar-val").textContent = val[n] || "";
          g.querySelector(".ar-ab").textContent = ab[n] || "";
        }
      });
      Object.keys(aristas).forEach(function (n) {
        n = Number(n);
        var c = "ar-arista";
        if (podadas.indexOf(n) >= 0) c += " podada";
        else if (mejor && (n === 1 || n === 3 || n === 8)) c += " camino";
        else if (vistos[n]) c += " activa";
        aristas[n].setAttribute("class", c);
      });
      numEl.textContent = "Step " + (actual + 1) + " of " + PASOS.length;
      tituloEl.textContent = PASOS[actual].t;
      texto.textContent = PASOS[actual].x;
      cont.textContent = ev.length;
      ant.disabled = actual === 0;
      sig.disabled = actual === PASOS.length - 1;
      Array.prototype.forEach.call(puntos.children, function (b, i) {
        b.classList.toggle("activo", i === actual);
        if (i === actual) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
    }
    ant.addEventListener("click", function () { ir(actual - 1); });
    sig.addEventListener("click", function () { ir(actual + 1); });
    document.getElementById("arbol").addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { ir(actual + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { ir(actual - 1); e.preventDefault(); }
    });
    ir(0);
  }

  /* ---------- 3. Tablas pieza-casilla (valores del motor) ---------- */
  var tab = document.getElementById("pst-tablero");
  if (tab) {
    var PST = {
      caballo: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
      alfil: [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
      peon: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
      rey: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
    };
    var celdas = [];
    for (var c = 0; c < 64; c++) { var s = document.createElement("span"); s.setAttribute("role", "gridcell"); tab.appendChild(s); celdas.push(s); }
    function mezcla(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
    var NEU = [246, 246, 245], NEG = [27, 44, 79], POS = [232, 130, 42];
    function pintarPST(nombre) {
      var t = PST[nombre];
      t.forEach(function (v, i) {
        var col = v >= 0 ? mezcla(NEU, POS, Math.min(1, v / 50)) : mezcla(NEU, NEG, Math.min(1, -v / 50));
        celdas[i].style.backgroundColor = "rgb(" + col.join(",") + ")";
        celdas[i].style.color = Math.abs(v) >= 30 ? "#FFFFFF" : "#1B2C4F";
        celdas[i].textContent = v > 0 ? "+" + v : String(v).replace("-", "−");
        celdas[i].setAttribute("aria-label", "Square " + "abcdefgh"[i % 8] + (8 - Math.floor(i / 8)) + ": " + v);
      });
    }
    document.querySelectorAll("#pst-piezas .estacion").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll("#pst-piezas .estacion").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        pintarPST(b.getAttribute("data-pieza"));
      });
    });
    pintarPST("caballo");
  }

  /* ---------- 4. Capas de entrada de Pac-Man ---------- */
  var rej = document.getElementById("capas-rejilla");
  if (rej && window.PAC_ESTADO) {
    var E = window.PAC_ESTADO, W = E.W, H = E.H;
    var canales = [];
    for (var cc = 0; cc < 6; cc++) { var m = []; for (var yy = 0; yy < H; yy++) { m.push(new Array(W).fill(0)); } canales.push(m); }
    for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) if (E.walls[y2][x2]) canales[0][y2][x2] = 1;
    canales[1][E.pac[1]][E.pac[0]] = 1;
    E.food.forEach(function (f) { canales[2][f[1]][f[0]] = 1; });
    E.caps.forEach(function (f) { canales[3][f[1]][f[0]] = 1; });
    // Capa de fantasma asustado: se toma de unos movimientos después, tras comer la cápsula
    (E.asustado || []).forEach(function (gh) {
      if (gh[2] > 0) canales[4][Math.floor(gh[1])][Math.floor(gh[0])] = Math.round(Math.max(0.2, gh[2] / 40) * 100) / 100;
    });
    E.ghosts.forEach(function (gh) {
      var gx = Math.floor(gh[0]), gy = Math.floor(gh[1]);
      if (gh[2] > 0) return;
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
        var nx = gx + dx, ny = gy + dy;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H && !E.walls[ny][nx]) {
          var dang = (dx === 0 && dy === 0) ? 1 : (Math.abs(dx) + Math.abs(dy) === 1 ? 0.5 : 0.25);
          canales[5][ny][nx] = Math.max(canales[5][ny][nx], dang);
        }
      }
    });
    var COLS = [[27, 44, 79], [242, 169, 59], [232, 130, 42], [180, 86, 12], [90, 120, 200], [210, 70, 60]];
    var TXT = [
      "Todas las capas superpuestas: así recibe la red cada posición del tablero, como una pila de imágenes de 8 × 16.",
      "Paredes: 1 donde hay muro y 0 donde se puede pasar.",
      "Pac-Man: un único 1 en su casilla.",
      "Comida: 1 en cada casilla con comida pendiente.",
      "Cápsulas: 1 donde hay una cápsula de poder. Al comerla, el fantasma se asusta durante 40 movimientos.",
      "Fantasma asustado: unos movimientos después, Pac-Man se come la cápsula y el fantasma pasa a esta capa, con un valor entre 0,2 y 1 según el tiempo que le queda asustado (aquí, 0,93).",
      "Peligro: 1 en la casilla del fantasma, 0,5 en las adyacentes y 0,25 en las diagonales. La red aprende a evitar estas zonas."
    ];
    var celdasP = [];
    for (var r = H - 1; r >= 0; r--) for (var q = 0; q < W; q++) { var sp = document.createElement("span"); rej.appendChild(sp); celdasP.push([sp, q, r]); }
    var txtCapa = document.getElementById("capas-texto");
    function pintarCapa(k) {
      celdasP.forEach(function (o, idx) {
        var sp = o[0], x = o[1], y = o[2], col = null, a = 0, etq = "";
        if (k === -1) {
          for (var c2 = 5; c2 >= 0; c2--) { if (c2 === 3 || c2 === 4) continue; var v = canales[c2][y][x]; if (v > 0 && (col === null || c2 === 1 || (c2 !== 0 && a < v))) { col = COLS[c2]; a = c2 === 0 ? 1 : Math.max(0.35, v); if (c2 === 1) break; } }
        } else {
          var v2 = canales[k][y][x];
          if (v2 > 0) { col = COLS[k]; a = k === 0 ? 1 : Math.max(0.3, v2); etq = (k === 5 || k === 4) ? String(v2) : ""; }
        }
        sp.textContent = etq;
        sp.style.backgroundColor = col ? "rgba(" + col.join(",") + "," + a + ")" : "#FFFFFF";
        sp.style.color = col && a > 0.6 ? "#FFFFFF" : "#1B2C4F";
        sp.style.transitionDelay = reducido ? "0s" : ((x + (H - y)) * 12) + "ms";
      });
      txtCapa.textContent = TXT[k + 1];
    }
    document.querySelectorAll("#capas .estacion").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll("#capas .estacion").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        pintarCapa(Number(b.getAttribute("data-capa")));
      });
    });
    pintarCapa(-1);
  }
})();

/* ---------- Arquitectura de la red en perspectiva (convoluciones y capas densas) ---------- */
(function () {
  "use strict";
  var svg = document.getElementById("red3d-svg");
  if (!svg) return;
  var NS = "http://www.w3.org/2000/svg";
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  // Proyección oblicua de un panel de 16 × 8 casillas: (u, v) → (x + A·u, y + B·u + v)
  var A = 0.6, B = 0.3, CW = 10, CH = 10, PW = 16 * CW, PH = 8 * CH, Y0 = 92;
  function P(x, u, v) { return [x + A * u, Y0 + B * u + v]; }
  function poli(pts) { return pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function panel(g, x, fill, stroke, op) {
    el("polygon", { points: poli([P(x, 0, 0), P(x, PW, 0), P(x, PW, PH), P(x, 0, PH)]), fill: fill, stroke: stroke, "stroke-width": 1, opacity: op || 1 }, g);
  }
  function rejilla(g, x, col) {
    for (var c = 1; c < 16; c++) el("line", { x1: P(x, c * CW, 0)[0], y1: P(x, c * CW, 0)[1], x2: P(x, c * CW, PH)[0], y2: P(x, c * CW, PH)[1], stroke: col, "stroke-width": .5 }, g);
    for (var r = 1; r < 8; r++) el("line", { x1: P(x, 0, r * CH)[0], y1: P(x, 0, r * CH)[1], x2: P(x, PW, r * CH)[0], y2: P(x, PW, r * CH)[1], stroke: col, "stroke-width": .5 }, g);
  }
  function celda(g, x, c, r, fill, op) {
    var u = c * CW, v = (7 - r) * CH;
    el("polygon", { points: poli([P(x, u + .8, v + .8), P(x, u + CW - .8, v + .8), P(x, u + CW - .8, v + CH - .8), P(x, u + .8, v + CH - .8)]), fill: fill, opacity: op == null ? 1 : op }, g);
  }
  var gFondo = el("g", {}, svg), gCapas = el("g", {}, svg), gConex = el("g", {}, svg), gTxt = el("g", {}, svg);

  // 1. Entrada: seis paneles con los datos reales de una posición de la partida
  var E = window.PAC_ESTADO, X_IN = 24, SEP = 11;
  var COLS = ["#1B2C4F", "#F2A93B", "#E8822A", "#B4560C", "#3E78B3", "#D2463C"];
  for (var k = 5; k >= 0; k--) {
    var gx = X_IN + k * SEP, g = el("g", {}, gCapas);
    panel(g, gx, "#FFFFFF", "#C9CED8");
    if (E && k === 0) {
      for (var r = 0; r < 8; r++) for (var c = 0; c < 16; c++) if (E.walls[r][c]) celda(g, gx, c, r, COLS[0]);
      celda(g, gx, E.pac[0], E.pac[1], COLS[1]);
      E.food.forEach(function (f) { celda(g, gx, f[0], f[1], COLS[2], .9); });
      E.ghosts.forEach(function (gh) {
        var x0 = Math.floor(gh[0]), y0 = Math.floor(gh[1]);
        for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
          var d = (dx === 0 && dy === 0) ? 1 : (Math.abs(dx) + Math.abs(dy) === 1 ? .5 : .25);
          if (x0 + dx >= 0 && x0 + dx < 16 && y0 + dy >= 0 && y0 + dy < 8 && !E.walls[y0 + dy][x0 + dx]) celda(g, gx, x0 + dx, y0 + dy, COLS[5], d * .8);
        }
      });
    } else {
      panel(g, gx, COLS[k], "none", .12);
    }
    rejilla(g, gx, "rgba(27,44,79,.12)");
  }
  // 2. Convoluciones: bloques con profundidad proporcional al número de filtros
  var CONV = [{ x: 250, d: 16, n: 16 }, { x: 395, d: 26, n: 32 }, { x: 552, d: 40, n: 64 }];
  CONV.forEach(function (cv, i) {
    var g = el("g", {}, gCapas), x = cv.x, d = cv.d;
    var base = ["#5E7DB0", "#3E5F93", "#2A4675"][i];
    // caras: trasera, superior, inferior y frontal
    el("polygon", { points: poli([P(x + d, 0, 0), P(x + d, PW, 0), P(x + d, PW, PH), P(x + d, 0, PH)]), fill: base, opacity: .35 }, g);
    el("polygon", { points: poli([P(x, 0, 0), P(x + d, 0, 0), P(x + d, PW, 0), P(x, PW, 0)]), fill: base, opacity: .55 }, g);
    el("polygon", { points: poli([P(x, PW, 0), P(x + d, PW, 0), P(x + d, PW, PH), P(x, PW, PH)]), fill: base, opacity: .75 }, g);
    for (var s = 1; s < 4; s++) panel(g, x + d * s / 4, "none", "rgba(255,255,255,.35)");
    panel(g, x, base, "#FFFFFF");
    rejilla(g, x, "rgba(255,255,255,.18)");
  });
  // Ventana de convolución 3 × 3 que recorre el tablero y su cono hacia la capa siguiente
  var origenes = [X_IN, CONV[0].x, CONV[1].x], destinos = [CONV[0].x, CONV[1].x, CONV[2].x];
  var ventanas = [], conos = [], puntos = [];
  for (var q = 0; q < 3; q++) {
    ventanas.push(el("polygon", { fill: "rgba(232,130,42,.25)", stroke: "#E8822A", "stroke-width": 1.6 }, gConex));
    conos.push([0, 1, 2, 3].map(function () { return el("line", { stroke: "#E8822A", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: .8 }, gConex); }));
    puntos.push(el("polygon", { fill: "#E8822A" }, gConex));
  }
  function ponerVentana(c, r) {
    for (var q = 0; q < 3; q++) {
      var xo = origenes[q], xd = destinos[q], u = (c - 1) * CW, v = (7 - r - 1) * CH;
      var esq = [P(xo, u, v), P(xo, u + 3 * CW, v), P(xo, u + 3 * CW, v + 3 * CH), P(xo, u, v + 3 * CH)];
      ventanas[q].setAttribute("points", poli(esq));
      var cu = c * CW, cvv = (7 - r) * CH;
      var dst = [P(xd, cu, cvv), P(xd, cu + CW, cvv), P(xd, cu + CW, cvv + CH), P(xd, cu, cvv + CH)];
      puntos[q].setAttribute("points", poli(dst));
      var centro = P(xd, cu + CW / 2, cvv + CH / 2);
      conos[q].forEach(function (ln, i) { ln.setAttribute("x1", esq[i][0]); ln.setAttribute("y1", esq[i][1]); ln.setAttribute("x2", centro[0]); ln.setAttribute("y2", centro[1]); });
    }
  }
  // 3. Capas densas
  var DENSAS = [{ x: 735, n: 11, et: "512" }, { x: 840, n: 9, et: "128" }, { x: 935, n: 7, et: "50" }, { x: 1030, n: 5, et: "5" }];
  var YC = 196, nodos = [];
  DENSAS.forEach(function (dn, i) {
    var paso = i === 3 ? 30 : 24, arr = [];
    for (var j = 0; j < dn.n; j++) arr.push([dn.x, YC + (j - (dn.n - 1) / 2) * paso]);
    nodos.push(arr);
  });
  // conexiones: aplanado (último bloque → primera capa densa) y entre capas densas
  var lineas = [];
  var sal = P(CONV[2].x + CONV[2].d, PW, PH / 2);
  nodos[0].forEach(function (n) { el("line", { x1: sal[0], y1: sal[1], x2: n[0], y2: n[1], stroke: "#8DA3C4", "stroke-width": .6, opacity: .45 }, gFondo); });
  for (var a = 0; a < 3; a++) nodos[a].forEach(function (n1) {
    nodos[a + 1].forEach(function (n2) { lineas.push({ e: el("line", { x1: n1[0], y1: n1[1], x2: n2[0], y2: n2[1], stroke: "#8DA3C4", "stroke-width": .6, opacity: .25 }, gFondo), capa: a }); });
  });
  var circ = [];
  nodos.forEach(function (arr, i) {
    circ.push(arr.map(function (n, j) {
      if (i === 0 && (j === 5)) { [-6, 0, 6].forEach(function (o) { el("circle", { cx: n[0], cy: n[1] + o, r: 1.6, fill: "#8DA3C4" }, gCapas); }); return null; }
      return el("circle", { cx: n[0], cy: n[1], r: i === 3 ? 8 : 6.5, fill: "#FFFFFF", stroke: i === 3 ? "#E8822A" : "#1B2C4F", "stroke-width": 2 }, gCapas);
    }));
  });
  var MOV = ["North", "South", "East", "West", "Stop"];
  var etqMov = nodos[3].map(function (n, j) { var t = el("text", { x: n[0] + 16, y: n[1] + 4, "class": "r3-mov" }, gTxt); t.textContent = MOV[j]; return t; });
  // 4. Rótulos
  function rotulo(x, y1, y2) { var t = el("text", { x: x, y: 348, "text-anchor": "middle", "class": "r3-num" }, gTxt); t.textContent = y1; var t2 = el("text", { x: x, y: 366, "text-anchor": "middle", "class": "r3-et" }, gTxt); t2.textContent = y2; }
  rotulo(X_IN + 70, "6 × 8 × 16", "Encoded board");
  CONV.forEach(function (cv) { rotulo(cv.x + 48 + cv.d / 2, String(cv.n), "3 × 3 filters"); });
  DENSAS.forEach(function (dn, i) { rotulo(dn.x, dn.et, i === 3 ? "moves" : "neurons"); });
  function llave(x1, x2, txt) {
    el("path", { d: "M" + x1 + " 384 v8 H" + x2 + " v-8", fill: "none", stroke: "#C9CED8", "stroke-width": 1.5 }, gTxt);
    var t = el("text", { x: (x1 + x2) / 2, y: 30, "text-anchor": "middle", "class": "r3-grupo" }, gTxt); t.textContent = txt;
  }
  llave(24, 650, "Pattern detection: convolutions");
  llave(712, 1100, "Decision: fully connected layers");
  // 5. Animación: la ventana recorre el tablero y la activación viaja hasta la salida
  var c = 1, r = 1, elegido = 2, t0 = 0;
  function activar(fase) {
    lineas.forEach(function (l) {
      var on = l.capa === fase && Math.random() < .35;
      l.e.setAttribute("stroke", on ? "#E8822A" : "#8DA3C4"); l.e.setAttribute("opacity", on ? .75 : .2);
    });
    circ.forEach(function (arr, i) { if (i === 3) return; arr.forEach(function (n) { if (n) n.setAttribute("fill", i === fase + 1 || (i === 0 && fase === 0) ? (Math.random() < .5 ? "#FCEBDD" : "#FFFFFF") : "#FFFFFF"); }); });
  }
  function elegir(j) {
    circ[3].forEach(function (n, i) { n.setAttribute("fill", i === j ? "#E8822A" : "#FFFFFF"); });
    etqMov.forEach(function (t, i) { t.classList.toggle("activo", i === j); });
  }
  ponerVentana(c, r); elegir(elegido);
  if (reducido) return;
  var visible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { var antes = visible; visible = e[0].isIntersecting; if (visible && !antes) requestAnimationFrame(bucle); }).observe(svg);
  var ult = 0, fase = 0;
  function bucle(ts) {
    if (!visible) return;
    if (ts - ult > 140) {
      ult = ts;
      c++; if (c > 14) { c = 1; r++; if (r > 6) r = 1; }
      ponerVentana(c, r);
      if (c % 3 === 0) { activar(fase); fase = (fase + 1) % 3; if (fase === 0) { elegido = (elegido + 1 + Math.floor(Math.random() * 3)) % 5; elegir(elegido); } }
    }
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);
})();
