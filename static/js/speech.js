const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export async function playTextToSpeech(text) {
  try {
    const formData = new FormData();
    formData.append("text", text);

    const response = await fetch("/api/speech", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!data.audio) throw new Error("No audio data received");

    const audioData = atob(data.audio);
    const arrayBuffer = new Uint8Array(audioData.length);

    for (let i = 0; i < audioData.length; i++) {
      arrayBuffer[i] = audioData.charCodeAt(i);
    }

    audioContext.decodeAudioData(arrayBuffer.buffer, (buffer) => {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    });
  } catch (error) {
    console.error("Error playing TTS:", error);
  }
}