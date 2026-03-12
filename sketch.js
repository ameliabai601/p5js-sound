// ─── Audio Engine ─────────────────────────────────────────────────────────────
let audioCtx, masterGain, filter, reverb, reverbGain, dryGain;
let drone = null, droneGain = null;
let isPlaying = false;
let audioReady = false;

const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
let waveIdx = 0;

function initAudio() {
  if (audioReady) return;
  audioReady = true;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.6;

  filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  filter.Q.value = 4;

  // Simple reverb via convolver
  const convLen = audioCtx.sampleRate * 2;
  const convBuf = audioCtx.createBuffer(2, convLen, audioCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = convBuf.getChannelData(ch);
    for (let i = 0; i < convLen; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / convLen, 2.5);
    }
  }
  reverb = audioCtx.createConvolver();
  reverb.buffer = convBuf;

  reverbGain = audioCtx.createGain();
  reverbGain.gain.value = 0.35;
  dryGain = audioCtx.createGain();
  dryGain.gain.value = 0.7;

  filter.connect(dryGain);
  dryGain.connect(masterGain);
  filter.connect(reverb);
  reverb.connect(reverbGain);
  reverbGain.connect(masterGain);
  masterGain.connect(audioCtx.destination);
}

// Map mouse X to a pentatonic frequency
function freqFromX(x, w) {
  const notes = [0, 2, 4, 7, 9]; // pentatonic scale intervals
  const octaves = 3;
  const totalSteps = notes.length * octaves;
  const step = Math.floor((x / w) * totalSteps);
  const oct = Math.floor(step / notes.length);
  const noteIdx = step % notes.length;
  const semitone = oct * 12 + notes[noteIdx];
  return 110 * Math.pow(2, semitone / 12);
}

// Map mouse Y to filter frequency
function filterFromY(y, h) {
  const t = 1 - (y / h);
  return 200 + Math.pow(t, 2) * 7800;
}

function startDrone(freq) {
  if (drone) { drone.stop(); drone = null; }
  drone = audioCtx.createOscillator();
  droneGain = audioCtx.createGain();
  drone.type = WAVES[waveIdx];
  drone.frequency.value = freq;
  droneGain.gain.setValueAtTime(0, audioCtx.currentTime);
  droneGain.gain.linearRampToValueAtTime(0.45, audioCtx.currentTime + 0.04);
  drone.connect(droneGain);
  droneGain.connect(filter);
  drone.start();
  isPlaying = true;
}

function updateDrone(freq, filterFreq) {
  if (!drone) return;
  drone.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.03);
  filter.frequency.setTargetAtTime(filterFreq, audioCtx.currentTime, 0.05);
}

function stopDrone() {
  if (!drone) return;
  droneGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.08);
  const d = drone;
  setTimeout(() => { try { d.stop(); } catch(e) {} }, 500);
  drone = null;
  isPlaying = false;
}

function pluck(freq, filterFreq) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = WAVES[waveIdx];
  osc.frequency.value = freq;
  osc.frequency.setTargetAtTime(freq * 0.5, audioCtx.currentTime, 0.12);
  env.gain.setValueAtTime(0.55, audioCtx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);
  filter.frequency.setValueAtTime(filterFreq * 2, audioCtx.currentTime);
  filter.frequency.setTargetAtTime(filterFreq, audioCtx.currentTime, 0.15);
  osc.connect(env);
  env.connect(filter);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.95);
}

// ─── p5 Sketch ────────────────────────────────────────────────────────────────
new p5(function(p) {
  let isDragging = false;

  p.setup = function() {
    const cnv = p.createCanvas(p.windowWidth, p.windowHeight);
    cnv.parent('canvas-wrap');
    p.colorMode(p.HSB, 360, 100, 100, 100);
    p.noSmooth();
  };

  p.draw = function() {
    p.background(38, 12, 96);

    const freq = freqFromX(p.mouseX, p.width);
    const filterFreq = filterFromY(p.mouseY, p.height);

    drawField();

    // cursor dot
    p.noStroke();
    p.fill(0, 0, 20, 80);
    p.ellipse(p.mouseX, p.mouseY, 8, 8);

    // update audio while dragging
    if (isDragging && audioCtx) {
      if (!isPlaying) startDrone(freq);
      else updateDrone(freq, filterFreq);
    }
  };

  function drawField() {
    // vertical lines = pitch
    const steps = 15;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * p.width;
      const hue = p.map(i, 0, steps, 200, 20);
      const isCursor = Math.abs(p.mouseX - x) < (p.width / steps / 2);
      p.stroke(hue, isCursor ? 35 : 15, 30, isCursor ? 22 : 8);
      p.strokeWeight(isCursor ? 0.8 : 0.4);
      p.line(x, 0, x, p.height);
    }
    // horizontal lines = filter
    for (let j = 0; j <= 8; j++) {
      const y = (j / 8) * p.height;
      const isCursor = Math.abs(p.mouseY - y) < (p.height / 8 / 2);
      p.stroke(0, 0, 25, isCursor ? 18 : 6);
      p.strokeWeight(isCursor ? 0.7 : 0.3);
      p.line(0, y, p.width, y);
    }
  }

  p.mousePressed = function() {
    initAudio();
    isDragging = true;
    const freq = freqFromX(p.mouseX, p.width);
    const filterFreq = filterFromY(p.mouseY, p.height);
    pluck(freq, filterFreq);
  };

  p.mouseReleased = function() {
    isDragging = false;
    stopDrone();
  };

  // scroll to change waveform
  p.mouseWheel = function(e) {
    waveIdx = (waveIdx + (e.delta > 0 ? 1 : -1) + WAVES.length) % WAVES.length;
    if (drone) drone.type = WAVES[waveIdx];
    return false;
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

}, 'canvas-wrap');
