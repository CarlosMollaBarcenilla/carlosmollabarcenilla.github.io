// Página Energía: animación de la batería de Carnot, ciclo T-s y carrusel de resultados.
(function () {
  "use strict";
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  /* =========================================================
     0. Mini-planta de la cabecera: generación, almacenamiento y descarga
     ========================================================= */
  var mp = document.getElementById("mp");
  if (mp) {
    var NS = "http://www.w3.org/2000/svg";
    var aspas = document.getElementById("mp-aspas"), rotor = document.getElementById("mp-rotor");
    var liquido = document.getElementById("mp-liquido"), rayo = document.getElementById("mp-rayo");
    var rayos = document.getElementById("mp-rayos");
    var m = [1, 2, 3].map(function (k) { return document.getElementById("mp-m" + k); });
    var nTxt = [1, 2, 3].map(function (k) { return document.getElementById("mp-n" + k); });
    // Partículas en cada tubería: [x0, x1, clase]
    var tubos = [[116, 186, "mp-part-el"], [274, 318, "mp-part-cal"]];
    var particulas = tubos.map(function (tb, k) {
      var g = document.getElementById("mp-part" + (k + 1)), lista = [];
      var num = k === 1 ? 3 : 4;
      for (var i = 0; i < num; i++) {
        var c = document.createElementNS(NS, "circle");
        c.setAttribute("r", "3.6"); c.setAttribute("cy", "160"); c.setAttribute("class", tb[2]);
        g.appendChild(c); lista.push({ el: c, f: i / num });
      }
      return lista;
    });
    var nivelMP = 0.5, angA = 0, angR = 0, tiempo = 0, ultMP = null, visibleMP = true, corriendoMP = false;
    var DEMANDA = 0.5;
    function generacion(tt) {
      var v = 0.52 + 0.38 * Math.sin(tt * 0.55) + 0.12 * Math.sin(tt * 1.9 + 1) + 0.06 * Math.sin(tt * 4.3);
      return Math.max(0.02, Math.min(1, v));
    }
    function liquidoPath(nv, tt) {
      var top = 214 - nv * 112, d = "M196 " + top.toFixed(1);
      for (var x = 196; x <= 264; x += 4) d += " L" + x + " " + (top + Math.sin(x / 7 + tt * 3) * 2).toFixed(1);
      return d + " L264 216 L196 216 Z";
    }
    function pintarMP(dt) {
      var g = generacion(tiempo);
      var exc = Math.max(0, g - DEMANDA);
      var def = nivelMP > 0.03 ? Math.max(0, DEMANDA - g) : 0;
      nivelMP = Math.max(0, Math.min(1, nivelMP + (exc * 0.55 - def * 0.6) * dt));
      if (nivelMP >= 1) exc = 0;
      angA = (angA + g * 260 * dt) % 360;
      angR = (angR + def * 900 * dt) % 360;
      aspas.setAttribute("transform", "rotate(" + angA.toFixed(1) + " 80 100)");
      rotor.setAttribute("transform", "rotate(" + angR.toFixed(1) + " 344 160)");
      rayos.style.opacity = (0.35 + 0.65 * g).toFixed(2);
      liquido.setAttribute("d", liquidoPath(nivelMP, tiempo));
      var pulso = def > 0.02 ? (tiempo * 1.6) % 1 : 1;
      rayo.style.opacity = def > 0.02 ? (0.9 * (1 - pulso)).toFixed(2) : 0;
      rayo.style.transform = "scale(" + (1 + pulso * 0.35).toFixed(3) + ")";
      var flujos = [exc, def];
      particulas.forEach(function (lista, k) {
        var tb = tubos[k], f = flujos[k];
        lista.forEach(function (p) {
          p.f = (p.f + dt * (0.25 + f * 2.2)) % 1;
          p.el.setAttribute("cx", (tb[0] + (tb[1] - tb[0]) * p.f).toFixed(1));
          p.el.style.opacity = f > 0.01 ? Math.min(1, 0.35 + f * 3) : 0;
        });
      });
      var vals = [g, nivelMP, def / DEMANDA];
      vals.forEach(function (v, k) {
        m[k].setAttribute("width", (80 * Math.min(1, v)).toFixed(1));
        nTxt[k].textContent = Math.round(Math.min(1, v) * 100) + " %";
      });
    }
    function pasoMP(ts) {
      if (!visibleMP || reducido) { corriendoMP = false; ultMP = null; return; }
      var dt = ultMP === null ? 0 : Math.min((ts - ultMP) / 1000, 0.05);
      ultMP = ts; tiempo += dt;
      pintarMP(dt);
      requestAnimationFrame(pasoMP);
    }
    function arrancarMP() { if (!corriendoMP && visibleMP && !reducido) { corriendoMP = true; requestAnimationFrame(pasoMP); } }
    tiempo = 0.8; pintarMP(0);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visibleMP = e[0].isIntersecting; arrancarMP(); }).observe(mp);
    }
    arrancarMP();
  }

  /* =========================================================
     1. Un día de una batería de Carnot (esquema ilustrativo)
     ========================================================= */
  var svg = document.getElementById("bat-svg");
  if (svg) {
    var X0, X1, Y0, YT, MAXP = 1.35;
    var x = function (h) { return X0 + (h / 24) * (X1 - X0); };
    var y = function (p) { return Y0 - (p / MAXP) * (Y0 - YT); };

    // Perfiles inventados: solar en campana + eólica variable; demanda con picos de mañana y tarde
    function gen(h) {
      var sol = h > 6.5 && h < 20 ? Math.pow(Math.sin(Math.PI * (h - 6.5) / 13.5), 1.6) * 1.0 : 0;
      var viento = 0.22 + 0.1 * Math.sin(h / 2.6 + 1) + 0.05 * Math.sin(h * 1.9);
      return sol + viento;
    }
    function dem(h) {
      return 0.42 + 0.2 * Math.exp(-Math.pow(h - 9, 2) / 5) + 0.32 * Math.exp(-Math.pow(h - 20.5, 2) / 6);
    }

    // La gráfica se redibuja al ancho real del contenedor, así el texto mantiene su tamaño
    var ns = "http://www.w3.org/2000/svg";
    var rej = document.getElementById("bat-rejilla"), ejes = document.getElementById("bat-ejes");
    function nuevo(tag, attrs, texto) {
      var el = document.createElementNS(ns, tag);
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      if (texto) el.textContent = texto;
      return el;
    }
    function dibujar() {
      var W = Math.max(280, Math.round(svg.getBoundingClientRect().width || 600));
      var H = W < 560 ? 190 : 230;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      X0 = 8; X1 = W - 8; Y0 = H - 30; YT = 26;
      rej.textContent = ""; ejes.textContent = "";
      for (var hh = 0; hh <= 24; hh += 6) {
        rej.appendChild(nuevo("line", { "class": "rejilla", x1: x(hh), x2: x(hh), y1: YT, y2: Y0 }));
        var anc = hh === 0 ? "start" : (hh === 24 ? "end" : "middle");
        ejes.appendChild(nuevo("text", { "class": "eje", x: x(hh), y: Y0 + 20, "text-anchor": anc }, (hh < 10 ? "0" : "") + hh + ":00"));
      }
      rej.appendChild(nuevo("line", { x1: X0, x2: X1, y1: Y0, y2: Y0, stroke: "var(--gris)" }));
      ejes.appendChild(nuevo("text", { "class": "eje", x: X0, y: 12 }, "Potencia"));
      var N = 192, dGen = "", dDem = "", dExc = "", tramo = [];
      for (var i = 0; i <= N; i++) {
        var h = 24 * i / N;
        dGen += (i ? " L" : "M") + x(h).toFixed(1) + " " + y(gen(h)).toFixed(1);
        dDem += (i ? " L" : "M") + x(h).toFixed(1) + " " + y(dem(h)).toFixed(1);
        var g = gen(h), d = dem(h);
        if (g > d) tramo.push(h);
        if ((g <= d || i === N) && tramo.length) {
          var arriba = tramo.map(function (k) { return x(k).toFixed(1) + " " + y(gen(k)).toFixed(1); });
          var abajo = tramo.slice().reverse().map(function (k) { return x(k).toFixed(1) + " " + y(dem(k)).toFixed(1); });
          dExc += "M" + arriba.join(" L") + " L" + abajo.join(" L") + " Z ";
          tramo = [];
        }
      }
      document.getElementById("bat-gen").setAttribute("d", dGen + " L" + X1 + " " + Y0 + " L" + X0 + " " + Y0 + " Z");
      document.getElementById("bat-dem").setAttribute("d", dDem);
      document.getElementById("bat-exc").setAttribute("d", dExc);
      var cur = document.getElementById("bat-cursor");
      cur.setAttribute("y1", YT - 6); cur.setAttribute("y2", Y0);
    }
    dibujar();
    var redim = null;
    window.addEventListener("resize", function () { clearTimeout(redim); redim = setTimeout(function () { dibujar(); pintar(); }, 120); });

    // Estado dinámico
    var cursor = document.getElementById("bat-cursor");
    var horaEl = document.getElementById("bat-hora"), modoEl = document.getElementById("bat-modo");
    var depCal = document.getElementById("dep-cal"), depFri = document.getElementById("dep-fri");
    var nodos = { ren: "n-ren", p2h: "n-p2h", h: "n-h", h2p: "n-h2p", red: "n-red" };
    Object.keys(nodos).forEach(function (k) { nodos[k] = document.getElementById(nodos[k]); });
    var fl = [1, 2, 3, 4].map(function (k) { return document.getElementById("f-" + k); });

    var hora = 12, nivel = 0.45, modo = "", enMarcha = !reducido, ultimo = null;
    var DIA_MS = 18000; // un día dura 18 s

    function pintar() {
      var g = gen(hora), d = dem(hora), s = g - d;
      cursor.setAttribute("x1", x(hora)); cursor.setAttribute("x2", x(hora));
      var hInt = Math.floor(hora), mInt = Math.floor((hora - hInt) * 60 / 15) * 15;
      horaEl.textContent = (hInt < 10 ? "0" : "") + hInt + ":" + (mInt < 10 ? "0" : "") + mInt;
      var nuevo = s > 0.03 && nivel < 0.98 ? "carga" : (s < -0.03 && nivel > 0.02 ? "descarga" : "reposo");
      if (s > 0.03 && nivel >= 0.98) nuevo = "lleno";
      if (nuevo !== modo) {
        modo = nuevo;
        var textos = { carga: "Sobra energía: cargando", descarga: "Falta energía: descargando", reposo: "Generación y demanda equilibradas", lleno: "Depósito lleno" };
        modoEl.textContent = textos[modo];
        modoEl.setAttribute("data-modo", modo === "lleno" ? "reposo" : modo);
        var c = modo === "carga", dsc = modo === "descarga";
        nodos.ren.classList.toggle("activo", c); nodos.p2h.classList.toggle("activo", c);
        nodos.h.classList.toggle("activo", c || dsc);
        nodos.h2p.classList.toggle("activo", dsc); nodos.red.classList.toggle("activo", dsc);
        fl[0].classList.toggle("activo", c); fl[1].classList.toggle("activo", c);
        fl[2].classList.toggle("activo", dsc); fl[3].classList.toggle("activo", dsc);
      }
      depCal.style.setProperty("--nivel", (8 + nivel * 84).toFixed(1) + "%");
      depFri.style.setProperty("--nivel", (8 + (1 - nivel) * 84).toFixed(1) + "%");
    }

    var corriendo = false, visible = true;
    function paso(ts) {
      if (!enMarcha || !visible) { corriendo = false; ultimo = null; return; }
      if (ultimo !== null) {
        var dt = Math.min(ts - ultimo, 60);
        var dh = 24 * dt / DIA_MS;
        var s = gen(hora) - dem(hora);
        nivel = Math.max(0, Math.min(1, nivel + s * dh * (s > 0 ? 0.2 : 0.3)));
        hora = (hora + dh) % 24;
        pintar();
      }
      ultimo = ts;
      requestAnimationFrame(paso);
    }
    function arrancar() {
      if (corriendo || !enMarcha || !visible) return;
      corriendo = true; ultimo = null; requestAnimationFrame(paso);
    }

    var boton = document.getElementById("bat-boton");
    function actualizarBoton() {
      boton.textContent = enMarcha ? "Pausar" : "Reproducir";
      boton.setAttribute("aria-pressed", enMarcha ? "false" : "true");
    }
    boton.addEventListener("click", function () {
      enMarcha = !enMarcha; actualizarBoton(); arrancar();
    });
    // Solo anima cuando está a la vista
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting; arrancar();
      }).observe(document.getElementById("bateria"));
    }
    pintar(); actualizarBoton(); arrancar();
  }

  /* =========================================================
     2. Ciclo T-s: pasos enlazados con el diagrama
     ========================================================= */
  var estados = document.querySelectorAll(".diagrama .estado");
  var pasos = document.querySelectorAll("#pasos li");
  var diagrama = document.getElementById("diagrama");
  var tramos = document.querySelectorAll(".diagrama .tramo");
  var marcado = -1;
  function marcar(i) {
    if (i === marcado) return;
    marcado = i;
    estados.forEach(function (e, j) { e.classList.toggle("activo", j === i); });
    pasos.forEach(function (p, j) { p.classList.toggle("activo", j === i); });
    tramos.forEach(function (t, j) {
      t.classList.remove("activo");
      if (j === i) { void t.getBoundingClientRect(); t.classList.add("activo"); }
    });
    if (diagrama) {
      diagrama.classList.toggle("con-tramo", i >= 0);
      if (i >= 0) diagrama.setAttribute("data-tramo", i); else diagrama.removeAttribute("data-tramo");
    }
  }
  var listaPasos = document.getElementById("pasos");
  if (listaPasos) listaPasos.addEventListener("mouseleave", function () { marcar(-1); });
  function enlazar(el, i) {
    el.addEventListener("click", function () { marcar(i); });
    el.addEventListener("mouseenter", function () { marcar(i); });
    el.addEventListener("focus", function () { marcar(i); });
    el.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); marcar(i); }
    });
  }
  estados.forEach(function (e) { enlazar(e, Number(e.getAttribute("data-paso"))); });
  pasos.forEach(function (p) { enlazar(p, Number(p.getAttribute("data-paso"))); });

})();

/* ---------- Simulador del mercado eléctrico: curva de orden de mérito ---------- */
(function () {
  "use strict";
  var svg = document.getElementById("merito-svg");
  if (!svg) return;
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, a, p) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  // Datos reales del simulador (Simulador.py): horas de la partida y centrales para 4 empresas (factor 1 × 4)
  var HORAS = [
    { h: "08:00", d: 8790, r: 4900 }, { h: "09:00", d: 9271, r: 6600 }, { h: "10:00", d: 9700, r: 8800 },
    { h: "11:00", d: 9100, r: 4100 }, { h: "12:00", d: 8750, r: 2750 }
  ];
  var TEC = [
    { n: "Nuclear", mw: 970 * 4, c: 8, col: "#1B2C4F" },
    { n: "Carbón", mw: 830 * 4, c: 86, col: "#5A6478" },
    { n: "Ciclo combinado", mw: 800 * 4, c: 121, col: "#3E78B3" },
    { n: "Gas (punta)", mw: 500 * 4, c: 168, col: "#E8822A" }
  ];
  var W = 760, H = 320, L = 56, R = 16, T = 18, B = 40;
  var XMAX = 22000, YMAX = 190;
  var X = function (mw) { return L + mw / XMAX * (W - L - R); };
  var Y = function (p) { return H - B - p / YMAX * (H - T - B); };
  var fmt = function (v) { return Math.round(v).toLocaleString("es-ES"); };
  // ejes
  var ejes = el("g", { "class": "mo-ejes" }, svg);
  [0, 50, 100, 150].forEach(function (p) {
    el("line", { x1: L, x2: W - R, y1: Y(p), y2: Y(p), "class": "mo-rejilla" }, ejes);
    el("text", { x: L - 8, y: Y(p) + 4, "text-anchor": "end", "class": "mo-et" }, ejes).textContent = p;
  });
  [0, 5000, 10000, 15000, 20000].forEach(function (m) {
    el("text", { x: X(m), y: H - B + 18, "text-anchor": "middle", "class": "mo-et" }, ejes).textContent = fmt(m);
  });
  el("text", { x: L - 44, y: T + 4, "class": "mo-et" }, ejes).textContent = "€/MWh";
  el("text", { x: W - R, y: H - 6, "text-anchor": "end", "class": "mo-et" }, ejes).textContent = "MW";
  var gBloques = el("g", {}, svg), gLineas = el("g", {}, svg);
  var dem = el("line", { y1: T - 4, y2: H - B, "class": "mo-demanda" }, gLineas);
  var demEt = el("text", { y: T + 8, "class": "mo-et mo-et-dem" }, gLineas);
  var pre = el("line", { x1: L, "class": "mo-precio" }, gLineas);
  var punto = el("circle", { r: 6, "class": "mo-punto" }, gLineas);
  var bloques = [];
  function dibujar(k) {
    var hr = HORAS[k], x0 = 0, precio = 0, marg = -1;
    var tramos = [{ n: "Renovables", mw: hr.r, c: 0, col: "#4E9E6C" }].concat(TEC);
    tramos.forEach(function (t, i) {
      if (!bloques[i]) bloques[i] = el("rect", { "class": "mo-bloque" }, gBloques);
      var b = bloques[i], alto = Math.max(3, Y(0) - Y(t.c));
      b.setAttribute("x", X(x0)); b.setAttribute("width", Math.max(0, X(x0 + t.mw) - X(x0) - 1.5));
      b.setAttribute("y", Y(0) - alto); b.setAttribute("height", alto); b.setAttribute("fill", t.col);
      if (marg < 0 && x0 + t.mw >= hr.d) { marg = i; precio = t.c; }
      x0 += t.mw;
    });
    bloques.forEach(function (b, i) { b.classList.toggle("marginal", i === marg); });
    var xd = X(hr.d);
    dem.setAttribute("x1", xd); dem.setAttribute("x2", xd);
    demEt.setAttribute("x", xd + 6); demEt.textContent = "Demanda " + fmt(hr.d) + " MW";
    pre.setAttribute("x2", xd); pre.setAttribute("y1", Y(precio)); pre.setAttribute("y2", Y(precio));
    punto.setAttribute("cx", xd); punto.setAttribute("cy", Y(precio));
    document.getElementById("mo-dem").textContent = fmt(hr.d) + " MW";
    document.getElementById("mo-ren").textContent = fmt(hr.r) + " MW";
    document.getElementById("mo-res").textContent = fmt(hr.d - hr.r) + " MW";
    document.getElementById("mo-precio").textContent = precio + " €/MWh";
  }
  var cont = document.getElementById("merito-horas");
  HORAS.forEach(function (hr, k) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "estacion"; b.textContent = hr.h; b.setAttribute("aria-pressed", k === 0 ? "true" : "false");
    b.addEventListener("click", function () {
      cont.querySelectorAll(".estacion").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
      dibujar(k);
    });
    cont.appendChild(b);
  });
  dibujar(0);
})();
