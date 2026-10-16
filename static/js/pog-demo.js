/* Interactive Product-of-Gaussians fusion (paper Eqs. 4-5) with the experiments' settings:
   planner default N(0, sigma_pi^2) per coordinate with sigma_pi = 1, prior scale s = 1.
   The 64 samples reuse one set of standard-normal draws, so the plane shows how fusion
   shifts and shrinks the same candidates. */
(function () {
  'use strict';
  var root = document.getElementById('pog');
  if (!root) return;

  var NS = 'http://www.w3.org/2000/svg';
  var SIG_PI = 1.0, K = 64, LIM = 3.5, SQRT2PI = 2.5066282746;
  var state = { m1: 1.6, m2: 1.0, sp: 0.6, seed: 7 };

  function q(id) { return root.querySelector('[data-id="' + id + '"]'); }
  function mk(parent, tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmt(v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2); }

  // Seeded standard-normal draws (Box-Muller on mulberry32) so the page is deterministic.
  function rng(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var Z = [];
  function drawNormals() {
    var r = rng(state.seed);
    Z = [];
    for (var i = 0; i < K; i++) {
      var u = Math.max(r(), 1e-12), v = r(), R = Math.sqrt(-2 * Math.log(u));
      Z.push([R * Math.cos(2 * Math.PI * v), R * Math.sin(2 * Math.PI * v)]);
    }
  }

  function fuse() {
    var tPi = 1 / (SIG_PI * SIG_PI), tP = 1 / (state.sp * state.sp), w = tP / (tPi + tP);
    return { w: w, sf: Math.sqrt(1 / (tPi + tP)), f1: w * state.m1, f2: w * state.m2 };  // mu_pi = 0
  }

  // ---------- 1D panel: densities along a1 ----------
  var svg1 = q('svg1');
  var W1 = 600, H1 = 320, L = 22, R = 22, T = 18, B = 50, X0 = -4.5, X1 = 4.5, BASE = H1 - B;
  function sx(x) { return L + (x - X0) / (X1 - X0) * (W1 - L - R); }
  var g1 = mk(svg1, 'g', {});
  [-4, -3, -2, -1, 0, 1, 2, 3, 4].forEach(function (t) {
    mk(g1, 'line', { x1: sx(t), x2: sx(t), y1: T, y2: BASE, 'class': t === 0 ? 'ax0' : 'grid' });
    if (t % 2 === 0) {
      var lab = mk(g1, 'text', { x: sx(t), y: BASE + 22, 'class': 'tick', 'text-anchor': 'middle' });
      lab.textContent = (t < 0 ? '−' : '') + Math.abs(t);
    }
  });
  mk(g1, 'line', { x1: L, x2: W1 - R, y1: BASE, y2: BASE, 'class': 'axis' });
  var axl = mk(g1, 'text', { x: (L + W1 - R) / 2, y: H1 - 6, 'class': 'axlabel', 'text-anchor': 'middle' });
  axl.textContent = 'action coordinate a₁ (normalized)';
  var curves = {};
  ['def', 'pri', 'fus'].forEach(function (k) {
    curves[k] = { a: mk(svg1, 'path', { 'class': 'a-' + k }), l: mk(svg1, 'path', { 'class': 'l-' + k }), m: mk(svg1, 'path', { 'class': 'm-' + k }) };
  });

  function pdf(x, m, s) { var z = (x - m) / s; return Math.exp(-0.5 * z * z) / (s * SQRT2PI); }
  function setCurve(c, m, s, ymax) {
    var N = 600, d = '';
    for (var i = 0; i <= N; i++) {
      var x = X0 + (X1 - X0) * i / N, y = BASE - pdf(x, m, s) / ymax * (BASE - T);
      d += (i ? 'L' : 'M') + sx(x).toFixed(1) + ',' + y.toFixed(1);
    }
    c.l.setAttribute('d', d);
    c.a.setAttribute('d', d + 'L' + sx(X1) + ',' + BASE + 'L' + sx(X0) + ',' + BASE + 'Z');
    var mx = sx(clamp(m, X0, X1));
    c.m.setAttribute('d', 'M' + (mx - 6) + ',' + (BASE + 10) + 'L' + (mx + 6) + ',' + (BASE + 10) + 'L' + mx + ',' + (BASE + 2) + 'Z');
  }

  // ---------- 2D panel: the action plane ----------
  var svg2 = q('svg2');
  var W2 = 320, PAD = 10, A0 = -4, A1 = 4, SPAN = W2 - 2 * PAD;
  function px(x) { return PAD + (x - A0) / (A1 - A0) * SPAN; }
  function py(y) { return W2 - PAD - (y - A0) / (A1 - A0) * SPAN; }
  function pr(s) { return s / (A1 - A0) * SPAN; }
  var defs = mk(svg2, 'defs', {});
  var clip = mk(defs, 'clipPath', { id: 'pog-clip' });
  mk(clip, 'rect', { x: PAD, y: PAD, width: SPAN, height: SPAN });
  var g2 = mk(svg2, 'g', { 'clip-path': 'url(#pog-clip)' });
  for (var t = -4; t <= 4; t++) {
    mk(g2, 'line', { x1: px(t), x2: px(t), y1: PAD, y2: W2 - PAD, 'class': t === 0 ? 'ax0' : 'grid' });
    mk(g2, 'line', { x1: PAD, x2: W2 - PAD, y1: py(t), y2: py(t), 'class': t === 0 ? 'ax0' : 'grid' });
  }
  mk(g2, 'circle', { cx: px(0), cy: py(0), r: pr(SIG_PI), 'class': 'c-def' });
  var cPri = mk(g2, 'circle', { 'class': 'c-pri' });
  var cFus = mk(g2, 'circle', { 'class': 'c-fus' });
  var gLinks = mk(g2, 'g', { 'class': 'links' }), gDef = mk(g2, 'g', {}), gFus = mk(g2, 'g', {});
  var links = [], dDef = [], dFus = [];
  for (var i = 0; i < K; i++) {
    links.push(mk(gLinks, 'line', {}));
    dDef.push(mk(gDef, 'circle', { r: 2.4, 'class': 's-def' }));
    dFus.push(mk(gFus, 'circle', { r: 2.8, 'class': 's-fus' }));
  }
  var fMean = mk(g2, 'circle', { r: 4.5, 'class': 'fmean' });
  var handle = mk(svg2, 'circle', { r: 7.5, 'class': 'handle' });

  // ---------- controls ----------
  var sSp = q('sp'), sM1 = q('m1'), sM2 = q('m2');
  var SP_LO = -1, SP_HI = 1;  // log10 range of sigma_p: 0.1 .. 10
  function spToSlider(sp) { return (Math.log10(sp) - SP_LO) / (SP_HI - SP_LO) * 100; }
  function sliderToSp(v) { return Math.pow(10, SP_LO + (SP_HI - SP_LO) * v / 100); }
  function fill(el) { var p = (el.value - el.min) / (el.max - el.min) * 100; el.style.setProperty('--p', p + '%'); }
  var presets = root.querySelectorAll('[data-sp]');

  function render() {
    var f = fuse();
    function peak(s) { return 1 / (s * SQRT2PI); }
    var ymax = 1.1 * Math.max(peak(SIG_PI), peak(state.sp), peak(f.sf));
    setCurve(curves.def, 0, SIG_PI, ymax);
    setCurve(curves.pri, state.m1, state.sp, ymax);
    setCurve(curves.fus, f.f1, f.sf, ymax);

    cPri.setAttribute('cx', px(state.m1)); cPri.setAttribute('cy', py(state.m2)); cPri.setAttribute('r', pr(state.sp));
    cFus.setAttribute('cx', px(f.f1)); cFus.setAttribute('cy', py(f.f2)); cFus.setAttribute('r', pr(f.sf));
    for (var i = 0; i < K; i++) {
      var ax = px(Z[i][0] * SIG_PI), ay = py(Z[i][1] * SIG_PI);
      var bx = px(f.f1 + Z[i][0] * f.sf), by = py(f.f2 + Z[i][1] * f.sf);
      dDef[i].setAttribute('cx', ax); dDef[i].setAttribute('cy', ay);
      dFus[i].setAttribute('cx', bx); dFus[i].setAttribute('cy', by);
      links[i].setAttribute('x1', ax); links[i].setAttribute('y1', ay);
      links[i].setAttribute('x2', bx); links[i].setAttribute('y2', by);
    }
    fMean.setAttribute('cx', px(f.f1)); fMean.setAttribute('cy', py(f.f2));
    handle.setAttribute('cx', px(state.m1)); handle.setAttribute('cy', py(state.m2));

    sSp.value = spToSlider(state.sp); sM1.value = state.m1; sM2.value = state.m2;
    [sSp, sM1, sM2].forEach(fill);
    q('spv').textContent = state.sp.toFixed(2);
    q('m1v').textContent = fmt(state.m1);
    q('m2v').textContent = fmt(state.m2);
    q('w').textContent = f.w < 0.005 ? '<1%' : Math.round(100 * f.w) + '%';
    q('fm').textContent = '(' + fmt(f.f1) + ', ' + fmt(f.f2) + ')';
    q('fs').textContent = f.sf.toFixed(2);
    presets.forEach(function (b) { b.classList.toggle('active', Math.abs(parseFloat(b.dataset.sp) - state.sp) < 1e-6); });
  }

  sSp.addEventListener('input', function () { state.sp = sliderToSp(parseFloat(sSp.value)); render(); });
  sM1.addEventListener('input', function () { state.m1 = parseFloat(sM1.value); render(); });
  sM2.addEventListener('input', function () { state.m2 = parseFloat(sM2.value); render(); });
  presets.forEach(function (b) { b.addEventListener('click', function () { state.sp = parseFloat(b.dataset.sp); render(); }); });
  q('resample').addEventListener('click', function () { state.seed += 1; drawNormals(); render(); });

  // Drag (or click) in the plane to place the prior mean.
  var dragging = false;
  function place(evt) {
    var pt = svg2.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    var p = pt.matrixTransform(svg2.getScreenCTM().inverse());
    var x = A0 + (p.x - PAD) / SPAN * (A1 - A0), y = A0 + (W2 - PAD - p.y) / SPAN * (A1 - A0);
    state.m1 = clamp(Math.round(x * 20) / 20, -LIM, LIM);
    state.m2 = clamp(Math.round(y * 20) / 20, -LIM, LIM);
    render();
  }
  svg2.addEventListener('pointerdown', function (e) { dragging = true; svg2.setPointerCapture(e.pointerId); root.classList.add('dragging'); place(e); });
  svg2.addEventListener('pointermove', function (e) { if (dragging) place(e); });
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    svg2.addEventListener(ev, function () { dragging = false; root.classList.remove('dragging'); });
  });

  drawNormals();
  render();
})();
