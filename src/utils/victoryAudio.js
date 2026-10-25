let context;
let bufferPromise;

// Resume during the real submit gesture, before answer validation awaits the
// server. No sound is emitted until successful results request playback.
export async function prepareVictoryAudio() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context ||= new AudioContext();
    const resumed = context.resume();
    bufferPromise ||= fetch('/win_audio.mpeg')
      .then(response => {
        if (!response.ok) throw new Error('Victory audio could not load.');
        return response.arrayBuffer();
      })
      .then(bytes => context.decodeAudioData(bytes))
      .catch(error => { bufferPromise = null; throw error; });
    await Promise.all([resumed, bufferPromise]);
    return context.state === 'running';
  } catch {
    return false; // Audio must never interrupt answer submission.
  }
}

export async function playPreparedVictoryAudio({ isMuted, onEnded }) {
  if (!context || context.state !== 'running' || !bufferPromise) return null;
  let buffer;
  try { buffer = await bufferPromise; } catch { return null; }
  if (context.state !== 'running') return null;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = isMuted() ? 0 : 0.65;
  source.connect(gain).connect(context.destination);
  let stopped = false;
  const disconnect = () => { source.disconnect(); gain.disconnect(); };
  source.onended = () => { stopped = true; disconnect(); onEnded(); };
  source.start();
  return {
    mute(value) { gain.gain.value = value ? 0 : 0.65; },
    stop() {
      if (stopped) return;
      stopped = true;
      source.onended = null;
      source.stop();
      disconnect();
    },
  };
}
