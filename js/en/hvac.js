// Página HVAC: esquema interactivo de la instalación y comparador de escenarios.
(function () {
  "use strict";


  /* ---------- 0. Planta con líneas de corriente (partículas) ---------- */
  var planta = document.getElementById("planta");
  if (planta) {
    var reducidoP = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var svgP = document.getElementById("planta-svg");
    var lienzo = document.getElementById("planta-canvas");
    if (reducidoP || !lienzo.getContext) {
      planta.classList.add("estatica");
    } else {
      var ctx = lienzo.getContext("2d");
      // Modelo de partículas en coordenadas del viewBox (600 x 400).
      // Ventilación por mezcla en cascada: el aire sale en chorro de cada difusor, se mezcla
      // con el aire de la sala, pasa al pasillo por la puerta y se extrae en el aseo y al final del pasillo.
      var SALAS = {
        of2: { x0: 26, x1: 244, y0: 26, y1: 374, puerta: [250, 347], dentro: [236, 347] },
        of1: { x0: 256, x1: 574, y0: 26, y1: 164, puerta: [532, 170], dentro: [532, 156] },
        com: { x0: 311, x1: 444, y0: 231, y1: 374, puerta: [305, 262], dentro: [318, 262] }
      };
      // Rejillas de retorno en cada sala (el aire vuelve al recuperador de la unidad de tratamiento)
      var RETORNOS = { of2: [[135, 205], [135, 330]], of1: [[405, 98]], com: [[425, 352]] };
      var DIFUSORES = [[80, 95, "of2"], [190, 95, "of2"], [70, 300, "of2"], [190, 300, "of2"], [330, 85, "of1"], [480, 85, "of1"], [378, 268, "com"]];
      // Recorridos por el pasillo hasta cada rejilla de extracción
      var SALIDAS = {
        of2: [[[278, 347], [278, 200], [420, 198], [562, 198]], [[278, 347], [278, 205], [482, 200], [482, 240], [540, 322]]],
        of1: [[[532, 190], [562, 198]], [[532, 192], [482, 205], [482, 240], [540, 322]]],
        com: [[[278, 262], [278, 205], [420, 198], [562, 198]], [[278, 262], [290, 205], [482, 200], [482, 240], [540, 322]]]
      };
      var AZUL = [62, 120, 179], NAR = [232, 130, 42];
      function color(t, al) {
        var k = Math.min(1, Math.max(0, (t - 0.15) / 0.75));
        return "rgba(" + Math.round(AZUL[0] + (NAR[0] - AZUL[0]) * k) + "," + Math.round(AZUL[1] + (NAR[1] - AZUL[1]) * k) + "," + Math.round(AZUL[2] + (NAR[2] - AZUL[2]) * k) + "," + al + ")";
      }
      function azar(a, b) { return a + Math.random() * (b - a); }
      function nueva(inicio) {
        var d = DIFUSORES[Math.floor(Math.random() * DIFUSORES.length)], ang = Math.random() * Math.PI * 2, v = azar(70, 110);
        var p = { x: d[0] + Math.cos(ang) * 8, y: d[1] + Math.sin(ang) * 8, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
                  sala: d[2], fase: "chorro", edad: 0, mezcla: azar(3.5, 8), ruta: null, paso: 0, prev: null, vida: 0, retorno: null };
        // 75 % del aire se extrae en la propia sala; el resto pasa al pasillo como aire de transferencia
        if (Math.random() < 0.75) { var rs = RETORNOS[d[2]]; p.retorno = rs[Math.floor(Math.random() * rs.length)]; }
        if (inicio) { // repartir el estado inicial para no empezar con todas las partículas en los difusores
          var pasos = Math.floor(Math.random() * 500);
          for (var k = 0; k < pasos && p; k++) p = mover(p, 0.03) ? p : nueva(false);
          if (p) p.prev = null;
        }
        return p;
      }
      function mover(p, dt) {
        p.edad += dt;
        var S = SALAS[p.sala];
        if (p.fase === "chorro" || p.fase === "mezcla") {
          if (p.fase === "chorro") {           // el chorro del difusor se frena al mezclarse
            p.vx *= Math.pow(0.35, dt); p.vy *= Math.pow(0.35, dt);
            if (Math.hypot(p.vx, p.vy) < 28) p.fase = "mezcla";
          } else {                              // movimiento turbulento de mezcla
            p.vx += azar(-1, 1) * 90 * dt; p.vy += azar(-1, 1) * 90 * dt;
            var tir = Math.min(1, Math.max(0, (p.edad - p.mezcla * 0.55) / (p.mezcla * 0.45)));
            var obj0 = p.retorno || S.dentro;
            var dx = obj0[0] - p.x, dy = obj0[1] - p.y, m = Math.hypot(dx, dy) || 1;
            p.vx += dx / m * 40 * tir * dt; p.vy += dy / m * 40 * tir * dt;   // deriva hacia la puerta
            var vm = Math.hypot(p.vx, p.vy), lim = 22 + 12 * tir;
            if (vm > lim) { p.vx *= lim / vm; p.vy *= lim / vm; }
            if (!p.retorno && p.edad > p.mezcla && m < 14) {
              p.fase = "salida"; p.ruta = SALIDAS[p.sala][Math.random() < 0.6 ? 0 : 1]; p.paso = -1; p.dest = S.puerta;
            }
            if (p.retorno && p.edad > p.mezcla * 0.8) {   // la mayoría vuelve por la rejilla de retorno de la sala
              p.fase = "salida"; p.ruta = [p.retorno]; p.paso = -1; p.dest = [p.retorno[0], p.retorno[1]];
            }
          }
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < S.x0) { p.x = S.x0; p.vx = Math.abs(p.vx) * 0.6; } if (p.x > S.x1) { p.x = S.x1; p.vx = -Math.abs(p.vx) * 0.6; }
          if (p.y < S.y0) { p.y = S.y0; p.vy = Math.abs(p.vy) * 0.6; } if (p.y > S.y1) { p.y = S.y1; p.vy = -Math.abs(p.vy) * 0.6; }
          return true;
        }
        // salida: por la puerta y a lo largo del pasillo hasta la rejilla
        var obj = p.dest, ddx = obj[0] - p.x, ddy = obj[1] - p.y, dd = Math.hypot(ddx, ddy);
        if (dd < 7) {
          p.paso++;
          if (p.paso >= p.ruta.length) return false;
          p.dest = [p.ruta[p.paso][0] + azar(-6, 6), p.ruta[p.paso][1] + azar(-6, 6)];
          return true;
        }
        var vel = 46;
        p.vx += (ddx / dd * vel - p.vx) * Math.min(1, 3 * dt) + azar(-1, 1) * 30 * dt;
        p.vy += (ddy / dd * vel - p.vy) * Math.min(1, 3 * dt) + azar(-1, 1) * 30 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        return true;
      }
      var parts = [];
      for (var k = 0; k < 230; k++) parts.push(nueva(true));
      var esc = 1, dpr = 1;
      function ajustar() {
        var r = svgP.getBoundingClientRect();
        dpr = Math.min(2, window.devicePixelRatio || 1);
        lienzo.width = Math.round(r.width * dpr); lienzo.height = Math.round(r.height * dpr);
        esc = r.width / 600;
        ctx.setTransform(dpr * esc, 0, 0, dpr * esc, 0, 0);
        parts.forEach(function (p) { p.prev = null; });
      }
      ajustar();
      window.addEventListener("resize", ajustar);
      var ult = null, visibleP = true, corriendo = false;
      function frame(ts) {
        if (!visibleP) { corriendo = false; ult = null; return; }
        var dt = ult === null ? 0.016 : Math.min(0.05, (ts - ult) / 1000); ult = ts;
        // estela: se desvanece lo dibujado en el fotograma anterior
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fillRect(0, 0, lienzo.width, lienzo.height);
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
        ctx.lineCap = "round"; ctx.lineWidth = 1.8;
        parts.forEach(function (p, i) {
          if (!mover(p, dt)) { parts[i] = nueva(false); return; }
          var t = Math.min(1, p.edad / (p.mezcla + 6));
          var al = Math.min(0.85, p.edad * 3) * (p.fase === "salida" && p.paso === p.ruta.length - 1 ? Math.min(1, Math.hypot(p.dest[0] - p.x, p.dest[1] - p.y) / 30) : 1);
          if (p.prev) {
            ctx.strokeStyle = color(t, al);
            ctx.beginPath(); ctx.moveTo(p.prev[0], p.prev[1]); ctx.lineTo(p.x, p.y); ctx.stroke();
          }
          p.prev = [p.x, p.y];
        });
        requestAnimationFrame(frame);
      }
      function arrancar() { if (!corriendo && visibleP) { corriendo = true; ult = null; requestAnimationFrame(frame); } }
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (e) { visibleP = e[0].isIntersecting; arrancar(); }).observe(planta);
      }
      arrancar();
    }
  }

  /* ---------- 1. Esquema de la instalación ---------- */
  var inst = document.getElementById("instalacion");
  if (inst) {
    var datos = {
      exterior: { t: "Outdoor air", d: { invierno: "Palermo climate with a typical meteorological year (TMY): between 2.1 °C and 33.5 °C, with an average relative humidity of 74.7 %. A constant hygienic air flow of 3.6 m³/h per m² is supplied.", verano: "In summer the outdoor air reaches 33.5 °C with high humidity: dehumidification becomes the dominant load of the air handling unit." } },
      recuperador: { t: "Heat recovery unit", d: { invierno: "It uses the air extracted from the building to preheat the outdoor air before the coils. Three control modes: bypass, modulation and maximum capacity, with efficiency limited to 70 %.", verano: "It precools the outdoor air with the extracted air when this is favourable; if it does not help, the bypass is activated. Efficiency limited to 70 %." } },
      baterias: { t: "Cooling and heating coils", d: { invierno: "They bring the air to the supply temperature, calculated with a weather compensation curve between 16 and 27 °C. If the air is too dry (below 0.005 kg/kg), it is humidified.", verano: "If humidity exceeds 0.012 kg/kg, the cooling coil cools the air to condense the water (with an anti-frost limit of 4 °C) and the heating coil reheats it. If the indoor temperature exceeds 24 °C, the supply is set to 16 °C." } },
      ventilador: { t: "Fan", d: { invierno: "Consumption is calculated from the air flow and the specific fan power of the system (SFP): 1,200 W per m³/s, the sum of the fan (600), the heat recovery unit (300) and the filter (300).", verano: "The fans account for around 30 % of the annual electricity consumption in the base case, so their specific power is a key parameter." } },
      zonas: { t: "Zones and fan coils", d: { invierno: "Five thermal zones with four-pipe fan coils, which have chilled and hot water available at the same time. Proportional control with a dead band between 21 and 24 °C and a proportional band of 3 °C; outside it, the unit runs at full power.", verano: "The fan coils cover the sensible loads that ventilation cannot handle, calculated with a dynamic balance of transmission, solar gains, infiltration and internal loads." } },
      bomba: { t: "Reversible heat pump", d: { invierno: "Peak demand is about 7.5 kW, so I selected a 10 kW unit, with a 25 % margin. In winter it produces hot water at 45 °C. Simulated SCOP of 3.18, compared with a reference of 2.8.", verano: "In summer it reverses the cycle and works as a chiller, producing chilled water at 7 °C. A single machine avoids installing a separate chiller and boiler for such a small capacity." } }
    };
    var detalle = document.getElementById("inst-detalle");
    var comps = inst.querySelectorAll(".comp");
    var actual = "bomba", estacion = "invierno";
    var textos = {
      invierno: { bat: "Heating", rec: "Preheats", agua: "Hot water at 45 °C" },
      verano: { bat: "Cooling and dehumidification", rec: "Precools", agua: "Chilled water at 7 °C" }
    };
    function mostrar() {
      comps.forEach(function (c) {
        var on = c.getAttribute("data-comp") === actual;
        c.classList.toggle("activo", on); c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      var d = datos[actual];
      detalle.innerHTML = "<h3>" + d.t + "</h3><p>" + d.d[estacion] + "</p>";
    }
    function cambiarEstacion(e) {
      estacion = e; inst.setAttribute("data-estacion", e);
      document.getElementById("c-bat").textContent = textos[e].bat;
      document.getElementById("c-rec").textContent = textos[e].rec;
      document.getElementById("c-agua").textContent = textos[e].agua;
      inst.querySelectorAll(".estacion").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-estacion") === e ? "true" : "false"); });
      mostrar();
    }
    comps.forEach(function (c) {
      c.addEventListener("click", function () { actual = c.getAttribute("data-comp"); mostrar(); });
      c.addEventListener("mouseenter", function () { actual = c.getAttribute("data-comp"); mostrar(); });
    });
    inst.querySelectorAll(".estacion").forEach(function (b) {
      b.addEventListener("click", function () { cambiarEstacion(b.getAttribute("data-estacion")); });
    });
    cambiarEstacion("invierno");
  }

  /* ---------- 2. Comparador de escenarios (datos del informe) ---------- */
  var cont = document.getElementById("escenarios");
  if (cont) {
    var BASE = 1704.15;
    var esc = [
      { n: "Base case", s: "Complete system running all year", v: 1704.15, d: "All equipment running 24 hours a day, 4 cm of insulation and a solar factor of 0.69. Consumption of 4,869 kWh of electricity: 70 % from the compressor and 30 % from the fans.", base: true },
      { n: "Off outside working hours", s: "Occupancy-based control", v: 1201.51, etq: "−30\u00a0%", d: "Switching off the air handling unit and the fan coils at night and at weekends does not affect comfort during occupied hours and cuts the annual cost by 30 %." },
      { n: "2 cm insulation", s: "Instead of 4 cm", v: 1687, d: "With less insulation the heating demand rises by 14 %, but the cooling demand falls, because the building dissipates internal heat better. The cost barely changes and the initial investment is lower." },
      { n: "Solar shading", s: "Solar factor from 0.69 to 0.1", v: 1361, d: "The cooling demand falls from 12,106 to 5,478 kWh of heat and the peak power from 7.6 to 4.17 kW. The increase in heating is more than offset." },
      { n: "Electric resistance heaters", s: "Instead of the heat pump", v: 6104, d: "With an efficiency of 1 compared with 3–4 for the heat pump, HVAC consumption rises by 354 % and the annual bill is multiplied by 3.6.", malo: true },
      { n: "Final scenario", s: "Night switch-off, 2 cm, solar factor 0.4 and heat pump", v: 955.41, d: "Combining the best measures reduces consumption to 2,729 kWh per year, about 13.65 kWh/m², with comfort within the acceptable categories.", final: true }
    ];
    var MAX = 6104;
    var fmt = function (v) { return "€" + Math.round(v).toLocaleString("en-GB"); };
    var delta = function (v) {
      if (v === BASE) return "Reference";
      var r = (v - BASE) / BASE;
      if (r > 1) return "×" + (v / BASE).toFixed(1);
      return (r < 0 ? "−" : "+") + Math.abs(Math.round(r * 100)) + " %";
    };
    var escDet = document.getElementById("esc-detalle");
    esc.forEach(function (e, i) {
      var fila = document.createElement("button");
      fila.type = "button"; fila.className = "esc-fila" + (e.base ? " es-base" : "") + (e.final ? " es-final" : "") + (e.malo ? " es-malo" : "");
      fila.setAttribute("role", "listitem");
      fila.innerHTML = '<span class="esc-nombre"><strong>' + e.n + '</strong><small>' + e.s + '</small></span>' +
        '<span class="esc-barra"><span style="--w:' + (e.v / MAX * 100).toFixed(1) + '%"></span><i style="left:' + (BASE / MAX * 100).toFixed(1) + '%" aria-hidden="true"></i></span>' +
        '<span class="esc-valor"><strong>' + fmt(e.v) + '</strong><small>' + (e.etq || delta(e.v)) + '</small></span>';
      fila.addEventListener("click", function () { elegir(i); });
      fila.addEventListener("mouseenter", function () { elegir(i); });
      cont.appendChild(fila);
    });
    function elegir(i) {
      cont.querySelectorAll(".esc-fila").forEach(function (f, j) { f.classList.toggle("activo", j === i); f.setAttribute("aria-pressed", j === i ? "true" : "false"); });
      escDet.innerHTML = "<strong>" + esc[i].n + ".</strong> " + esc[i].d;
    }
    elegir(5);
  }
})();
