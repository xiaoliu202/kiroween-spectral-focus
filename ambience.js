'use strict';
/* Synthesized, filtered noise. Nothing is downloaded or started automatically. */
window.SpectralAudio = (() => {
  let context, source, output, modulation;
  let playing = false;
  function initialize() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('This browser cannot play synthesized ambience. The rest of the town still works.');
    context = new Audio();
    const buffer = context.createBuffer(1, context.sampleRate * 6, context.sampleRate);
    const values = buffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < values.length; i++) {
      smooth = (smooth + (Math.random() * 2 - 1) * .025) / 1.025;
      values[i] = smooth * 4;
    }
    source = context.createBufferSource();
    source.buffer = buffer; source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 700;
    output = context.createGain(); output.gain.value = 0;
    source.connect(filter).connect(output).connect(context.destination);
    modulation = context.createOscillator();
    modulation.frequency.value = .13;
    const sweep = context.createGain(); sweep.gain.value = 190;
    modulation.connect(sweep).connect(filter.frequency);
    source.start(); modulation.start();
  }
  function setVolume(value) {
    if (output && context) output.gain.setTargetAtTime(Math.max(0, Math.min(1, value)) * .32, context.currentTime, .12);
  }
  async function setPlaying(on, volume = .3) {
    if (on) {
      if (!context) initialize();
      await context.resume();
      if (context.state !== 'running') throw new Error('Audio is blocked by this browser. Please try the sound button again.');
      setVolume(volume); playing = true;
    } else {
      if (context) await context.suspend();
      playing = false;
    }
    return playing;
  }
  return {setPlaying, setVolume, get isPlaying() { return playing; }, get contextState() { return context?.state || 'not-created'; }};
})();
