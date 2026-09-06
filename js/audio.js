/**
 * HanziLab - Audio Service
 * Phát âm chuẩn tiếng Trung (Phổ thông - zh-CN) sử dụng Web Speech API
 * Tối ưu hóa xử lý bất đồng bộ cho trình duyệt di động (iOS Safari & Android Chrome)
 */

(function () {
    'use strict';

    const AudioService = {
        chineseVoice: null,
        isInitialized: false,

        init() {
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
                console.warn('Trình duyệt không hỗ trợ Web Speech API.');
                return;
            }

            const updateVoices = () => {
                try {
                    const voices = window.speechSynthesis.getVoices();
                    if (!voices || voices.length === 0) return;

                    // Ưu tiên zh-CN chuẩn, sau đó đến zh-TW, zh-HK hoặc cmn
                    this.chineseVoice = voices.find(v => v.lang === 'zh-CN' || v.lang === 'zh_CN') ||
                                       voices.find(v => v.lang === 'cmn-Hans-CN' || v.lang === 'cmn') ||
                                       voices.find(v => v.lang && v.lang.startsWith('zh')) ||
                                       null;
                } catch (e) {
                    console.warn('Lỗi khi tải danh sách giọng nói:', e);
                }
            };

            updateVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = updateVoices;
            }
            this.isInitialized = true;
        },

        getVoice() {
            if (!this.chineseVoice && 'speechSynthesis' in window) {
                const voices = window.speechSynthesis.getVoices();
                if (voices && voices.length > 0) {
                    this.chineseVoice = voices.find(v => v.lang === 'zh-CN' || v.lang === 'zh_CN') ||
                                       voices.find(v => v.lang === 'cmn-Hans-CN' || v.lang === 'cmn') ||
                                       voices.find(v => v.lang && v.lang.startsWith('zh')) ||
                                       null;
                }
            }
            return this.chineseVoice;
        },

        /**
         * Phát âm một ký tự hoặc cụm từ tiếng Trung
         * @param {string} text - Ký tự hoặc chuỗi chữ Hán
         * @param {number} rate - Tốc độ đọc (mặc định 0.85 cho người học nghe rõ)
         */
        speak(text, rate = 0.85) {
            if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
            if (!this.isInitialized) this.init();

            try {
                // Tạm dừng câu trước để phát âm câu mới
                window.speechSynthesis.cancel();

                // Tạo Utterance
                const cleanText = String(text).trim();
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'zh-CN';
                utterance.rate = rate;
                utterance.pitch = 1.0;

                const voice = this.getVoice();
                if (voice) {
                    utterance.voice = voice;
                }

                // Xử lý timeout an toàn tránh nghẽn luồng trên Chrome di động
                setTimeout(() => {
                    try {
                        window.speechSynthesis.speak(utterance);
                    } catch (err) {
                        console.warn('Lỗi khi gọi speechSynthesis.speak:', err);
                    }
                }, 10);
            } catch (e) {
                console.warn('Lỗi AudioService.speak:', e);
            }
        },

        stop() {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                try {
                    window.speechSynthesis.cancel();
                } catch (e) {}
            }
        }
    };

    if (typeof window !== 'undefined') {
        window.AudioService = AudioService;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AudioService;
    }
})();
