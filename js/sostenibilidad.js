// Página de Sostenibilidad: horno animado, cifras, comparador de cementos y escenario de combustibles.
(function () {
  "use strict";
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fmt = function (v, dec) { return v.toFixed(dec || 0).replace(".", ","); };

  /* ---------- 0. Horno: CO₂ que sube y clínker que sale ---------- */
  var horno = document.getElementById("horno");
  if (horno) {
    var quim = horno.querySelectorAll(".hn-co2.quimica > g");
    var comb = horno.querySelectorAll(".hn-co2.combustion > g");
    var nod = horno.querySelectorAll(".hn-clinker circle");
    var visible = true, t0 = null;
    function pintar(ts) {
      if (!visible) { t0 = null; return; }
      if (t0 === null) t0 = ts;
      var t = (ts - t0) / 1000;
      function burbuja(g, i, n, x0, y0, sube, dur) {
        var f = ((t / dur) + i / n) % 1;
        var x = x0 + Math.sin(f * 6 + i) * 10, y = y0 - f * sube;
        var o = Math.min(1, f * 5, (1 - f) * 2.2);
        g.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + (0.75 + f * 0.45).toFixed(2) + ")");
        g.style.opacity = o.toFixed(2);
      }
      quim.forEach(function (g, i) { burbuja(g, i, quim.length, 148, 92, 62, 4.2); });
      comb.forEach(function (g, i) { burbuja(g, i, comb.length, 392, 196, 120, 4.8); });
      nod.forEach(function (c, i) {
        var f = ((t / 2.6) + i / nod.length) % 1, x, y;
        if (f < 0.35) { var k = f / 0.35; x = 352 + k * 22; y = 226 + k * 6; }
        else { var k2 = (f - 0.35) / 0.65; x = 374 + k2 * 44; y = 232 + k2 * k2 * 56; }
        c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1));
        c.style.opacity = Math.min(1, f * 8, (1 - f) * 8).toFixed(2);
      });
      requestAnimationFrame(pintar);
    }
    if (!reducido) {
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (e) { var antes = visible; visible = e[0].isIntersecting; if (visible && !antes) requestAnimationFrame(pintar); }).observe(horno);
      }
      requestAnimationFrame(pintar);
    } else {
      quim.forEach(function (g, i) { g.setAttribute("transform", "translate(" + (140 + i * 6) + " " + (80 - i * 16) + ")"); });
      comb.forEach(function (g, i) { g.setAttribute("transform", "translate(" + (392 + i * 6) + " " + (170 - i * 30) + ")"); });
    }
  }

  /* ---------- 1. Cifras que cuentan al aparecer ---------- */
  var cifras = document.querySelectorAll("[data-contar]");
  function contar(el) {
    var fin = parseFloat(el.getAttribute("data-contar")), dec = +(el.getAttribute("data-dec") || 0);
    var pre = el.getAttribute("data-pre") || "", suf = el.getAttribute("data-suf") || "";
    if (reducido) { el.textContent = pre + fmt(fin, dec) + suf; return; }
    var t0 = null;
    function paso(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / 1400), e = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + fmt(fin * e, dec) + suf;
      if (k < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }
  if ("IntersectionObserver" in window) {
    var obsC = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { contar(e.target); obsC.unobserve(e.target); } });
    }, { threshold: 0.6 });
    cifras.forEach(function (c) { obsC.observe(c); });
  }

  /* ---------- 2. Comparador de cementos ---------- */
  var tabla = document.getElementById("cem-tabla");
  if (tabla) {
    // Composición (%) e impactos relativos a CEM I, leídos de la figura 4 del informe
    // Orden de impactos: cambio climático, toxicidad humana, ozono fotoquímico, acidificación, eutrofización
    var CEM = [
      { n: "CEM I", d: "Portland", c: [97.5, 0, 0, 0, 0], v: [100, 100, 100, 100, 100] },
      { n: "CEM II/A-L", d: "Portland con caliza", c: [87, 0, 0, 0, 13], v: [89, 89, 90, 89, 92] },
      { n: "CEM IV/A", d: "Puzolánico", c: [85, 3.8, 11.3, 0, 0], v: [88, 89, 90, 88, 91] },
      { n: "CEM III/A", d: "De alto horno", c: [64, 36, 0, 0, 0], v: [68, 71, 75, 66, 76] },
      { n: "CEM V/A", d: "Compuesto", c: [52, 27.8, 10, 10, 0], v: [57, 62, 68, 55, 67] }
    ];
    var COL = ["#1B2C4F", "#8DA3C4", "#E8822A", "#F6B54E", "#C9CED8"];
    CEM.forEach(function (c) {
      var fila = document.createElement("div");
      fila.className = "cem-fila"; fila.setAttribute("role", "listitem");
      var comp = "", suma = 0;
      c.c.forEach(function (p, i) { if (p > 0) { comp += '<i style="width:' + p + '%;background:' + COL[i] + '"></i>'; suma += p; } });
      comp += '<i style="width:' + (100 - suma).toFixed(1) + '%;background:#EDEFF3"></i>';
      fila.innerHTML = '<span class="cem-nombre"><strong>' + c.n + '</strong><small>' + c.d + '</small><small>' + fmt(c.c[0], c.c[0] % 1 ? 1 : 0) + '\u00a0% de clínker</small></span>' +
        '<span class="cem-comp" aria-hidden="true">' + comp + '</span>' +
        '<span class="cem-barra"><span></span></span><span class="cem-valor"><strong></strong><small></small></span>';
      tabla.appendChild(fila);
    });
    var filas = tabla.querySelectorAll(".cem-fila");
    function mostrar(k) {
      filas.forEach(function (f, i) {
        var v = CEM[i].v[k];
        f.querySelector(".cem-barra span").style.setProperty("--w", v + "%");
        f.querySelector(".cem-valor strong").textContent = v + " %";
        f.querySelector(".cem-valor small").textContent = i === 0 ? "Referencia" : "−" + (100 - v) + " %";
        f.classList.toggle("mejor", i === CEM.length - 1);
      });
    }
    document.querySelectorAll("#cem-cat .estacion").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll("#cem-cat .estacion").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        mostrar(+b.getAttribute("data-cat"));
      });
    });
    mostrar(0);
  }

  /* ---------- 3. Escenario de combustibles alternativos ---------- */
  var esc = document.getElementById("esc-filas");
  if (esc) {
    // Tabla 7 del informe: E4 (50 % de sustitución) frente al escenario base
    var E = [["Cambio climático", 90, 100], ["Toxicidad humana", 100, 86], ["Ozono fotoquímico", 100, 80], ["Acidificación", 100, 83], ["Eutrofización", 100, 96]];
    E.forEach(function (e) {
      var cambio = Math.round((e[2] / e[1] - 1) * 100);
      var etq = cambio > 0 ? "≈ +" + Math.round(cambio / 5) * 5 + " %" : "−" + Math.abs(cambio) + " %";
      var f = document.createElement("div");
      f.className = "esc-fila2" + (cambio > 0 ? " peor" : "");
      f.innerHTML = '<span class="esc-cat">' + e[0] + '</span>' +
        '<span class="esc-barras"><span class="b-base" style="--w:' + e[1] + '%"></span><span class="b-alt" style="--w:' + e[2] + '%"></span></span>' +
        '<span class="esc-cambio">' + etq + '</span>';
      esc.appendChild(f);
    });
  }
})();
// Planeta: se detiene si el usuario prefiere menos movimiento
(function () {
  var s = document.getElementById("planeta-svg");
  if (s && window.matchMedia("(prefers-reduced-motion: reduce)").matches && s.pauseAnimations) s.pauseAnimations();
})();

/* ---------- Columna de adsorción y curva de ruptura (esquema ilustrativo) ---------- */
(function () {
  "use strict";
  var svg = document.getElementById("ruptura-svg");
  if (!svg) return;
  var NS = "http://www.w3.org/2000/svg";
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, a, p) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  var lecho = document.getElementById("ru-lecho"), gas = document.getElementById("ru-gas");
  var curva = document.getElementById("ru-curva"), punto = document.getElementById("ru-punto"), etq = document.getElementById("ru-punto-et");
  // granos del lecho
  var granos = [];
  for (var r = 0; r < 16; r++) for (var c = 0; c < 6; c++) {
    var x = 68 + c * 13.5 + (r % 2 ? 6.5 : 0), y = 232 - r * 12.3;
    if (x > 140) continue;
    granos.push({ e: el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 5.2 }, lecho), y: (232 - y) / 192 });
  }
  // partículas de gas: CO2 (naranja) y N2 (gris)
  var parts = [];
  for (var i = 0; i < 26; i++) parts.push({ e: el("circle", { r: 3.6, "class": i % 3 === 0 ? "ru-n2" : "ru-co2" }, gas), co2: i % 3 !== 0, f: i / 26, dx: (Math.random() - .5) * 50 });
  var CICLO = 11, FIN = 0.92;
  function cSalida(t) { return 1 / (1 + Math.exp(-(t - 0.74) / 0.03)); }
  var tRuptura = 0.74 + 0.03 * Math.log(0.1 / 0.9);
  function px(t) { return t / FIN * 420; }
  function py(cv) { return 220 - cv * 200; }
  var GRIS = [226, 231, 238], NAR = [243, 178, 122];
  function mezcla(k) { return "rgb(" + GRIS.map(function (g, j) { return Math.round(g + (NAR[j] - g) * k); }).join(",") + ")"; }
  function estado(t) {
    var frente = Math.min(1.15, t / 0.7);
    granos.forEach(function (g) { g.e.setAttribute("fill", mezcla(Math.max(0, Math.min(1, (frente - g.y) / 0.14)))); });
    var d = "", tt = Math.min(t, FIN);
    for (var s = 0; s <= 120; s++) { var ts = tt * s / 120; d += (s ? "L" : "M") + px(ts).toFixed(1) + " " + py(cSalida(ts)).toFixed(1); }
    curva.setAttribute("d", d);
    if (t >= tRuptura) {
      punto.setAttribute("cx", px(tRuptura)); punto.setAttribute("cy", py(0.1));
      etq.setAttribute("x", px(tRuptura) - 12); etq.setAttribute("y", py(0.1) - 14); etq.setAttribute("text-anchor", "end");
      punto.style.display = ""; etq.style.display = "";
    } else { punto.style.display = "none"; etq.style.display = "none"; }
    return frente;
  }
  function paso(ts) {
    var t = ((ts / 1000) % CICLO) / CICLO * (FIN + 0.12);
    var frente = estado(t);
    parts.forEach(function (p) {
      var f = (ts / 1000 / 2.2 + p.f) % 1;            // recorrido de abajo arriba
      var yRel = f * 1.18 - 0.09;                        // de la entrada a la salida
      var visible = true;
      if (p.co2 && yRel > frente + 0.02 && yRel < 1) visible = false;   // retenido por el lecho
      if (p.co2 && yRel >= 1 && cSalida(t) < 0.05) visible = false;
      var x = 102 + p.dx * Math.sin(f * 9 + p.f * 6) * 0.6;
      var y = 250 - yRel * 192 - 10;
      p.e.setAttribute("cx", x.toFixed(1)); p.e.setAttribute("cy", y.toFixed(1));
      p.e.style.opacity = visible ? Math.min(1, f * 6, (1 - f) * 6).toFixed(2) : 0;
    });
    if (!reducido) requestAnimationFrame(paso);
  }
  if (reducido) { estado(FIN); parts.forEach(function (p) { p.e.style.opacity = 0; }); }
  else requestAnimationFrame(paso);
})();
