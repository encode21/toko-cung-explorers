const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Short local ambience voices. The owner stops all scheduled audio when the player changes areas. */
export function createStreetSounds(
  ctx: BaseAudioContext,
  destination: AudioNode,
  noise: AudioBuffer,
) {
  const active = new Set<() => void>();
  function track(sources: AudioScheduledSourceNode[], nodes: AudioNode[]) {
    let remaining = sources.length;
    const disconnect = () => {
      for (const node of [...sources, ...nodes]) node.disconnect();
      active.delete(stop);
    };
    const stop = () => {
      for (const source of sources) {
        source.onended = null;
        source.stop();
      }
      disconnect();
    };
    for (const source of sources)
      source.onended = () => {
        if (--remaining === 0) disconnect();
      };
    active.add(stop);
  }
  return {
    carPass() {
      const t = ctx.currentTime + 0.02;
      const duration = rand(3.2, 4.5);
      const pan = ctx.createStereoPanner();
      const direction = Math.random() < 0.5 ? -1 : 1;
      pan.pan.setValueAtTime(-0.9 * direction, t);
      pan.pan.linearRampToValueAtTime(0.9 * direction, t + duration);
      pan.connect(destination);
      const engine = ctx.createOscillator();
      engine.type = "sawtooth";
      const pitch = rand(55, 85);
      engine.frequency.setValueAtTime(pitch, t);
      engine.frequency.linearRampToValueAtTime(pitch * 1.7, t + duration * 0.42);
      engine.frequency.exponentialRampToValueAtTime(pitch * 0.8, t + duration);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = rand(360, 620);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.075, t + duration * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      engine.connect(filter).connect(gain).connect(pan);
      const tires = ctx.createBufferSource();
      tires.buffer = noise;
      tires.loop = true;
      const road = ctx.createBiquadFilter();
      road.type = "bandpass";
      road.frequency.value = 850;
      road.Q.value = 0.6;
      const roll = ctx.createGain();
      roll.gain.setValueAtTime(0, t);
      roll.gain.linearRampToValueAtTime(0.055, t + duration * 0.5);
      roll.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      tires.connect(road).connect(roll).connect(pan);
      engine.start(t);
      tires.start(t, rand(0, 2));
      engine.stop(t + duration + 0.05);
      tires.stop(t + duration + 0.05);
      track([engine, tires], [filter, gain, road, roll, pan]);
    },
    horn() {
      const t = ctx.currentTime + 0.02;
      const pan = ctx.createStereoPanner();
      pan.pan.value = rand(-0.85, 0.85);
      pan.connect(destination);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      filter.connect(pan);
      const gain = ctx.createGain();
      gain.connect(filter);
      const double = Math.random() < 0.6;
      const duration = double ? 0.57 : rand(0.3, 0.7);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.028, t + 0.025);
      if (double) {
        gain.gain.setValueAtTime(0.028, t + 0.14);
        gain.gain.linearRampToValueAtTime(0, t + 0.17);
        gain.gain.setValueAtTime(0, t + 0.27);
        gain.gain.linearRampToValueAtTime(0.028, t + 0.3);
      }
      gain.gain.setValueAtTime(0.028, t + duration - 0.04);
      gain.gain.linearRampToValueAtTime(0, t + duration);
      const base = rand(310, 410);
      const tones = [1, 1.26].map((ratio) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = base * ratio;
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + duration + 0.02);
        return osc;
      });
      track(tones, [gain, filter, pan]);
    },
    chatter() {
      // Overlapping voiced syllables/formants suggest neighbours talking without intelligible dialogue.
      for (let speaker = 0; speaker < 3; speaker++) {
        const t = ctx.currentTime + speaker * 0.45;
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        const pitch = rand(105, 210);
        const pan = ctx.createStereoPanner();
        pan.pan.value = -0.65 + speaker * 0.65;
        pan.connect(destination);
        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(pan);
        const formants = [rand(450, 800), rand(1150, 1800)].map((frequency) => {
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = frequency;
          filter.Q.value = 2.5;
          osc.connect(filter).connect(gain);
          return filter;
        });
        let at = t;
        for (let syllable = 0; syllable < 12; syllable++) {
          const length = rand(0.09, 0.2);
          const level = rand(0.025, 0.045);
          osc.frequency.setValueAtTime(pitch * rand(0.85, 1.18), at);
          osc.frequency.linearRampToValueAtTime(pitch * rand(0.85, 1.1), at + length);
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(level, at + 0.025);
          gain.gain.linearRampToValueAtTime(0, at + length);
          for (const formant of formants)
            formant.frequency.setTargetAtTime(rand(0.85, 1.15) * formant.frequency.value, at, 0.05);
          at += length + rand(0.04, syllable % 4 === 3 ? 0.5 : 0.12);
        }
        osc.start(t);
        osc.stop(at + 0.02);
        track([osc], [...formants, gain, pan]);
      }
    },
    stop() {
      for (const stop of [...active]) stop();
    },
  };
}
