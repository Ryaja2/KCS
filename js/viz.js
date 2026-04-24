// Canvas visualization utilities

function clearCanvas(ctx, canvas, bg = '#080c14') {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawStars(ctx, canvas, count = 120, seed = 42) {
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < count; i++) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    const r = rand() * 1.2 + 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOrbit(ctx, cx, cy, rx, ry = null, angle = 0, color = '#334', dashed = false) {
  if (ry === null) ry = rx;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  if (dashed) ctx.setLineDash([4, 6]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawBody(ctx, x, y, radius, color, glowColor = null, label = null) {
  if (glowColor) {
    const grd = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2.5);
    grd.addColorStop(0, glowColor + '55');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const grd2 = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
  grd2.addColorStop(0, lightenColor(color, 40));
  grd2.addColorStop(1, darkenColor(color, 30));
  ctx.fillStyle = grd2;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(radius, 2), 0, Math.PI * 2);
  ctx.fill();
  if (label) {
    ctx.fillStyle = '#aabbcc';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + radius + 14);
  }
}

function drawSatellite(ctx, x, y, color = '#00d4ff', size = 4) {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Solar panels
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - size * 2.5, y);
  ctx.lineTo(x + size * 2.5, y);
  ctx.stroke();
}

function drawArrow(ctx, x1, y1, x2, y2, color, label = '') {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  // Arrowhead
  const hs = 8;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hs * ux + hs * 0.5 * uy, y2 - hs * uy - hs * 0.5 * ux);
  ctx.lineTo(x2 - hs * ux - hs * 0.5 * uy, y2 - hs * uy + hs * 0.5 * ux);
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.font = '10px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(label, (x1 + x2) / 2 + uy * 12, (y1 + y2) / 2 - ux * 12);
  }
}

function drawLabel(ctx, x, y, text, color = '#aabbcc', size = 11, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function lightenColor(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 0xff) + amount, 0, 255);
  const g = clamp(((n >> 8) & 0xff) + amount, 0, 255);
  const b = clamp((n & 0xff) + amount, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, amount) {
  return lightenColor(hex, -amount);
}

function hexToRGBA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
