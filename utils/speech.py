from io import BytesIO
from gtts import gTTS
import base64

def text_to_speech(text):
    mp3_fp = BytesIO()
    tts = gTTS(text=text, lang='vi')
    tts.write_to_fp(mp3_fp)
    mp3_fp.seek(0)
    voice_base64 = base64.b64encode(mp3_fp.getvalue()).decode("utf-8")
    return voice_base64