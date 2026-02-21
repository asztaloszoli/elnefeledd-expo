const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient (amber/orange)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#F59E0B');
  grad.addColorStop(1, '#EA580C');
  ctx.fillStyle = grad;

  // Rounded rectangle background
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Bell icon
  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.28;

  // Green bell on orange background
  ctx.fillStyle = '#16A34A';
  ctx.strokeStyle = '#16A34A';
  ctx.lineWidth = size * 0.02;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Bell body
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.85, cy + s * 0.3);
  ctx.quadraticCurveTo(cx - s * 0.85, cy - s * 0.5, cx - s * 0.5, cy - s * 0.85);
  ctx.quadraticCurveTo(cx, cy - s * 1.3, cx + s * 0.5, cy - s * 0.85);
  ctx.quadraticCurveTo(cx + s * 0.85, cy - s * 0.5, cx + s * 0.85, cy + s * 0.3);
  ctx.lineTo(cx + s, cy + s * 0.5);
  ctx.lineTo(cx - s, cy + s * 0.5);
  ctx.closePath();
  ctx.fill();

  // Bell bottom rim
  ctx.beginPath();
  ctx.moveTo(cx - s * 1.1, cy + s * 0.5);
  ctx.lineTo(cx + s * 1.1, cy + s * 0.5);
  ctx.stroke();

  // Bell clapper (bottom circle)
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.75, s * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Bell top knob
  ctx.beginPath();
  ctx.arc(cx, cy - s * 1.05, s * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Small accent mark
  ctx.fillStyle = '#16A34A';
  ctx.font = `bold ${size * 0.12}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('!', cx + s * 0.65, cy - s * 0.55);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'assets', filename), buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

function generateAdaptiveIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Transparent background (adaptive icon foreground only)
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.22;

  // Green bell (adaptive foreground)
  ctx.fillStyle = '#16A34A';
  ctx.strokeStyle = '#16A34A';
  ctx.lineWidth = size * 0.02;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Bell body
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.85, cy + s * 0.3);
  ctx.quadraticCurveTo(cx - s * 0.85, cy - s * 0.5, cx - s * 0.5, cy - s * 0.85);
  ctx.quadraticCurveTo(cx, cy - s * 1.3, cx + s * 0.5, cy - s * 0.85);
  ctx.quadraticCurveTo(cx + s * 0.85, cy - s * 0.5, cx + s * 0.85, cy + s * 0.3);
  ctx.lineTo(cx + s, cy + s * 0.5);
  ctx.lineTo(cx - s, cy + s * 0.5);
  ctx.closePath();
  ctx.fill();

  // Bell bottom rim
  ctx.beginPath();
  ctx.moveTo(cx - s * 1.1, cy + s * 0.5);
  ctx.lineTo(cx + s * 1.1, cy + s * 0.5);
  ctx.stroke();

  // Bell clapper
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.75, s * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Bell top knob
  ctx.beginPath();
  ctx.arc(cx, cy - s * 1.05, s * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Accent
  ctx.fillStyle = '#16A34A';
  ctx.font = `bold ${size * 0.1}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('!', cx + s * 0.65, cy - s * 0.55);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'assets', filename), buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

function generateSplash(width, height, filename) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2 - 40;
  const s = 50;

  // Green bell on splash
  ctx.fillStyle = '#16A34A';
  ctx.strokeStyle = '#16A34A';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Bell body
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.85, cy + s * 0.3);
  ctx.quadraticCurveTo(cx - s * 0.85, cy - s * 0.5, cx - s * 0.5, cy - s * 0.85);
  ctx.quadraticCurveTo(cx, cy - s * 1.3, cx + s * 0.5, cy - s * 0.85);
  ctx.quadraticCurveTo(cx + s * 0.85, cy - s * 0.5, cx + s * 0.85, cy + s * 0.3);
  ctx.lineTo(cx + s, cy + s * 0.5);
  ctx.lineTo(cx - s, cy + s * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - s * 1.1, cy + s * 0.5);
  ctx.lineTo(cx + s * 1.1, cy + s * 0.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.75, s * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy - s * 1.05, s * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // App name
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('El ne felejtsd!', cx, cy + s * 1.5);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'assets', filename), buffer);
  console.log(`Generated ${filename} (${width}x${height})`);
}

// Generate all icons
generateIcon(1024, 'icon.png');
generateAdaptiveIcon(1024, 'adaptive-icon.png');
generateSplash(200, 200, 'splash-icon.png');
generateIcon(48, 'favicon.png');

console.log('All icons generated!');
