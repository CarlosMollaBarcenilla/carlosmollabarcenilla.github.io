// Carrusel de resultados y visor de figuras, compartido por las páginas de proyecto.
(function () {
  "use strict";
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* =========================================================
     3. Carrusel de resultados
     ========================================================= */
  var pista = document.getElementById("pista");
  if (pista) {
    var diapos = pista.querySelectorAll(".diapositiva");
    var puntos = document.getElementById("puntos");
    var contador = document.getElementById("contador");
    var ant = document.getElementById("anterior"), sig = document.getElementById("siguiente");
    var actual = 0;
    diapos.forEach(function (d, i) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", "Go to result " + (i + 1));
      b.addEventListener("click", function () { ir(i); });
      puntos.appendChild(b);
    });
    function ir(i) {
      i = Math.max(0, Math.min(diapos.length - 1, i));
      pista.scrollTo({ left: diapos[i].offsetLeft - pista.offsetLeft, behavior: reducido ? "auto" : "smooth" });
    }
    function refrescar() {
      var i = Math.round(pista.scrollLeft / pista.clientWidth);
      if (i === actual && contador.dataset.listo) return;
      actual = i; contador.dataset.listo = "1";
      contador.textContent = (i + 1) + " / " + diapos.length;
      puntos.querySelectorAll("button").forEach(function (b, j) { b.setAttribute("aria-current", j === i ? "true" : "false"); });
      ant.setAttribute("aria-disabled", i === 0 ? "true" : "false");
      sig.setAttribute("aria-disabled", i === diapos.length - 1 ? "true" : "false");
      diapos.forEach(function (d, j) { d.setAttribute("aria-hidden", j === i ? "false" : "true"); d.inert = j !== i; });
    }
    var esperando = false;
    pista.addEventListener("scroll", function () {
      if (!esperando) { esperando = true; requestAnimationFrame(function () { esperando = false; refrescar(); }); }
    }, { passive: true });
    ant.addEventListener("click", function () { ir(actual - 1); });
    sig.addEventListener("click", function () { ir(actual + 1); });
    pista.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); ir(actual + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); ir(actual - 1); }
    });
    window.addEventListener("resize", function () { ir(actual); });
    refrescar();
  }

  /* =========================================================
     4. Visor de figuras ampliadas
     ========================================================= */
  var visor = document.getElementById("visor");
  if (visor && typeof visor.showModal === "function") {
    var vimg = document.getElementById("visor-img");
    document.querySelectorAll(".ampliar").forEach(function (b) {
      b.addEventListener("click", function () {
        var img = b.querySelector("img");
        vimg.src = b.getAttribute("data-src"); vimg.alt = img ? img.alt : "";
        visor.showModal();
      });
    });
    document.getElementById("visor-cerrar").addEventListener("click", function () { visor.close(); });
    visor.addEventListener("click", function (e) { if (e.target === visor) visor.close(); });
  }
})();
