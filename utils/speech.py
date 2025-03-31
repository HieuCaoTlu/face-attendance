from io import BytesIO
from gtts import gTTS
import base64

def text_to_speech(text):
    try:
        # Tạo audio trong memory
        mp3_fp = BytesIO()
        tts = gTTS(text=text, lang='vi', slow=False)
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)
        
        # Chuyển đổi sang base64 để truyền qua API
        audio_base64 = base64.b64encode(mp3_fp.getvalue()).decode('utf-8')
        
        # Trả về audio dưới dạng base64
        return audio_base64
    except Exception as e:
        print(f"Lỗi khi tạo speech: {str(e)}")
        return None