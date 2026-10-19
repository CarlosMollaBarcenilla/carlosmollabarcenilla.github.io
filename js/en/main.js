// Interacciones de la web de Carlos Mollá. Sin librerías.
(function () {
  "use strict";

  var raiz = document.documentElement;
  var movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Aparición al hacer scroll ----------
  var revelables = document.querySelectorAll(".revelar");
  if ("IntersectionObserver" in window && !movimientoReducido && revelables.length) {
    raiz.classList.add("js-revelar");
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observador.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revelables.forEach(function (el) { observador.observe(el); });
  } else {
    revelables.forEach(function (el) { el.classList.add("visible"); });
  }

  // ---------- Scroll: progreso, cabecera, parallax y líneas de tiempo ----------
  var cabecera = document.getElementById("cabecera");
  var progreso = document.getElementById("progreso");
  var lineas = document.querySelectorAll("[data-linea]");
  var pendiente = false;

  function alHacerScroll() {
    pendiente = false;
    var y = window.scrollY;
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    if (progreso) progreso.style.setProperty("--p", alto > 0 ? (y / alto).toFixed(4) : 0);
    if (cabecera) cabecera.classList.toggle("con-borde", y > 8);
    if (movimientoReducido) return;
    var vh = window.innerHeight;
    lineas.forEach(function (ol) {
      var r = ol.getBoundingClientRect();
      var a = (vh * 0.75 - r.top) / r.height;
      ol.style.setProperty("--avance", Math.max(0, Math.min(1, a)).toFixed(3));
    });
  }
  window.addEventListener("scroll", function () {
    if (!pendiente) { pendiente = true; requestAnimationFrame(alHacerScroll); }
  }, { passive: true });
  window.addEventListener("resize", alHacerScroll);
  if (!movimientoReducido) lineas.forEach(function (ol) { ol.style.setProperty("--avance", 0); });
  alHacerScroll();

  // ---------- Indicador deslizante de pestañas ----------
  var lista = document.getElementById("pestanas");
  var indicador = document.getElementById("indicador");
  if (lista && indicador) {
    var actual = lista.querySelector('a[aria-current="page"]');
    var mover = function (a) {
      if (!a) return;
      indicador.style.width = (a.offsetWidth - 26) + "px";
      indicador.style.transform = "translateX(" + (a.offsetLeft + 13) + "px)";
    };
    mover(actual);
    lista.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("mouseenter", function () { mover(a); });
      a.addEventListener("focus", function () { mover(a); });
    });
    lista.addEventListener("mouseleave", function () { mover(actual); });
    window.addEventListener("resize", function () { mover(actual); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { mover(actual); });
  }

  // ---------- Copiar correo ----------
  var boton = document.getElementById("copiar");
  var email = document.getElementById("email");
  if (boton && email) {
    boton.addEventListener("click", function () {
      var texto = email.textContent.trim();
      var hecho = function () {
        boton.textContent = "Copied";
        setTimeout(function () { boton.textContent = "Copy email"; }, 2000);
      };
      var seleccionar = function () {
        var r = document.createRange(); r.selectNodeContents(email);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        boton.textContent = "Press Ctrl+C";
      };
      try { navigator.clipboard.writeText(texto).then(hecho, seleccionar); } catch (e) { seleccionar(); }
    });
  }

  var anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();
})();
