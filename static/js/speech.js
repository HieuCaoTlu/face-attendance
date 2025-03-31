const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export async function playTextToSpeech(text) {
  try {
    // Hiển thị thông báo đang xử lý
    console.log("Đang chuyển đổi văn bản thành giọng nói...");
    
    const formData = new FormData();
    formData.append("text", text);

    const response = await fetch("/api/speech", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!data.audio) {
      console.error("Không nhận được dữ liệu audio");
      return;
    }

    // Giải mã base64 thành ArrayBuffer
    const binaryString = atob(data.audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Phát audio bằng Web Audio API
    audioContext.decodeAudioData(bytes.buffer, (buffer) => {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    }, (err) => {
      console.error("Lỗi khi giải mã audio:", err);
    });
  } catch (error) {
    console.error("Lỗi khi phát TTS:", error);
  }
}