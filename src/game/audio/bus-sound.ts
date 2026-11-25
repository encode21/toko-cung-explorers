/** Electric traction whine, rolling tires and pneumatic doors, owned by one active bus ride. */
export function createBusSound(ctx: BaseAudioContext, destination: AudioNode, noise: AudioBuffer) {
  const volume = ctx.createGain();
  volume.gain.value = 0;
  volume.connect(destination);
  const motor = ctx.createOscillator(),
    harmonic = ctx.createOscillator();
  motor.type = "sine";
  harmonic.type = "triangle";
  const drive = ctx.createGain(),
    high = ctx.createGain();
  drive.gain.value = high.gain.value = 0;
  motor.connect(drive).connect(volume);
  harmonic.connect(high).connect(volume);
  const tires = ctx.createBufferSource();
  tires.buffer = noise;
  tires.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1100;
  const roll = ctx.createGain();
  roll.gain.value = 0;
  tires.connect(filter).connect(roll).connect(volume);
  const air = ctx.createGain();
  air.gain.value = 0;
  const hiss = ctx.createBiquadFilter();
  hiss.type = "bandpass";
  hiss.frequency.value = 1800;
  hiss.Q.value = 0.5;
  tires.connect(hiss).connect(air).connect(volume);
  motor.start();
  harmonic.start();
  tires.start();
  let wasOpen = false,
    initialized = false;
  return {
    update(speed: number, door: number, level = 1) {
      const t = ctx.currentTime,
        v = Math.min(1, Math.max(0, speed) / 7);
      if (!initialized) volume.gain.setValueAtTime(level, t);
      else volume.gain.setTargetAtTime(level, t, 0.1);
      initialized = true;
      motor.frequency.setTargetAtTime(85 + v * 260, t, 0.12);
      harmonic.frequency.setTargetAtTime(300 + v * 700, t, 0.15);
      drive.gain.setTargetAtTime(0.008 + v * 0.045, t, 0.15);
      high.gain.setTargetAtTime(v * 0.012, t, 0.15);
      roll.gain.setTargetAtTime(v * 0.065, t, 0.2);
      const open = door > 0.05;
      if (open !== wasOpen) {
        air.gain.cancelScheduledValues(t);
        air.gain.setValueAtTime(0, t);
        air.gain.linearRampToValueAtTime(open ? 0.07 : 0.045, t + 0.06);
        air.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
        wasOpen = open;
      }
    },
    stop() {
      motor.stop();
      harmonic.stop();
      tires.stop();
      for (const node of [motor, harmonic, drive, high, tires, filter, roll, air, hiss, volume])
        node.disconnect();
    },
  };
}
