// Retro 8-bit sound effects using Web Audio API

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    // Standard web audio context initialization
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Play a simple retro note
const playNote = (frequency, type, duration, startTimeOffset = 0, volumeValue = 0.1) => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(volumeValue, ctx.currentTime + startTimeOffset);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTimeOffset + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTimeOffset);
    osc.stop(ctx.currentTime + startTimeOffset + duration);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
};

// Sound 1: Move (short low thud)
export const playMoveSound = () => {
  playNote(120, 'triangle', 0.08, 0, 0.15);
};

// Sound 2: Hit Enemy (high to low white-noise like pitch bend)
export const playHitSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    console.warn(e);
  }
};

// Sound 3: Hurt Player (low buzzing noise)
export const playHurtSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.warn(e);
  }
};

// Sound 4: Correct Answer (cheerful "pi-ro-rin" C5 -> G5 -> C6)
export const playCorrectSound = () => {
  const now = 0;
  playNote(523.25, 'sine', 0.1, now, 0.15);       // C5
  playNote(783.99, 'sine', 0.1, now + 0.08, 0.15); // G5
  playNote(1046.50, 'sine', 0.2, now + 0.16, 0.2); // C6
};

// Sound 5: Incorrect Answer (disappointing buzzing sound F3 -> D3)
export const playIncorrectSound = () => {
  const now = 0;
  playNote(174.61, 'sawtooth', 0.15, now, 0.2); // F3
  playNote(146.83, 'sawtooth', 0.35, now + 0.1, 0.2); // D3
};

// Sound 6: Level Up (ascending arpeggio C4 -> E4 -> G4 -> C5 -> E5 -> G5 -> C6)
export const playLevelUpSound = () => {
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, idx) => {
    playNote(freq, 'triangle', 0.15, idx * 0.08, 0.15);
  });
};

// Sound 7: Game Over (tragic descending melody G3 -> Eb3 -> C3)
export const playGameOverSound = () => {
  const now = 0;
  playNote(196.00, 'sawtooth', 0.3, now, 0.2);       // G3
  playNote(155.56, 'sawtooth', 0.3, now + 0.25, 0.2); // Eb3
  playNote(130.81, 'sawtooth', 0.6, now + 0.5, 0.2);  // C3
};

// Sound 8: Victory Fanfare (cheerful march)
export const playVictorySound = () => {
  const tempo = 0.12;
  // C4, E4, G4, C5, G4, C5
  const notes = [
    { freq: 261.63, len: 1.5 }, // C4
    { freq: 329.63, len: 1.5 }, // E4
    { freq: 392.00, len: 1.5 }, // G4
    { freq: 523.25, len: 3 },   // C5
    { freq: 392.00, len: 1.5 }, // G4
    { freq: 523.25, len: 6 }    // C5
  ];

  let currentOffset = 0;
  notes.forEach((n) => {
    playNote(n.freq, 'square', n.len * tempo, currentOffset, 0.1);
    currentOffset += n.len * tempo * 0.8;
  });
};
