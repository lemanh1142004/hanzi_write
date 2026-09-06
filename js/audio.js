/**
 * HanziLab - Audio Service
 * Phát âm chuẩn tiếng Trung (Phổ thông - zh-CN) sử dụng Web Speech API
 */

const AudioService = {
    chineseVoice: null,
    isInitialized: false,

    init() {
        if (!('speechSynthesis' in window)) {
            console.warn('Trình duyệt không hỗ trợ Web Speech API.');
            return;
        }

        const updateVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            // Tìm giọng zh-CN hoặc zh hoặc cmn
            this.chineseVoice = voices.find(v => v.lang === 'zh-CN' || v.lang === 'zh_CN') ||
                               voices.find(v => v.lang.startsWith('zh')) ||
                               null;
        };

        updateVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }
        this.isInitialized = true;
    },

    /**
     * Phát âm một từ hoặc câu tiếng Trung
     * @param {string} text - Ký tự hoặc chuỗi chữ Hán
     * @param {number} rate - Tốc độ đọc (mặc định 0.85 cho người học nghe rõ)
     */
    speak(text, rate = 0.85) {
        if (!('speechSynthesis' in window)) return;
        if (!this.isInitialized) this.init();

        window.speechSynthesis.cancel(); // Dừng câu trước nếu đang đọc

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = rate;
        utterance.pitch = 1.0;

        if (this.chineseVoice) {
            utterance.voice = this.chineseVoice;
        }

        window.speechSynthesis.speak(utterance);
    },

    stop() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
};
if (typeof window !== 'undefined') {
    window.AudioService = AudioService;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioService;
}
