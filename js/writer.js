/**
 * HanziLab - Hanzi Writer Service
 * Quản lý vẽ nét chữ Hán, hoạt ảnh (Animation), và chế độ tự luyện viết (Quiz Mode)
 */

const HanziWriterService = {
    writer: null,
    currentCharacter: '',
    targetElementId: 'character-target',
    
    // Cấu hình mặc định
    config: {
        width: 260,
        height: 260,
        padding: 20,
        showOutline: true,
        strokeAnimationSpeed: 1, // 1 = bình thường, 0.5 = chậm, 2 = nhanh
        delayBetweenStrokes: 200,
        strokeColor: '#2563eb',   // Màu nét vẽ hoạt ảnh (Xanh blue hiện đại)
        outlineColor: '#cbd5e1',  // Màu nét mờ gợi ý (Xám nhạt)
        drawingColor: '#dc2626',  // Màu nét người dùng tự vẽ (Đỏ thư pháp)
        drawingWidth: 16,
        showHintAfterMisses: 2,   // Hiện gợi ý nếu vẽ sai 2 lần
        highlightOnComplete: false, // Tắt hiệu ứng nháy sáng để không bị khựng/dừng 2 giây
        highlightColor: '#16a34a' // Màu xanh lá khi hoàn thành
    },

    isQuizMode: false,
    outlineVisible: true,
    loop: true, // Mặc định lặp lại vô tận liên tục
    animTimeoutId: null,
    animSessionId: 0,

    /**
     * Dọn sạch triệt để mọi tiến trình hoạt ảnh và bộ đếm thời gian ngầm cũ
     */
    stopAnimation() {
        if (this.animTimeoutId) {
            clearTimeout(this.animTimeoutId);
            this.animTimeoutId = null;
        }
        this.animSessionId = (this.animSessionId || 0) + 1;
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
     */
    async load(char, onLoaded = null) {
        if (!char) return;

        // 1. Dọn sạch tiến trình ngầm cũ trước khi tải chữ mới
        this.stopAnimation();

        this.currentCharacter = char;
        this.isQuizMode = false;

        const targetEl = document.getElementById(this.targetElementId);
        if (!targetEl) {
            console.error(`Không tìm thấy phần tử #${this.targetElementId}`);
            return;
        }
        targetEl.innerHTML = '';

        // Đo kích thước thực tế của vùng chứa (tối ưu responsive trên điện thoại)
        const containerWidth = Math.min(targetEl.parentElement.clientWidth - 32, 280);
        const size = Math.max(containerWidth, 200);

        const currentSession = this.animSessionId;
        let hasStartedOnce = false;

        const triggerPlayOnce = () => {
            if (hasStartedOnce || this.animSessionId !== currentSession) return;
            hasStartedOnce = true;
            this.animate();
        };

        try {
            this.writer = HanziWriter.create(this.targetElementId, char, {
                ...this.config,
                width: size,
                height: size,
                showOutline: this.outlineVisible,
                onLoadCharDataSuccess: (data) => {
                    if (onLoaded) onLoaded(data);
                    // Tự động viết ngay khi tải xong dữ liệu nét nếu đúng phiên hiện tại
                    if (this.currentCharacter === char && this.animSessionId === currentSession) {
                        triggerPlayOnce();
                    }
                },
                onLoadCharDataError: (err) => {
                    console.error(`Không thể tải dữ liệu nét cho chữ: ${char}`, err);
                    targetEl.innerHTML = `
                        <div class="text-center p-4 text-slate-500">
                            <p class="text-4xl mb-2 font-serif">${char}</p>
                            <p class="text-xs text-amber-600">Chưa có dữ liệu nét hoạt ảnh cho ký tự này.</p>
                        </div>
                    `;
                }
            });

            // Kích hoạt ngay nếu dữ liệu đã sẵn sàng
            triggerPlayOnce();
        } catch (e) {
            console.error('Lỗi khi khởi tạo HanziWriter:', e);
        }
    },

    /**
     * Chạy hoạt ảnh vẽ từng nét chữ và tự động lặp lại liên tục từ đầu
     * Sử dụng clearTimeout và setTimeout(0) an toàn để không chặn luồng cảm ứng (Touch Event Loop)
     */
    animate(onComplete = null) {
        if (this.animTimeoutId) {
            clearTimeout(this.animTimeoutId);
            this.animTimeoutId = null;
        }

        if (!this.writer || this.isQuizMode) return;

        // Nếu đang ở quiz mode thì hủy
        try {
            this.writer.cancelQuiz();
        } catch (e) {}

        const targetChar = this.currentCharacter;
        const currentSession = this.animSessionId;

        this.writer.showOutline();
        this.writer.animateCharacter({
            onComplete: () => {
                // Kiểm tra phiên hợp lệ và ký tự còn tương ứng không
                if (this.animSessionId !== currentSession) return;
                if (this.isQuizMode || this.currentCharacter !== targetChar) return;

                if (onComplete) onComplete();

                // Lặp lại vô tận liên tục đưa vào Macro-task (setTimeout 0ms)
                // giúp giải phóng luồng chính để màn hình cảm ứng, vuốt chạm không bị đơ
                if (this.loop) {
                    this.animTimeoutId = setTimeout(() => {
                        if (this.animSessionId === currentSession && !this.isQuizMode && this.currentCharacter === targetChar) {
                            this.animate(onComplete);
                        }
                    }, 0);
                }
            }
        });
    },

    /**
     * Bắt đầu chế độ Tự Luyện Viết (Quiz Mode)
     * Người dùng dùng ngón tay (cảm ứng) hoặc chuột để vẽ theo thứ tự nét
     */
    startQuiz({ onMistake, onCorrectStroke, onComplete } = {}) {
        if (!this.writer) return;

        // Dừng animation và timer ngầm để màn hình cảm ứng nhận nét mượt mà
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
     */
    toggleOutline() {
        if (!this.writer) return false;
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
     * @param {number} speed - Hệ số tốc độ (0.5 = Chậm, 1 = Bình thường, 2 = Nhanh)
     */
    setSpeed(speed) {
        this.config.strokeAnimationSpeed = speed;
        // Tải lại với tốc độ mới
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
