(() => {
  const svg = document.querySelector('.math-title');
  if (!svg) return;
  const letters = [...svg.querySelectorAll('.math-letter')];
  const construction = svg.querySelector('.math-construction');
  const controls = JSON.parse(construction.dataset.points);
  const lines = [...construction.querySelectorAll(':scope > polyline')];
  const dots = [...construction.querySelectorAll(':scope > circle')];
  const trace = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  trace.setAttribute('fill', 'none');
  trace.setAttribute('stroke', '#a13c25');
  trace.setAttribute('stroke-width', '1.5');
  construction.prepend(trace);
  const replay = document.querySelector('.math-replay');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const durationScale = 1.5;
  let frame;
  let animations = [];
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const between = (points, t) => points.slice(1).map((p, i) => lerp(points[i], p, t));
  const setLine = (line, points) => line.setAttribute('points', points.map(p => p.join(',')).join(' '));
  const setDot = (dot, p) => { dot.setAttribute('cx', p[0]); dot.setAttribute('cy', p[1]); };
  setLine(lines[0], controls);
  controls.forEach((p, i) => setDot(dots[i], p));
  function finish() {
    cancelAnimationFrame(frame);
    animations.forEach(animation => animation.cancel());
    animations = [];
    letters.forEach(letter => { letter.style.strokeDasharray = 'none'; letter.style.fillOpacity = '1'; });
    construction.style.opacity = '0';
  }
  function play() {
    finish();
    if (reduced.matches) { finish(); return; }
    const start = performance.now();
    letters.forEach((letter, i) => {
      letter.style.strokeDasharray = '1';
      letter.style.strokeDashoffset = '1';
      letter.style.fillOpacity = '0';
      animations.push(letter.animate([{strokeDashoffset: 1}, {strokeDashoffset: 0}],
        {duration: 1900 * durationScale, delay: i * 65 * durationScale, fill: 'forwards'}));
      animations.push(letter.animate([{fillOpacity: 0}, {fillOpacity: 1}],
        {duration: 650 * durationScale, delay: 2200 * durationScale, fill: 'forwards'}));
    });
    function draw(now) {
      const elapsed = (now - start) / durationScale;
      const t = Math.max(0, Math.min(1, elapsed / 2300));
      const first = between(controls, t);
      const second = between(first, t);
      setLine(lines[1], first); setLine(lines[2], second);
      const point = lerp(second[0], second[1], t);
      setDot(dots[4], point);
      trace.setAttribute('d', `M${controls[0]} C${first[0]} ${second[0]} ${point}`);
      construction.style.opacity = String(Math.min(1, elapsed / 150) * Math.max(0, Math.min(1, (2850 - elapsed) / 500)));
      if (elapsed < 2900) frame = requestAnimationFrame(draw);
      else finish();
    }
    frame = requestAnimationFrame(draw);
  }
  replay.hidden = false;
  replay.addEventListener('click', play);
  reduced.addEventListener('change', () => { if (reduced.matches) finish(); });
  addEventListener('pagehide', finish);
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });
  play();
})();
