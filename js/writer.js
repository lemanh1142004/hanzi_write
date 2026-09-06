/**
 * HanziLab - Hanzi Writer Service
 * Quản lý vẽ nét chữ Hán, hoạt ảnh (Animation), và chế độ tự luyện viết (Quiz Mode)
 * Tối ưu giải phóng luồng chính (main thread) và tránh vòng lặp ngầm gây đơ giao diện
 */

(function () {
    'use strict';

    const HanziWriterService = {
        writer: null,
        currentCharacter: '',
        targetElementId: 'character-target',

        // Cấu hình nét vẽ mặc định
        config: {
            width: 240,
            height: 240,
            padding: 18,
            showOutline: true,
            strokeAnimationSpeed: 1, // 0.5 = Chậm, 1 = Bình thường, 1.8 = Nhanh
            delayBetweenStrokes: 180,
            strokeColor: '#2563eb',   // Màu nét vẽ hoạt ảnh (Xanh hiện đại)
            outlineColor: '#cbd5e1',  // Màu nét mờ gợi ý (Xám nhạt)
            drawingColor: '#dc2626',  // Màu nét người dùng tự vẽ (Đỏ thư pháp)
            drawingWidth: 16,
            showHintAfterMisses: 2,   // Hiện gợi ý nếu vẽ sai 2 lần
            highlightOnComplete: false // Tắt nháy sáng để chuyển nét nhanh hơn
        },

        isQuizMode: false,
        outlineVisible: true,
        animTimeoutId: null,
        animSessionId: 0,
        isAnimating: false,

        /**
         * Dọn sạch triệt để mọi tiến trình hoạt ảnh và bộ đếm thời gian ngầm cũ
         */
        stopAnimation() {
            if (this.animTimeoutId) {
                clearTimeout(this.animTimeoutId);
                this.animTimeoutId = null;
            }
            this.animSessionId = (this.animSessionId || 0) + 1;
            this.isAnimating = false;

            if (this.writer) {
                try {
                    this.writer.cancelQuiz();
                } catch (e) {}
            }
        },

        /**
         * Khởi tạo hoặc tải một chữ Hán mới lên khung vẽ
         * @param {string} char - Ký tự chữ Hán cần vẽ
         * @param {Function} [onLoaded] - Callback khi tải xong dữ liệu nét
         * @param {Function} [onError] - Callback khi lỗi tải nét
         */
        load(char, onLoaded = null, onError = null) {
            if (!char) return;

            // 1. Dọn sạch tiến trình ngầm cũ
            this.stopAnimation();

            this.currentCharacter = char;
            this.isQuizMode = false;

            const targetEl = document.getElementById(this.targetElementId);
            if (!targetEl) {
                console.error(`Không tìm thấy phần tử #${this.targetElementId}`);
                return;
            }
            targetEl.innerHTML = '';

            // Đo kích thước vùng chứa responsive
            const parentWidth = (targetEl.parentElement && targetEl.parentElement.clientWidth)
                ? targetEl.parentElement.clientWidth
                : 260;
            const boxWidth = Math.min(parentWidth - 20, 260);
            const size = Math.max(boxWidth, 200);

            const thisSession = this.animSessionId;
            const speed = this.config.strokeAnimationSpeed || 1;

            if (typeof HanziWriter === 'undefined') {
                targetEl.innerHTML = `<div class="text-4xl font-serif text-slate-700">${char}</div>`;
                return;
            }

            try {
                this.writer = HanziWriter.create(this.targetElementId, char, {
                    ...this.config,
                    width: size,
                    height: size,
                    showOutline: this.outlineVisible,
                    strokeAnimationSpeed: speed,
                    onLoadCharDataSuccess: (data) => {
                        if (onLoaded) onLoaded(data);
                        // Chỉ chạy animation đúng 1 lượt khi dữ liệu nét tải xong nếu đúng phiên hiện tại
                        if (this.currentCharacter === char && this.animSessionId === thisSession) {
                            this.animate();
                        }
                    },
                    onLoadCharDataError: (err) => {
                        console.error(`Không thể tải dữ liệu nét cho chữ: ${char}`, err);
                        targetEl.innerHTML = `
                            <div class="text-center p-3 text-slate-500">
                                <p class="text-4xl mb-1 font-serif text-slate-700">${char}</p>
                                <p class="text-[11px] text-amber-600">Chưa có dữ liệu nét hoạt ảnh cho chữ này.</p>
                            </div>
                        `;
                        if (onError) onError(err);
                    }
                });

                // Hỗ trợ gán hàm writer.animate() để tương thích ngược
                this.writer.animate = () => this.animate();
            } catch (e) {
                console.error('Lỗi khi khởi tạo HanziWriter:', e);
                targetEl.innerHTML = `<div class="text-4xl font-serif text-slate-700">${char}</div>`;
            }
        },

        /**
         * Chạy hoạt ảnh vẽ từng nét chữ một lượt an toàn với điều kiện dừng rõ ràng
         * @param {Function} [onComplete]
         */
        animate(onComplete = null) {
            if (this.animTimeoutId) {
                clearTimeout(this.animTimeoutId);
                this.animTimeoutId = null;
            }

            if (!this.writer || this.isQuizMode) return;

            const targetChar = this.currentCharacter;
            const currentSession = this.animSessionId;
            this.isAnimating = true;

            try {
                this.writer.showOutline();
                this.writer.animateCharacter({
                    onComplete: () => {
                        // Điều kiện dừng: Hoàn thành 1 lượt viết, giải phóng luồng chính
                        this.isAnimating = false;
                        if (this.animSessionId !== currentSession) return;
                        if (this.isQuizMode || this.currentCharacter !== targetChar) return;

                        if (onComplete) onComplete();
                    }
                });
            } catch (e) {
                this.isAnimating = false;
            }
        },

        /**
         * Bắt đầu chế độ Tự Luyện Viết (Quiz Mode)
         * @param {Object} callbacks
         * @param {Function} [callbacks.onMistake]
         * @param {Function} [callbacks.onCorrectStroke]
         * @param {Function} [callbacks.onComplete]
         */
        startQuiz({ onMistake, onCorrectStroke, onComplete } = {}) {
            if (!this.writer) return;

            // Hủy triệt để animation ngầm trước khi người dùng tương tác cảm ứng
            this.stopAnimation();

            this.isQuizMode = true;
            this.writer.hideCharacter();

            if (this.outlineVisible) {
                this.writer.showOutline();
            } else {
                this.writer.hideOutline();
            }

            this.writer.quiz({
                onMistake: (strokeData) => {
                    if (onMistake) onMistake(strokeData);
                },
                onCorrectStroke: (strokeData) => {
                    if (onCorrectStroke) onCorrectStroke(strokeData);
                },
                onComplete: (summary) => {
                    this.isQuizMode = false;
                    if (onComplete) onComplete(summary);
                }
            });
        },

        /**
         * Hủy chế độ luyện viết
         */
        cancelQuiz() {
            if (!this.writer) return;
            this.stopAnimation();
            try {
                this.writer.cancelQuiz();
            } catch (e) {}
            this.isQuizMode = false;
            this.writer.showCharacter();
        },

        /**
         * Bật / Tắt hiển thị nét mờ nền
         * @returns {boolean} Trạng thái hiển thị mới
         */
        toggleOutline() {
            if (!this.writer) return this.outlineVisible;
            this.outlineVisible = !this.outlineVisible;

            if (this.outlineVisible) {
                this.writer.showOutline();
            } else {
                this.writer.hideOutline();
            }
            return this.outlineVisible;
        },

        /**
         * Đặt tốc độ vẽ hoạt ảnh
         * @param {number} speed - Hệ số tốc độ (0.5 = Chậm, 1 = Bình thường, 1.8 = Nhanh)
         */
        setSpeed(speed) {
            this.config.strokeAnimationSpeed = speed;
            if (this.currentCharacter) {
                this.load(this.currentCharacter);
            }
        }
    };

    if (typeof window !== 'undefined') {
        window.HanziWriterService = HanziWriterService;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = HanziWriterService;
    }
})();
