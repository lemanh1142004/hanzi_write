/**
 * HanziLab - Main Application Controller
 * Điều phối toàn bộ hoạt động của ứng dụng, kết nối UI với các dịch vụ
 */

(function () {
    'use strict';

    // Trạng thái ứng dụng (Application State)
    const state = {
        currentWord: '你好',
        characters: ['你', '好'],
        activeCharIndex: 0,
        currentChar: '你',
        isQuizActive: false,
        debounceTimer: null
    };

    // Khởi tạo các phần tử giao diện (DOM Elements)
    const elements = {
        userInput: document.getElementById('userInput'),
        btnSearch: document.getElementById('btnSearch'),
        candidateContainer: document.getElementById('candidateContainer'),
        candidateList: document.getElementById('candidateList'),
        candidateLoading: document.getElementById('candidateLoading'),
        characterTabs: document.getElementById('characterTabs'),
        charCountLabel: document.getElementById('charCountLabel'),
        currentCharDisplay: document.getElementById('currentCharDisplay'),
        pinyinDisplay: document.getElementById('pinyinDisplay'),
        pinyinToneDisplay: document.getElementById('pinyinToneDisplay'),
        charSubInfo: document.getElementById('charSubInfo'),
        btnAudio: document.getElementById('btnAudio'),
        btnFavorite: document.getElementById('btnFavorite'),
        favIcon: document.getElementById('favIcon'),
        favCountBadge: document.getElementById('favCountBadge'),
        quizStatusBox: document.getElementById('quizStatusBox'),
        quizStatusText: document.getElementById('quizStatusText'),
        quizStrokeCount: document.getElementById('quizStrokeCount'),
        tianzigeContainer: document.getElementById('tianzigeContainer'),
        btnReplay: document.getElementById('btnReplay'),
        btnQuiz: document.getElementById('btnQuiz'),
        quizBtnText: document.getElementById('quizBtnText'),
        btnToggleOutline: document.getElementById('btnToggleOutline'),
        outlineStatusText: document.getElementById('outlineStatusText'),
        speedBtns: document.querySelectorAll('.speed-btn'),
        quickWords: document.querySelectorAll('.quick-word'),
        
        // Drawers
        btnOpenHistory: document.getElementById('btnOpenHistory'),
        historyDrawer: document.getElementById('historyDrawer'),
        historyBackdrop: document.getElementById('historyBackdrop'),
        btnCloseHistory: document.getElementById('btnCloseHistory'),
        historyList: document.getElementById('historyList'),
        btnClearHistory: document.getElementById('btnClearHistory'),

        btnOpenFavorites: document.getElementById('btnOpenFavorites'),
        favoritesDrawer: document.getElementById('favoritesDrawer'),
        favBackdrop: document.getElementById('favBackdrop'),
        btnCloseFavorites: document.getElementById('btnCloseFavorites'),
        favoritesList: document.getElementById('favoritesList')
    };

    // ==========================================
    // 1. KHỞI TẠO ỨNG DỤNG (INITIALIZATION)
    // ==========================================
    function init() {
        // Khởi tạo Audio Service
        AudioService.init();

        // Đăng ký các sự kiện người dùng
        registerEvents();

        // Cập nhật số lượng từ yêu thích
        updateFavoriteBadge();

        // Tải từ mặc định ban đầu: "你好"
        loadWord('你好');
    }

    // ==========================================
    // 2. ĐĂNG KÝ SỰ KIỆN (EVENT LISTENERS)
    // ==========================================
    function registerEvents() {
        // Tìm kiếm khi nhấn nút Tra cứu
        elements.btnSearch.addEventListener('click', () => handleSearch());

        // Tìm kiếm khi nhấn phím Enter
        elements.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });

        // Tự động gợi ý ứng viên bộ gõ (Live IME Candidates) khi người dùng gõ Pinyin
        elements.userInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(state.debounceTimer);

            if (!query) {
                elements.candidateContainer.classList.add('hidden');
                return;
            }

            // Nếu người dùng gõ chữ cái la-tinh (Pinyin)
            if (!DictionaryService.isHanzi(query)) {
                state.debounceTimer = setTimeout(() => {
                    fetchCandidates(query);
                }, 200);
            } else {
                elements.candidateContainer.classList.add('hidden');
            }
        });

        // Nút từ gợi ý nhanh
        elements.quickWords.forEach(btn => {
            btn.addEventListener('click', () => {
                const word = btn.getAttribute('data-word');
                elements.userInput.value = word;
                loadWord(word);
            });
        });

        // Nút phát âm audio
        elements.btnAudio.addEventListener('click', () => {
            AudioService.speak(state.currentChar);
        });

        // Nút thêm / bỏ từ yêu thích
        elements.btnFavorite.addEventListener('click', () => {
            const isFav = StorageService.toggleFavorite(state.currentChar, elements.pinyinDisplay.innerText);
            renderFavoriteButton(isFav);
            updateFavoriteBadge();
        });

        // Nút chạy lại hoạt ảnh nét
        elements.btnReplay.addEventListener('click', () => {
            resetQuizUI();
            HanziWriterService.animate();
        });

        // Nút chuyển chế độ tự luyện viết (Quiz Mode)
        elements.btnQuiz.addEventListener('click', () => {
            toggleQuizMode();
        });

        // Nút bật / tắt nét mờ
        elements.btnToggleOutline.addEventListener('click', () => {
            const visible = HanziWriterService.toggleOutline();
            elements.outlineStatusText.innerText = visible ? 'Ẩn nét mờ' : 'Hiện nét mờ';
        });

        // Các nút điều chỉnh tốc độ nét
        elements.speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.speedBtns.forEach(b => {
                    b.classList.remove('bg-white', 'text-blue-600', 'shadow-2xs');
                    b.classList.add('text-slate-600');
                });
                btn.classList.add('bg-white', 'text-blue-600', 'shadow-2xs');
                btn.classList.remove('text-slate-600');

                const speed = parseFloat(btn.getAttribute('data-speed')) || 1;
                HanziWriterService.setSpeed(speed);
            });
        });

        // Mở / Đóng Lịch sử
        elements.btnOpenHistory.addEventListener('click', () => openHistoryDrawer());
        elements.btnCloseHistory.addEventListener('click', () => closeHistoryDrawer());
        elements.historyBackdrop.addEventListener('click', () => closeHistoryDrawer());
        elements.btnClearHistory.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử tra cứu?')) {
                StorageService.clearHistory();
                renderHistoryList();
            }
        });

        // Mở / Đóng Yêu thích
        elements.btnOpenFavorites.addEventListener('click', () => openFavoritesDrawer());
        elements.btnCloseFavorites.addEventListener('click', () => closeFavoritesDrawer());
        elements.favBackdrop.addEventListener('click', () => closeFavoritesDrawer());

        // Lắng nghe sự kiện Storage để cập nhật UI tự động
        window.addEventListener('favorites-changed', () => {
            updateFavoriteBadge();
            renderFavoriteButton(StorageService.isFavorite(state.currentChar));
        });
    }

    // ==========================================
    // 3. XỬ LÝ TRA CỨU (SEARCH & CANDIDATES)
    // ==========================================
    async function handleSearch() {
        const input = elements.userInput.value.trim();
        if (!input) return;

        elements.candidateContainer.classList.add('hidden');

        // Trường hợp 1: Người dùng gõ trực tiếp chữ Hán (VD: '你好', '学习')
        if (DictionaryService.isHanzi(input)) {
            loadWord(input);
            return;
        }

        // Trường hợp 2: Người dùng gõ Pinyin (VD: 'nihao', 'zhongguo')
        elements.candidateLoading.classList.remove('hidden');
        const candidates = await DictionaryService.searchPinyin(input);
        elements.candidateLoading.classList.add('hidden');

        if (candidates.length > 0) {
            // Tải ngay từ ứng viên đầu tiên (phù hợp nhất)
            loadWord(candidates[0]);

            // Hiển thị các ứng viên còn lại bên dưới để người dùng có thể đổi lựa chọn
            renderCandidateList(candidates, input);
        } else {
            alert(`Không tìm thấy chữ Hán tương ứng với âm Pinyin "${input}". Vui lòng thử lại với từ khác!`);
        }
    }

    async function fetchCandidates(pinyin) {
        elements.candidateContainer.classList.remove('hidden');
        elements.candidateLoading.classList.remove('hidden');

        const candidates = await DictionaryService.searchPinyin(pinyin);
        elements.candidateLoading.classList.add('hidden');

        if (candidates.length > 0) {
            renderCandidateList(candidates, pinyin);
        } else {
            elements.candidateContainer.classList.add('hidden');
        }
    }

    function renderCandidateList(candidates, originalQuery) {
        elements.candidateList.innerHTML = '';
        elements.candidateContainer.classList.remove('hidden');

        candidates.forEach((cand, idx) => {
            const btn = document.createElement('button');
            btn.className = 'candidate-item inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-600 rounded-lg text-xs font-medium border border-slate-200 transition';
            btn.innerHTML = `<span class="text-[10px] text-slate-400">${idx + 1}.</span> <span class="text-sm font-semibold">${cand}</span>`;
            
            btn.onclick = () => {
                elements.userInput.value = cand;
                elements.candidateContainer.classList.add('hidden');
                loadWord(cand);
            };

            elements.candidateList.appendChild(btn);
        });
    }

    // ==========================================
    // 4. HIỂN THỊ TỪ VÀ KÝ TỰ (LOAD WORD & CHAR)
    // ==========================================
    function loadWord(word) {
        const chars = DictionaryService.extractHanzi(word);
        if (chars.length === 0) return;

        state.currentWord = word;
        state.characters = chars;
        state.activeCharIndex = 0;

        // Lưu vào lịch sử tra cứu
        const pinyinInfo = DictionaryService.getPinyinInfo(word);
        StorageService.addHistory(elements.userInput.value || word, word, pinyinInfo.withTone);

        // Render các tab chọn chữ
        renderCharacterTabs();

        // Tải chữ cái đầu tiên lên khung vẽ
        loadActiveCharacter();
    }

    function renderCharacterTabs() {
        elements.characterTabs.innerHTML = '';
        elements.charCountLabel.innerText = `${state.characters.length} chữ`;

        state.characters.forEach((char, index) => {
            const btn = document.createElement('button');
            const isActive = index === state.activeCharIndex;

            btn.className = `min-w-[44px] h-11 px-3 rounded-xl font-bold text-lg border transition-all flex items-center justify-center gap-1.5 ${
                isActive 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-105' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`;

            // Kèm pinyin nhỏ bên cạnh
            const charPinyin = DictionaryService.getPinyinInfo(char).withTone;
            btn.innerHTML = `
                <span class="hanzi-font">${char}</span>
                <span class="text-[11px] font-medium opacity-80">${charPinyin}</span>
            `;

            btn.onclick = () => {
                if (state.activeCharIndex !== index) {
                    state.activeCharIndex = index;
                    renderCharacterTabs();
                    loadActiveCharacter();
                }
            };

            elements.characterTabs.appendChild(btn);
        });
    }

    function loadActiveCharacter() {
        const char = state.characters[state.activeCharIndex];
        state.currentChar = char;

        // Cập nhật giao diện thông tin chữ
        elements.currentCharDisplay.innerText = char;

        const info = DictionaryService.getPinyinInfo(char);
        elements.pinyinDisplay.innerText = info.withTone || '—';
        elements.pinyinToneDisplay.innerText = info.toneNum || '';

        // Kiểm tra trạng thái yêu thích
        renderFavoriteButton(StorageService.isFavorite(char));

        // Reset trạng thái Quiz
        resetQuizUI();

        // Tải chữ vào Hanzi Writer
        HanziWriterService.load(char);
    }

    function renderFavoriteButton(isFav) {
        if (isFav) {
            elements.favIcon.classList.add('text-amber-500', 'fill-amber-500');
            elements.favIcon.classList.remove('text-slate-400');
            elements.btnFavorite.classList.add('bg-amber-50', 'border-amber-200');
        } else {
            elements.favIcon.classList.remove('text-amber-500', 'fill-amber-500');
            elements.favIcon.classList.add('text-slate-400');
            elements.btnFavorite.classList.remove('bg-amber-50', 'border-amber-200');
        }
    }

    function updateFavoriteBadge() {
        const favs = StorageService.getFavorites();
        if (favs.length > 0) {
            elements.favCountBadge.innerText = favs.length;
            elements.favCountBadge.classList.remove('hidden');
        } else {
            elements.favCountBadge.classList.add('hidden');
        }
    }

    // ==========================================
    // 5. CHẾ ĐỘ TỰ LUYỆN VIẾT (QUIZ MODE)
    // ==========================================
    function toggleQuizMode() {
        if (state.isQuizActive) {
            // Hủy quiz, quay về bình thường
            resetQuizUI();
            HanziWriterService.cancelQuiz();
        } else {
            // Bắt đầu quiz
            state.isQuizActive = true;
            elements.tianzigeContainer.classList.add('quiz-active');
            elements.quizBtnText.innerText = 'Dừng tập viết';
            elements.btnQuiz.classList.replace('bg-rose-50', 'bg-rose-600');
            elements.btnQuiz.classList.replace('text-rose-700', 'text-white');

            elements.quizStatusBox.classList.remove('hidden');
            elements.quizStatusBox.className = 'w-full max-w-sm mb-3 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between bg-blue-50 text-blue-700 border border-blue-200';
            elements.quizStatusText.innerText = 'Dùng chuột hoặc ngón tay vẽ theo từng nét!';
            elements.quizStrokeCount.innerText = '';

            HanziWriterService.startQuiz({
                onMistake: (strokeData) => {
                    elements.quizStatusBox.className = 'w-full max-w-sm mb-3 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between bg-amber-50 text-amber-700 border border-amber-200';
                    elements.quizStatusText.innerText = `Chưa đúng nét! (Còn ${strokeData.mistakesOnStroke} lần sai)`;
                },
                onCorrectStroke: (strokeData) => {
                    elements.quizStatusBox.className = 'w-full max-w-sm mb-3 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between bg-emerald-50 text-emerald-700 border border-emerald-200';
                    elements.quizStatusText.innerText = 'Nét chuẩn xác! ✨ Hãy tiếp tục nét tiếp theo';
                    elements.quizStrokeCount.innerText = `Nét ${strokeData.strokeNum + 1}/${strokeData.totalStrokes}`;
                },
                onComplete: (summary) => {
                    state.isQuizActive = false;
                    elements.tianzigeContainer.classList.remove('quiz-active');
                    elements.quizBtnText.innerText = 'Tự tập viết';
                    elements.btnQuiz.classList.replace('bg-rose-600', 'bg-rose-50');
                    elements.btnQuiz.classList.replace('text-white', 'text-rose-700');

                    elements.quizStatusBox.className = 'w-full max-w-sm mb-3 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between bg-emerald-500 text-white shadow-md shadow-emerald-500/20';
                    elements.quizStatusText.innerText = `🎉 Xuất sắc! Bạn đã viết hoàn chỉnh chữ "${state.currentChar}"`;
                    elements.quizStrokeCount.innerText = `Sai: ${summary.totalMistakes} nét`;
                }
            });
        }
    }

    function resetQuizUI() {
        state.isQuizActive = false;
        elements.tianzigeContainer.classList.remove('quiz-active');
        elements.quizBtnText.innerText = 'Tự tập viết';
        elements.btnQuiz.classList.add('bg-rose-50', 'text-rose-700');
        elements.btnQuiz.classList.remove('bg-rose-600', 'text-white');
        elements.quizStatusBox.classList.add('hidden');
    }

    // ==========================================
    // 6. QUẢN LÝ DRAWER: LỊCH SỬ & YÊU THÍCH
    // ==========================================
    function openHistoryDrawer() {
        renderHistoryList();
        elements.historyDrawer.classList.remove('hidden');
    }

    function closeHistoryDrawer() {
        elements.historyDrawer.classList.add('hidden');
    }

    function renderHistoryList() {
        const history = StorageService.getHistory();
        elements.historyList.innerHTML = '';

        if (history.length === 0) {
            elements.historyList.innerHTML = `
                <div class="text-center py-8 text-slate-400 text-xs">
                    <p class="text-2xl mb-1">📜</p>
                    Chưa có lịch sử tra cứu nào.
                </div>
            `;
            return;
        }

        history.forEach(item => {
            const el = document.createElement('div');
            el.className = 'flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition group cursor-pointer';

            el.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-xl font-bold hanzi-font text-slate-800">${item.hanzi}</span>
                    <div>
                        <span class="text-xs font-semibold text-blue-600">${item.pinyin}</span>
                        <p class="text-[10px] text-slate-400">Từ khóa: "${item.term}"</p>
                    </div>
                </div>
                <button class="btn-del-history text-slate-300 hover:text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition" title="Xóa">✕</button>
            `;

            // Click vào mục để tải lại từ
            el.onclick = (e) => {
                if (e.target.classList.contains('btn-del-history')) {
                    e.stopPropagation();
                    StorageService.removeHistory(item.hanzi);
                    renderHistoryList();
                    return;
                }
                closeHistoryDrawer();
                elements.userInput.value = item.hanzi;
                loadWord(item.hanzi);
            };

            elements.historyList.appendChild(el);
        });
    }

    function openFavoritesDrawer() {
        renderFavoritesList();
        elements.favoritesDrawer.classList.remove('hidden');
    }

    function closeFavoritesDrawer() {
        elements.favoritesDrawer.classList.add('hidden');
    }

    function renderFavoritesList() {
        const favorites = StorageService.getFavorites();
        elements.favoritesList.innerHTML = '';

        if (favorites.length === 0) {
            elements.favoritesList.innerHTML = `
                <div class="text-center py-8 text-slate-400 text-xs">
                    <p class="text-2xl mb-1">⭐</p>
                    Chưa có từ nào trong danh sách yêu thích.<br>Bấm vào biểu tượng trái tim khi học chữ để lưu nhé!
                </div>
            `;
            return;
        }

        favorites.forEach(item => {
            const el = document.createElement('div');
            el.className = 'flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/40 transition group cursor-pointer';

            el.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-2xl font-bold hanzi-font text-slate-900">${item.char}</span>
                    <div>
                        <span class="text-xs font-semibold text-amber-600">${item.pinyin}</span>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                    <button class="btn-speak-fav p-1.5 text-slate-400 hover:text-blue-600 rounded-lg" title="Phát âm">
                        🔊
                    </button>
                    <button class="btn-del-fav text-slate-300 hover:text-red-500 p-1.5 rounded-md" title="Xóa khỏi yêu thích">✕</button>
                </div>
            `;

            el.onclick = (e) => {
                if (e.target.closest('.btn-speak-fav')) {
                    e.stopPropagation();
                    AudioService.speak(item.char);
                    return;
                }
                if (e.target.closest('.btn-del-fav')) {
                    e.stopPropagation();
                    StorageService.removeFavorite(item.char);
                    renderFavoritesList();
                    updateFavoriteBadge();
                    if (state.currentChar === item.char) {
                        renderFavoriteButton(false);
                    }
                    return;
                }
                closeFavoritesDrawer();
                elements.userInput.value = item.char;
                loadWord(item.char);
            };

            elements.favoritesList.appendChild(el);
        });
    }

    // Khởi chạy khi DOM đã sẵn sàng
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
