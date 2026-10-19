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
      exterior: { t: "Aire exterior", d: { invierno: "Clima de Palermo con año meteorológico tipo (TMY): entre 2,1 °C y 33,5 °C, y una humedad relativa media del 74,7 %. Se impulsa un caudal higiénico constante de 3,6 m³/h por m².", verano: "En verano el aire exterior llega a 33,5 °C con humedades elevadas: la deshumidificación pasa a ser la carga dominante de la unidad de tratamiento de aire." } },
      recuperador: { t: "Recuperador de calor", d: { invierno: "Aprovecha el aire extraído del edificio para precalentar el aire exterior antes de las baterías. Tres modos de control: bypass, modulación y máxima capacidad, con una eficiencia limitada al 70 %.", verano: "Preenfría el aire exterior con el aire extraído cuando resulta favorable; si no aporta, se activa el bypass. Eficiencia limitada al 70 %." } },
      baterias: { t: "Baterías de frío y calor", d: { invierno: "Llevan el aire a la temperatura de impulsión, calculada con una ley de compensación climática entre 16 y 27 °C. Si el aire es demasiado seco (menos de 0,005 kg/kg), se humidifica.", verano: "Si la humedad supera 0,012 kg/kg, la batería de frío enfría el aire para condensar el agua (con un límite antihielo de 4 °C) y la de calor lo recalienta. Si el interior supera 24 °C, la impulsión se fija en 16 °C." } },
      ventilador: { t: "Ventilador", d: { invierno: "El consumo se calcula a partir del caudal y de la potencia específica del sistema (SFP): 1.200 W por m³/s, suma del ventilador (600), el recuperador (300) y el filtro (300).", verano: "Los ventiladores suponen alrededor del 30 % del consumo eléctrico anual en el caso base, por lo que su potencia específica es un parámetro clave." } },
      zonas: { t: "Zonas y fancoils", d: { invierno: "Cinco zonas térmicas con fancoils a cuatro tubos, que disponen de agua fría y caliente a la vez. Control proporcional con banda muerta entre 21 y 24 °C y banda proporcional de 3 °C; fuera de ella, el equipo trabaja a plena potencia.", verano: "Los fancoils cubren las cargas sensibles que la ventilación no puede asumir, calculadas con un balance dinámico de transmisión, ganancias solares, infiltraciones y cargas internas." } },
      bomba: { t: "Bomba de calor reversible", d: { invierno: "La demanda punta es de unos 7,5 kW, así que seleccioné una unidad de 10 kW, con un margen del 25 %. En invierno produce agua caliente a 45 °C. SCOP simulado de 3,18, frente al 2,8 de referencia.", verano: "En verano invierte el ciclo y trabaja como enfriadora, produciendo agua fría a 7 °C. Una sola máquina evita instalar una enfriadora y una caldera por separado para una potencia tan pequeña." } }
    };
    var detalle = document.getElementById("inst-detalle");
    var comps = inst.querySelectorAll(".comp");
    var actual = "bomba", estacion = "invierno";
    var textos = {
      invierno: { bat: "Calentamiento", rec: "Precalienta", agua: "Agua caliente a 45 °C" },
      verano: { bat: "Frío y deshumidificación", rec: "Preenfría", agua: "Agua fría a 7 °C" }
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
      { n: "Caso base", s: "Sistema completo funcionando todo el año", v: 1704.15, d: "Todos los equipos en marcha las 24 horas, aislamiento de 4 cm y factor solar 0,69. Consumo de 4.869 kWh eléctricos: un 70 % del compresor y un 30 % de los ventiladores.", base: true },
      { n: "Apagado fuera de horario", s: "Control según ocupación", v: 1201.51, etq: "−30\u00a0%", d: "Apagar la unidad de tratamiento de aire y los fancoils por la noche y los fines de semana no afecta al confort en horas de uso y reduce el coste anual un 30 %." },
      { n: "Aislamiento de 2 cm", s: "En lugar de 4 cm", v: 1687, d: "Con menos aislamiento la demanda de calefacción sube un 14 %, pero la de refrigeración baja, porque el edificio disipa mejor el calor interno. El coste prácticamente no cambia y la inversión inicial es menor." },
      { n: "Protecciones solares", s: "Factor solar de 0,69 a 0,1", v: 1361, d: "La demanda de refrigeración cae de 12.106 a 5.478 kWh térmicos y la potencia punta, de 7,6 a 4,17 kW. El aumento de la calefacción queda ampliamente compensado." },
      { n: "Resistencias eléctricas", s: "En lugar de la bomba de calor", v: 6104, d: "Con un rendimiento de 1 frente a 3–4 de la bomba de calor, el consumo de climatización sube un 354 % y la factura anual se multiplica por 3,6.", malo: true },
      { n: "Escenario final", s: "Apagado nocturno, 2 cm, factor solar 0,4 y bomba de calor", v: 955.41, d: "La combinación de las mejores medidas reduce el consumo a 2.729 kWh al año, unos 13,65 kWh/m², con el confort dentro de las categorías aceptables.", final: true }
    ];
    var MAX = 6104;
    var fmt = function (v) { return Math.round(v).toLocaleString("es-ES") + " €"; };
    var delta = function (v) {
      if (v === BASE) return "Referencia";
      var r = (v - BASE) / BASE;
      if (r > 1) return "×" + (v / BASE).toFixed(1).replace(".", ",");
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
