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

    /**
     * Khởi tạo hoặc tải một chữ Hán mới lên khung vẽ
     * @param {string} char - Ký tự chữ Hán cần vẽ
     * @param {Function} [onLoaded] - Callback khi tải xong dữ liệu nét
     */
    async load(char, onLoaded = null) {
        if (!char) return;
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

        try {
            this.writer = HanziWriter.create(this.targetElementId, char, {
                ...this.config,
                width: size,
                height: size,
                showOutline: this.outlineVisible,
                onLoadCharDataSuccess: (data) => {
                    if (onLoaded) onLoaded(data);
                    // Tự động viết ngay khi tải xong dữ liệu nét
                    this.animate();
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

            // Tự động phát hoạt ảnh ngay lập tức khi chọn hoặc tìm xong chữ
            this.animate();
        } catch (e) {
            console.error('Lỗi khi khởi tạo HanziWriter:', e);
        }
    },

    /**
     * Chạy hoạt ảnh vẽ từng nét chữ và tự động lặp lại liên tục từ đầu (0 giây chờ)
     */
    animate(onComplete = null) {
        if (!this.writer || this.isQuizMode) return;

        // Nếu đang ở quiz mode thì hủy
        try {
            this.writer.cancelQuiz();
        } catch (e) {}

        const targetChar = this.currentCharacter;
        this.writer.showOutline();
        this.writer.animateCharacter({
            onComplete: () => {
                if (onComplete) onComplete();

                // Lặp lại vô tận liên tục ngay lập tức (thời gian chờ = 0 giây)
                if (this.loop && !this.isQuizMode && this.currentCharacter === targetChar) {
                    this.animate(onComplete);
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
