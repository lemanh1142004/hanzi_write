/**
 * HanziLab - Main Application Controller
 * Điều phối toàn bộ hoạt động của ứng dụng, kết nối UI với các dịch vụ
 */

(function () {
    'use strict';

    // ----------------------------------------------------
    // 1. TRẠNG THÁI ỨNG DỤNG (APPLICATION STATE)
    // ----------------------------------------------------
    const state = {
        currentWordObj: {
            word: '你好',
            pinyin: 'nǐ hǎo',
            meaning: 'Xin chào',
            date: ''
        },
        characters: ['你', '好'],
        activeCharIndex: 0,
        currentChar: '你',
        strokeSpeed: 1,

        // Quiz Ôn tập
        quizQuestions: [],
        currentQuizIndex: 0,
        quizScore: 0,
        quizAnswered: false,

        debounceTimer: null,
        activeSearchController: null
    };

    // ----------------------------------------------------
    // 2. BẢO MẬT & TIỆN ÍCH TRỢ GIÚP (UTILITIES)
    // ----------------------------------------------------
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // Thuật toán tráo ngẫu nhiên đều Fisher-Yates (loại bỏ lỗi sort biased)
    function shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Toast thông báo mềm mại không chặn luồng chính như alert()
    function showToast(message, duration = 2500) {
        let toast = document.getElementById('hanziToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'hanziToast';
            toast.className = 'hanzi-toast bg-slate-900/90 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-700/50 flex items-center gap-2 backdrop-blur-xs';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    // ----------------------------------------------------
    // 3. ĐIỀU HƯỚNG TABS
    // ----------------------------------------------------
    function switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.className = 'tab-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-white text-blue-600 shadow-xs';
            } else {
                btn.className = 'tab-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition';
            }
        });

        document.querySelectorAll('.tab-content').forEach(sec => sec.classList.add('hidden'));

        if (tabName === 'practice') {
            const sec = document.getElementById('sectionPractice');
            if (sec) sec.classList.remove('hidden');
            if (typeof HanziWriterService !== 'undefined' && !HanziWriterService.isQuizMode) {
                HanziWriterService.animate();
            }
        } else {
            // Tạm dừng animation khi rời tab luyện viết để giải phóng CPU
            if (typeof HanziWriterService !== 'undefined') {
                HanziWriterService.stopAnimation();
            }
            if (tabName === 'saved') {
                const sec = document.getElementById('sectionSaved');
                if (sec) sec.classList.remove('hidden');
                renderSavedWordsList();
            } else if (tabName === 'quiz') {
                const sec = document.getElementById('sectionQuiz');
                if (sec) sec.classList.remove('hidden');
                initReviewQuiz();
            } else if (tabName === 'write-test') {
                const sec = document.getElementById('sectionWriteTest');
                if (sec) sec.classList.remove('hidden');
                initWriteTest();
            }
        }
    }

    // ----------------------------------------------------
    // 4. TẢI VÀ HIỂN THỊ CỤM TỪ (WORD LOADER)
    // ----------------------------------------------------
    function loadWord(word, customPinyin = '', customMeaning = '') {
        if (!word) return;

        let targetWord = String(word).trim();

        // Nếu người dùng nhập Pinyin không có chữ Hán, tự động tra cứu để lấy chữ Hán
        if (!DictionaryService.isHanzi(targetWord)) {
            const norm = DictionaryService.normalizePinyinInput(targetWord);
            if (DictionaryService.PHRASES && DictionaryService.PHRASES[norm]) {
                const matched = DictionaryService.PHRASES[norm];
                if (!customPinyin) customPinyin = matched.pinyin;
                if (!customMeaning) customMeaning = matched.meaning;
                targetWord = matched.word;
            } else if (DictionaryService.SYLLABLES && DictionaryService.SYLLABLES[norm] && DictionaryService.SYLLABLES[norm].length > 0) {
                targetWord = DictionaryService.SYLLABLES[norm][0];
            }
        }

        // Tách chuỗi thành từng ký tự chữ Hán riêng biệt
        let chars = Array.from(targetWord).filter(ch => DictionaryService.isHanzi(ch));
        if (chars.length === 0) {
            chars = ['你', '好'];
            targetWord = '你好';
        }

        const cleanWord = chars.join('');

        // Tìm Pinyin đầy đủ tức thời O(1) - Ưu tiên từ điển chuẩn
        const dictPinyin = DictionaryService.computeFullPinyin(cleanWord);
        let fullPinyin = customPinyin || dictPinyin;

        // Tìm nghĩa tiếng Việt
        let meaning = customMeaning || DictionaryService.lookupDefaultMeaning(cleanWord);

        // Kiểm tra xem từ đã lưu trước đó trong LocalStorage chưa
        const savedItem = StorageService.getWord(cleanWord);
        let savedDate = StorageService.formatDate();
        if (savedItem) {
            if (!customMeaning && savedItem.meaning) meaning = savedItem.meaning;
            // Ưu tiên Pinyin chuẩn từ bộ từ điển để tự động sửa các từ đã lưu bị sai thanh điệu trước đó
            if (!customPinyin) {
                fullPinyin = dictPinyin || savedItem.pinyin || fullPinyin;
            }
            savedDate = savedItem.date;
        }

        state.currentWordObj = {
            word: cleanWord,
            pinyin: fullPinyin,
            meaning: meaning,
            date: savedDate
        };

        state.characters = chars;
        state.activeCharIndex = 0;

        // Cập nhật giao diện thông tin cụm từ
        const elWord = document.getElementById('currentWordDisplay');
        if (elWord) elWord.innerText = state.currentWordObj.word;

        const elPinyin = document.getElementById('currentWordPinyin');
        if (elPinyin) elPinyin.innerText = state.currentWordObj.pinyin;

        const elMeaning = document.getElementById('inputMeaning');
        if (elMeaning) elMeaning.value = state.currentWordObj.meaning;

        const elDateBadge = document.getElementById('wordDateBadge');
        if (elDateBadge) elDateBadge.innerText = `📅 ${state.currentWordObj.date}`;

        updateSaveButtonUI();
        renderCharacterTabs();
        loadActiveCharToWriter();
    }

    // Render các tab chữ cái nhỏ bên dưới dòng mô tả
    function renderCharacterTabs() {
        const container = document.getElementById('characterTabs');
        if (!container) return;
        container.innerHTML = '';

        if (!state.characters || state.characters.length === 0) {
            state.characters = ['你', '好'];
        }

        if (state.activeCharIndex >= state.characters.length || state.activeCharIndex < 0) {
            state.activeCharIndex = 0;
        }

        const countLabel = document.getElementById('charCountLabel');
        if (countLabel) {
            countLabel.innerText = `${state.characters.length} chữ`;
        }

        state.characters.forEach((char, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            const isActive = idx === state.activeCharIndex;
            const pinyin = DictionaryService.computeFullPinyin(char);

            btn.className = `character-tab-btn min-w-[54px] h-12 px-3.5 rounded-xl font-bold text-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105 ring-2 ring-blue-400/40'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-blue-600'
            }`;
            btn.setAttribute('data-char', char);
            btn.setAttribute('data-index', idx);
            btn.title = `Luyện viết chữ "${char}" (${pinyin})`;

            btn.innerHTML = `
                <span class="hanzi-font text-xl font-bold">${char}</span>
                <span class="text-xs font-semibold opacity-90">${pinyin}</span>
            `;

            btn.onclick = (e) => {
                if (e) e.preventDefault();
                if (state.activeCharIndex !== idx) {
                    state.activeCharIndex = idx;
                    renderCharacterTabs();
                    loadActiveCharToWriter();
                }
            };

            container.appendChild(btn);
        });
    }

    // Nạp ký tự chữ cái đang chọn vào khung vẽ nét HanziWriter
    function loadActiveCharToWriter() {
        const char = state.characters[state.activeCharIndex];
        state.currentChar = char;

        const elDisplay = document.getElementById('currentCharDisplay');
        if (elDisplay) elDisplay.innerText = char;

        const elPinyin = document.getElementById('currentCharPinyin');
        if (elPinyin) elPinyin.innerText = DictionaryService.computeFullPinyin(char);

        resetQuizButtonUI();

        if (typeof HanziWriterService !== 'undefined') {
            HanziWriterService.load(char);
        }
    }

    // ----------------------------------------------------
    // 5. CHẾ ĐỘ TỰ TẬP VIẾT TỪNG NÉT (WRITING QUIZ)
    // ----------------------------------------------------
    function toggleInteractiveWritingQuiz() {
        if (typeof HanziWriterService === 'undefined') return;

        const quizBox = document.getElementById('quizStatusBox');
        const quizStatusText = document.getElementById('quizStatusText');
        const quizStrokeCount = document.getElementById('quizStrokeCount');
        const quizContainer = document.getElementById('mizigeContainer');
        const btnQuiz = document.getElementById('btnQuiz');
        const quizBtnText = document.getElementById('quizBtnText');

        if (HanziWriterService.isQuizMode) {
            HanziWriterService.cancelQuiz();
            resetQuizButtonUI();
            HanziWriterService.animate();
        } else {
            quizContainer.classList.add('quiz-active');
            btnQuiz.classList.replace('bg-rose-50', 'bg-rose-600');
            btnQuiz.classList.replace('text-rose-700', 'text-white');
            quizBtnText.innerText = 'Dừng tập viết';

            quizBox.className = 'w-full max-w-sm mb-3 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between bg-blue-50 text-blue-700 border border-blue-200';
            quizBox.classList.remove('hidden');
            quizStatusText.innerText = 'Dùng chuột hoặc ngón tay vẽ theo từng nét!';
            quizStrokeCount.innerText = '';

            HanziWriterService.startQuiz({
                onMistake: (strokeData) => {
                    quizBox.className = 'w-full max-w-sm mb-3 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between bg-amber-50 text-amber-700 border border-amber-200';
                    quizStatusText.innerText = `Chưa đúng nét! (Còn ${strokeData.mistakesOnStroke} lần thử)`;
                },
                onCorrectStroke: (strokeData) => {
                    quizBox.className = 'w-full max-w-sm mb-3 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between bg-emerald-50 text-emerald-700 border border-emerald-200';
                    quizStatusText.innerText = 'Nét chuẩn xác! ✨ Vẽ nét tiếp theo';
                    quizStrokeCount.innerText = `Nét ${strokeData.strokeNum + 1}/${strokeData.totalStrokes}`;
                },
                onComplete: (summary) => {
                    quizContainer.classList.remove('quiz-active');
                    btnQuiz.classList.replace('bg-rose-600', 'bg-rose-50');
                    btnQuiz.classList.replace('text-white', 'text-rose-700');
                    quizBtnText.innerText = 'Tự tập viết';

                    const hasNextChar = state.activeCharIndex < state.characters.length - 1;
                    const nextChar = hasNextChar ? state.characters[state.activeCharIndex + 1] : '';

                    quizBox.className = 'w-full max-w-sm mb-3 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between bg-emerald-500 text-white shadow-md shadow-emerald-500/20';
                    
                    if (hasNextChar) {
                        quizBox.innerHTML = `
                            <span>🎉 Xong chữ "${state.currentChar}"! (Sai: ${summary.totalMistakes})</span>
                            <button id="btnNextWritingChar" class="bg-white text-emerald-700 font-bold px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition shadow-2xs">
                                Viết tiếp chữ "${nextChar}" →
                            </button>
                        `;
                        const nextBtn = document.getElementById('btnNextWritingChar');
                        if (nextBtn) {
                            nextBtn.onclick = () => {
                                state.activeCharIndex++;
                                renderCharacterTabs();
                                loadActiveCharToWriter();
                                setTimeout(() => toggleInteractiveWritingQuiz(), 200);
                            };
                        }
                    } else {
                        quizBox.innerHTML = `
                            <span>🎉 Hoàn thành toàn bộ cụm từ "${state.currentWordObj.word}"!</span>
                            <span class="text-[11px] font-normal">Sai: ${summary.totalMistakes} lần</span>
                        `;
                    }
                }
            });
        }
    }

    function resetQuizButtonUI() {
        const quizContainer = document.getElementById('mizigeContainer');
        if (quizContainer) quizContainer.classList.remove('quiz-active');
        const btnQuiz = document.getElementById('btnQuiz');
        if (btnQuiz) {
            btnQuiz.classList.add('bg-rose-50', 'text-rose-700');
            btnQuiz.classList.remove('bg-rose-600', 'text-white');
        }
        const quizBtnText = document.getElementById('quizBtnText');
        if (quizBtnText) quizBtnText.innerText = 'Tự tập viết';
        const quizBox = document.getElementById('quizStatusBox');
        if (quizBox) quizBox.classList.add('hidden');
    }

    // ----------------------------------------------------
    // 6. XỬ LÝ TRA CỨU & GỢI Ý BỘ GÕ (SEARCH & LIVE IME)
    // ----------------------------------------------------
    async function handleSearch() {
        const inputEl = document.getElementById('userInput');
        if (!inputEl) return;
        const raw = inputEl.value.trim();
        if (!raw) return;

        if (typeof HanziWriterService !== 'undefined') {
            HanziWriterService.stopAnimation();
        }
        if (state.activeSearchController) {
            state.activeSearchController.abort();
            state.activeSearchController = null;
        }

        const candContainer = document.getElementById('candidateContainer');
        if (candContainer) candContainer.classList.add('hidden');

        // 1. Nếu người dùng gõ trực tiếp chữ Hán (VD: '你好', '汉语')
        if (DictionaryService.isHanzi(raw)) {
            loadWord(raw);
            return;
        }

        // 2. Nếu người dùng gõ Pinyin (VD: 'nihao', 'didi', 'xuexi')
        const normalized = DictionaryService.normalizePinyinInput(raw);
        let candidateList = DictionaryService.lookupOffline(normalized);

        // Nạp tức thời 0ms kết quả offline đầu tiên
        if (candidateList.length > 0) {
            loadWord(candidateList[0], raw.includes(' ') ? raw : '');
            renderCandidates(candidateList);
        }

        // Thử lấy thêm ứng viên online qua Google Input Tools API với timeout 800ms
        try {
            state.activeSearchController = new AbortController();
            const onlineList = await DictionaryService.fetchOnlineCandidates(normalized);
            if (onlineList.length > 0) {
                candidateList = Array.from(new Set([...candidateList, ...onlineList]));
                renderCandidates(candidateList);
                if (!state.currentWordObj || state.currentWordObj.word !== candidateList[0]) {
                    loadWord(candidateList[0], raw.includes(' ') ? raw : '');
                }
            }
        } catch (e) {
        } finally {
            state.activeSearchController = null;
        }

        if (candidateList.length === 0) {
            const listEl = document.getElementById('candidateList');
            if (listEl && candContainer) {
                listEl.innerHTML = `<span class="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">Không tìm thấy chữ Hán cho "${escapeHtml(raw)}". Hãy thử từ như nihao, hanyu, xuexi!</span>`;
                candContainer.classList.remove('hidden');
            }
        }
    }

    function renderCandidates(candidates) {
        const container = document.getElementById('candidateContainer');
        const listEl = document.getElementById('candidateList');
        if (!container || !listEl) return;
        listEl.innerHTML = '';
        container.classList.remove('hidden');

        candidates.slice(0, 12).forEach((cand, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'candidate-item inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-600 rounded-lg text-xs font-medium border border-slate-200 transition select-none cursor-pointer';
            btn.innerHTML = `<span class="text-[10px] text-slate-400">${idx + 1}.</span> <span class="text-sm font-semibold">${escapeHtml(cand)}</span>`;
            btn.onclick = (e) => {
                if (e) e.preventDefault();
                if (typeof HanziWriterService !== 'undefined') {
                    HanziWriterService.stopAnimation();
                }
                const inputEl = document.getElementById('userInput');
                if (inputEl) inputEl.value = cand;
                container.classList.add('hidden');
                loadWord(cand);
            };
            listEl.appendChild(btn);
        });
    }

    // ----------------------------------------------------
    // 7. LƯU CỤM TỪ VÀO LOCALSTORAGE
    // ----------------------------------------------------
  function updateSaveButtonUI() {
    const isSaved = StorageService.isSaved(state.currentWordObj.word);
    const btn = document.getElementById('btnSaveWord');
    const icon = document.getElementById('saveIcon');
    const text = document.getElementById('saveBtnText');
    if (!btn || !icon || !text) return;

    if (isSaved) {
        btn.setAttribute('class', 'inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border transition shadow-2xs bg-amber-500 text-white border-amber-500');
        icon.setAttribute('class', 'w-4 h-4 text-white');
        text.innerText = 'Đã lưu cụm từ ✓';
    } else {
        btn.setAttribute('class', 'inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border transition shadow-2xs bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100');
        icon.setAttribute('class', 'w-4 h-4 text-amber-500');
        text.innerText = 'Lưu cụm từ này';
    }

    updateSavedBadgeCount();
}

    function updateSavedBadgeCount() {
        const count = StorageService.getSavedWords().length;
        const badge = document.getElementById('savedBadgeCount');
        if (badge) {
            if (count > 0) {
                badge.innerText = count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    function handleSaveCurrentWord() {
        const current = state.currentWordObj;
        if (!current || !current.word) return;

        const inputMeaningEl = document.getElementById('inputMeaning');
        if (inputMeaningEl) {
            current.meaning = inputMeaningEl.value.trim();
        }

        if (StorageService.isSaved(current.word)) {
            StorageService.removeWord(current.word);
            showToast(`Đã bỏ lưu cụm từ "${current.word}"`);
        } else {
            StorageService.saveWord({
                word: current.word,
                pinyin: current.pinyin,
                meaning: current.meaning,
                date: StorageService.formatDate()
            });
            showToast(`Đã lưu cụm từ "${current.word}" vào Sổ từ vựng! ⭐`);
        }

        updateSaveButtonUI();
    }

    // ----------------------------------------------------
    // 8. TAB 2: QUẢN LÝ SỔ TỪ VỰNG ĐÃ LƯU
    // ----------------------------------------------------
    function renderSavedWordsList() {
        const list = StorageService.getSavedWords();
        const container = document.getElementById('savedWordsList');
        const countHeader = document.getElementById('savedCountHeader');
        if (countHeader) countHeader.innerText = `${list.length} từ`;
        if (!container) return;
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-slate-400 text-xs">
                    <div class="text-4xl mb-2">📂</div>
                    Chưa có cụm từ nào được lưu.<br>Hãy sang tab <strong>"Luyện viết"</strong> và bấm <strong>"Lưu cụm từ này"</strong> nhé!
                </div>
            `;
            return;
        }

        list.forEach(item => {
            const card = document.createElement('div');
            card.className = 'flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/30 transition bg-white shadow-2xs gap-3';

            const safeWord = escapeHtml(item.word);
            const safePinyin = escapeHtml(item.pinyin);
            const safeMeaning = escapeHtml(item.meaning);
            const safeDate = escapeHtml(item.date || 'Chưa rõ');

            card.innerHTML = `
                <div class="flex items-start gap-3.5">
                    <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 text-2xl font-black hanzi-font border border-blue-100 shrink-0">
                        ${safeWord}
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-extrabold text-slate-900 hanzi-font">${safeWord}</h3>
                            <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">${safePinyin}</span>
                        </div>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <p class="text-xs text-slate-600 font-medium meaning-display">${safeMeaning ? 'Nghĩa: ' + safeMeaning : '<span class="text-slate-400 italic">Chưa có ghi chú nghĩa</span>'}</p>
                            <button class="btn-edit-meaning text-[11px] text-slate-400 hover:text-blue-600 transition" title="Sửa nghĩa">✏️</button>
                        </div>
                        <span class="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                            <span>📅 Ngày lưu: ${safeDate}</span>
                        </span>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 self-end sm:self-center">
                    <button class="btn-play-audio p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition" title="Phát âm">
                        🔊
                    </button>
                    <button class="btn-practice-word px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200">
                        ✍️ Viết chữ
                    </button>
                    <button class="btn-del-word p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Xóa cụm từ">
                        ✕
                    </button>
                </div>
            `;

            // Phát âm
            card.querySelector('.btn-play-audio').onclick = () => AudioService.speak(item.word);

            // Chuyển sang luyện viết
            card.querySelector('.btn-practice-word').onclick = () => {
                switchTab('practice');
                loadWord(item.word, item.pinyin, item.meaning);
            };

            // Sửa nghĩa tại chỗ
            card.querySelector('.btn-edit-meaning').onclick = () => {
                const currentMeaning = item.meaning || '';
                const newMeaning = prompt(`Nhập nghĩa tiếng Việt cho từ "${item.word}":`, currentMeaning);
                if (newMeaning !== null) {
                    StorageService.updateMeaning(item.word, newMeaning);
                    renderSavedWordsList();
                    if (state.currentWordObj.word === item.word) {
                        state.currentWordObj.meaning = newMeaning.trim();
                        const inp = document.getElementById('inputMeaning');
                        if (inp) inp.value = state.currentWordObj.meaning;
                    }
                    showToast('Đã cập nhật nghĩa thành công!');
                }
            };

            // Xóa từ
            card.querySelector('.btn-del-word').onclick = () => {
                if (confirm(`Bạn có chắc muốn xóa cụm từ "${item.word}" khỏi danh sách?`)) {
                    StorageService.removeWord(item.word);
                    renderSavedWordsList();
                    updateSaveButtonUI();
                    showToast(`Đã xóa cụm từ "${item.word}"`);
                }
            };

            container.appendChild(card);
        });
    }

    function loadSampleWords() {
        const samples = [
            { word: '你好', pinyin: 'nǐ hǎo', meaning: 'Xin chào', date: StorageService.formatDate() },
            { word: '汉语', pinyin: 'hàn yǔ', meaning: 'Tiếng Hán / Tiếng Trung', date: StorageService.formatDate() },
            { word: '学习', pinyin: 'xué xí', meaning: 'Học tập', date: StorageService.formatDate() },
            { word: '谢谢', pinyin: 'xiè xie', meaning: 'Cảm ơn', date: StorageService.formatDate() },
            { word: '再见', pinyin: 'zài jiàn', meaning: 'Tạm biệt', date: StorageService.formatDate() },
            { word: '中国', pinyin: 'zhōng guó', meaning: 'Trung Quốc', date: StorageService.formatDate() },
            { word: '朋友', pinyin: 'péng you', meaning: 'Bạn bè', date: StorageService.formatDate() },
            { word: '老师', pinyin: 'lǎo shī', meaning: 'Thầy / Cô giáo', date: StorageService.formatDate() }
        ];

        samples.forEach(s => StorageService.saveWord(s));
        renderSavedWordsList();
        updateSaveButtonUI();
        showToast('Đã nạp thành công 8 cụm từ mẫu HSK vào LocalStorage!');
    }

    // ----------------------------------------------------
    // 9. TAB 3: CHẾ ĐỘ QUIZ TRẮC NGHIỆM ÔN TẬP
    // ----------------------------------------------------
    function initReviewQuiz() {
        const saved = StorageService.getSavedWords();
        const emptyState = document.getElementById('quizEmptyState');
        const playArea = document.getElementById('quizPlayArea');
        const resultArea = document.getElementById('quizResultArea');
        const scoreBadge = document.getElementById('quizScoreBadge');

        if (saved.length < 2) {
            if (emptyState) emptyState.classList.remove('hidden');
            if (playArea) playArea.classList.add('hidden');
            if (resultArea) resultArea.classList.add('hidden');
            if (scoreBadge) scoreBadge.classList.add('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        if (resultArea) resultArea.classList.add('hidden');
        if (playArea) playArea.classList.remove('hidden');
        if (scoreBadge) scoreBadge.classList.remove('hidden');

        const questionCount = Math.min(Math.max(saved.length, 3), 8);
        state.quizQuestions = generateQuizQuestions(saved, questionCount);
        state.currentQuizIndex = 0;
        state.quizScore = 0;
        state.quizAnswered = false;

        const scoreText = document.getElementById('quizScoreText');
        if (scoreText) scoreText.innerText = '0';
        renderCurrentQuestion();
    }

    function generateQuizQuestions(words, count) {
        const shuffledPool = shuffleArray(words).slice(0, count);

        const fallbacks = [
            { word: '北京', pinyin: 'běi jīng', meaning: 'Bắc Kinh' },
            { word: '天气', pinyin: 'tiān qì', meaning: 'Thời tiết' },
            { word: '时间', pinyin: 'shí jiān', meaning: 'Thời gian' },
            { word: '高兴', pinyin: 'gāo xìng', meaning: 'Vui vẻ' }
        ];

        return shuffledPool.map(target => {
            // Lựa chọn kiểu câu hỏi ngẫu nhiên:
            // 0: Hán tự -> Hỏi Pinyin
            // 1: Pinyin -> Hỏi Hán tự
            // 2: Hán tự -> Hỏi Nghĩa (chỉ tạo khi target có nghĩa)
            let type = Math.random() < 0.5 ? 'hanzi_to_pinyin' : 'pinyin_to_hanzi';
            if (target.meaning && target.meaning.trim().length > 0 && Math.random() < 0.35) {
                type = 'hanzi_to_meaning';
            }

            // Lấy danh sách làm nhiễu từ các từ khác trong kho
            let otherWords = words.filter(w => w.word !== target.word);
            // Nếu là câu hỏi nghĩa, chỉ lấy những từ làm nhiễu có nghĩa để không lẫn lộn tiếng Việt và Pinyin
            if (type === 'hanzi_to_meaning') {
                otherWords = otherWords.filter(w => w.meaning && w.meaning.trim().length > 0);
            }

            let distractors = shuffleArray(otherWords).slice(0, 3);

            // Bổ sung từ fallback nếu kho từ còn ít
            for (const fb of fallbacks) {
                if (distractors.length >= 3) break;
                if (fb.word !== target.word && !distractors.some(d => d.word === fb.word)) {
                    distractors.push(fb);
                }
            }

            const targetPinyin = DictionaryService.computeFullPinyin(target.word) || target.pinyin;
            let correctText = '';
            let optionExtractor = null;

            if (type === 'hanzi_to_pinyin') {
                correctText = targetPinyin;
                optionExtractor = (item) => DictionaryService.computeFullPinyin(item.word) || item.pinyin;
            } else if (type === 'pinyin_to_hanzi') {
                correctText = target.word;
                optionExtractor = (item) => item.word;
            } else {
                correctText = target.meaning;
                optionExtractor = (item) => item.meaning || DictionaryService.computeFullPinyin(item.word) || item.pinyin;
            }

            // Đảm bảo các lựa chọn là duy nhất, không trùng lặp
            const uniqueOptionsMap = new Map();
            uniqueOptionsMap.set(correctText, { text: correctText, isCorrect: true });

            distractors.forEach(d => {
                const optVal = optionExtractor(d);
                if (optVal && !uniqueOptionsMap.has(optVal)) {
                    uniqueOptionsMap.set(optVal, { text: optVal, isCorrect: false });
                }
            });

            const finalOptions = shuffleArray(Array.from(uniqueOptionsMap.values()));

            return {
                type,
                targetWord: target.word,
                targetPinyin: targetPinyin,
                targetMeaning: target.meaning,
                options: finalOptions
            };
        });
    }

    function renderCurrentQuestion() {
        state.quizAnswered = false;
        const q = state.quizQuestions[state.currentQuizIndex];
        const total = state.quizQuestions.length;

        const progressText = document.getElementById('quizProgressText');
        if (progressText) progressText.innerText = `Câu ${state.currentQuizIndex + 1} / ${total}`;

        const progressBar = document.getElementById('quizProgressBar');
        if (progressBar) progressBar.style.width = `${((state.currentQuizIndex + 1) / total) * 100}%`;

        const feedbackBox = document.getElementById('quizFeedbackBox');
        if (feedbackBox) feedbackBox.classList.add('hidden');

        const promptEl = document.getElementById('quizQuestionPrompt');
        const targetEl = document.getElementById('quizQuestionTarget');
        const subEl = document.getElementById('quizQuestionSub');
        const timerType = document.getElementById('quizTimerType');

        if (q.type === 'hanzi_to_pinyin') {
            if (promptEl) promptEl.innerText = 'Chọn phát âm Pinyin đúng cho cụm từ:';
            if (targetEl) targetEl.innerText = q.targetWord;
            if (subEl) subEl.innerText = q.targetMeaning ? `(Nghĩa: ${q.targetMeaning})` : '';
            if (timerType) timerType.innerText = 'Cụm từ ➔ Pinyin';
        } else if (q.type === 'pinyin_to_hanzi') {
            if (promptEl) promptEl.innerText = 'Chọn Cụm từ chữ Hán tương ứng với phiên âm:';
            if (targetEl) targetEl.innerText = q.targetPinyin;
            if (subEl) subEl.innerText = q.targetMeaning ? `(Nghĩa: ${q.targetMeaning})` : '';
            if (timerType) timerType.innerText = 'Pinyin ➔ Chữ Hán';
        } else {
            if (promptEl) promptEl.innerText = 'Chọn nghĩa tiếng Việt đúng cho cụm từ:';
            if (targetEl) targetEl.innerText = q.targetWord;
            if (subEl) subEl.innerText = `(${q.targetPinyin})`;
            if (timerType) timerType.innerText = 'Cụm từ ➔ Nghĩa';
        }

        const btnQuizSpeak = document.getElementById('btnQuizSpeak');
        if (btnQuizSpeak) {
            btnQuizSpeak.onclick = () => AudioService.speak(q.targetWord);
        }

        const btnQuizOpenWriter = document.getElementById('btnQuizOpenWriter');
        if (btnQuizOpenWriter) {
            btnQuizOpenWriter.onclick = () => openQuizWriterModal(q.targetWord, q.targetPinyin, q.targetMeaning);
        }

        const optionsGrid = document.getElementById('quizOptionsGrid');
        if (!optionsGrid) return;
        optionsGrid.innerHTML = '';

        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-opt-btn flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 font-bold transition shadow-2xs text-left cursor-pointer';
            const letter = String.fromCharCode(65 + idx);
            const isHanziOption = DictionaryService.isHanzi(opt.text);

            btn.innerHTML = `
                <div class="flex items-center gap-2.5">
                    <span class="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-semibold">${letter}</span>
                    <span class="text-base ${isHanziOption ? 'hanzi-font text-xl' : ''}">${escapeHtml(opt.text)}</span>
                </div>
                <span class="opt-icon text-sm"></span>
            `;

            btn.onclick = () => handleQuizOptionSelected(opt, btn, q);
            optionsGrid.appendChild(btn);
        });
    }

    function handleQuizOptionSelected(selectedOpt, btnElement, currentQ) {
        if (state.quizAnswered) return;
        state.quizAnswered = true;

        const allBtns = document.querySelectorAll('.quiz-opt-btn');
        const feedbackBox = document.getElementById('quizFeedbackBox');
        const feedbackText = document.getElementById('quizFeedbackText');

        if (selectedOpt.isCorrect) {
            state.quizScore++;
            const scoreText = document.getElementById('quizScoreText');
            if (scoreText) scoreText.innerText = state.quizScore;

            btnElement.classList.add('bg-emerald-50', 'border-emerald-500', 'text-emerald-700');
            const icon = btnElement.querySelector('.opt-icon');
            if (icon) icon.innerText = '✓';

            if (feedbackBox) {
                feedbackBox.className = 'w-full max-w-md p-3.5 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-2.5 mb-3 bg-emerald-50 text-emerald-800 border border-emerald-200';
            }
            if (feedbackText) {
                feedbackText.innerText = `Chính xác! 🎉 (${currentQ.targetWord} : ${currentQ.targetPinyin})`;
            }
        } else {
            btnElement.classList.add('bg-rose-50', 'border-rose-500', 'text-rose-700');
            const icon = btnElement.querySelector('.opt-icon');
            if (icon) icon.innerText = '✕';

            allBtns.forEach(btn => {
                const optSpan = btn.querySelector('span.text-base');
                if (optSpan) {
                    const optText = optSpan.innerText;
                    const correctOpt = currentQ.options.find(o => o.isCorrect);
                    if (correctOpt && optText === correctOpt.text) {
                        btn.classList.add('bg-emerald-50', 'border-emerald-500', 'text-emerald-700');
                        const corrIcon = btn.querySelector('.opt-icon');
                        if (corrIcon) corrIcon.innerText = '✓';
                    }
                }
            });

            if (feedbackBox) {
                feedbackBox.className = 'w-full max-w-md p-3.5 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-2.5 mb-3 bg-rose-50 text-rose-800 border border-rose-200';
            }
            if (feedbackText) {
                feedbackText.innerText = `Chưa đúng! Đáp án là: ${currentQ.targetWord} (${currentQ.targetPinyin})`;
            }
        }

        const btnFeedbackPractice = document.getElementById('btnQuizFeedbackPractice');
        if (btnFeedbackPractice) {
            btnFeedbackPractice.onclick = () => openQuizWriterModal(currentQ.targetWord, currentQ.targetPinyin, currentQ.targetMeaning);
        }

        if (feedbackBox) feedbackBox.classList.remove('hidden');
    }

    function handleQuizNext() {
        state.currentQuizIndex++;
        if (state.currentQuizIndex < state.quizQuestions.length) {
            renderCurrentQuestion();
        } else {
            showQuizResults();
        }
    }

    function showQuizResults() {
        const playArea = document.getElementById('quizPlayArea');
        if (playArea) playArea.classList.add('hidden');

        const resultArea = document.getElementById('quizResultArea');
        if (resultArea) resultArea.classList.remove('hidden');

        const total = state.quizQuestions.length;
        const score = state.quizScore;
        const accuracy = Math.round((score / total) * 100);

        const finalScore = document.getElementById('quizFinalScore');
        if (finalScore) finalScore.innerText = `${score}/${total}`;

        const accEl = document.getElementById('quizAccuracy');
        if (accEl) accEl.innerText = `${accuracy}%`;

        // Hiển thị danh sách các từ trong đề thi để người dùng bấm vào luyện viết lại
        const wordsListEl = document.getElementById('quizReviewedWordsList');
        if (wordsListEl) {
            wordsListEl.innerHTML = '';
            state.quizQuestions.forEach(q => {
                const card = document.createElement('div');
                card.className = 'flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-left';
                card.innerHTML = `
                    <div class="flex items-center gap-2.5">
                        <span class="hanzi-font text-xl font-black text-slate-900">${escapeHtml(q.targetWord)}</span>
                        <div>
                            <p class="text-xs font-bold text-blue-600">${escapeHtml(q.targetPinyin)}</p>
                            <p class="text-[11px] text-slate-500 line-clamp-1">${escapeHtml(q.targetMeaning || '')}</p>
                        </div>
                    </div>
                    <button type="button" class="btn-review-write px-2.5 py-1 text-xs font-bold bg-white text-blue-600 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition shadow-2xs cursor-pointer">
                        ✍️ Luyện viết
                    </button>
                `;
                card.querySelector('.btn-review-write').onclick = () => {
                    openQuizWriterModal(q.targetWord, q.targetPinyin, q.targetMeaning);
                };
                wordsListEl.appendChild(card);
            });
        }
    }

    // ====================================================
    // 9.1 MODAL LUYỆN VIẾT NÉT CHỮ HÁN TRONG BÀI QUIZ
    // ====================================================
    const quizWriterState = {
        word: '',
        pinyin: '',
        meaning: '',
        chars: [],
        activeCharIndex: 0,
        writerInstance: null,
        isQuizMode: false,
        outlineVisible: true,
        animSessionId: 0
    };

    function openQuizWriterModal(word, pinyin = '', meaning = '') {
        if (!word) return;

        const chars = DictionaryService.extractHanzi(word);
        if (chars.length === 0) {
            showToast('Không có chữ Hán để luyện viết!');
            return;
        }

        const safeWord = chars.join('');
        const safePinyin = pinyin || DictionaryService.computeFullPinyin(safeWord);
        const safeMeaning = meaning || DictionaryService.lookupDefaultMeaning(safeWord);

        quizWriterState.word = safeWord;
        quizWriterState.pinyin = safePinyin;
        quizWriterState.meaning = safeMeaning;
        quizWriterState.chars = chars;
        quizWriterState.activeCharIndex = 0;
        quizWriterState.outlineVisible = true;

        const elWord = document.getElementById('quizWriterWord');
        if (elWord) elWord.innerText = safeWord;

        const elPin = document.getElementById('quizWriterPinyin');
        if (elPin) elPin.innerText = safePinyin;

        const elMean = document.getElementById('quizWriterMeaning');
        if (elMean) elMean.innerText = safeMeaning || '(Chưa có ghi chú nghĩa)';

        const outlineBtn = document.getElementById('btnQuizWriterOutline');
        if (outlineBtn) {
            outlineBtn.innerHTML = '<span>👁️ Nét mờ: Bật</span>';
        }

        const modal = document.getElementById('quizWritingModal');
        if (modal) modal.classList.remove('hidden');

        loadQuizWriterChar(0);
    }

    function closeQuizWriterModal() {
        stopQuizWriter();
        const modal = document.getElementById('quizWritingModal');
        if (modal) modal.classList.add('hidden');
    }

    function stopQuizWriter() {
        if (quizWriterState.writerInstance) {
            try {
                quizWriterState.writerInstance.cancelQuiz();
            } catch (e) {}
        }
        quizWriterState.animSessionId++;
        quizWriterState.isQuizMode = false;
        const box = document.getElementById('quizWriterMizige');
        if (box) box.classList.remove('quiz-active');
    }

    function loadQuizWriterChar(idx) {
        if (!quizWriterState.chars || quizWriterState.chars.length === 0) return;
        if (idx < 0 || idx >= quizWriterState.chars.length) idx = 0;
        quizWriterState.activeCharIndex = idx;

        const char = quizWriterState.chars[idx];
        const pinyin = DictionaryService.computeFullPinyin(char);

        const curCharEl = document.getElementById('quizWriterCurrentChar');
        if (curCharEl) curCharEl.innerText = char;

        const curPinEl = document.getElementById('quizWriterCurrentPinyin');
        if (curPinEl) curPinEl.innerText = pinyin;

        const audioBtn = document.getElementById('btnQuizWriterAudio');
        if (audioBtn) {
            audioBtn.onclick = () => AudioService.speak(char);
        }

        renderQuizWriterCharTabs();
        stopQuizWriter();

        const targetEl = document.getElementById('quiz-writer-target');
        if (!targetEl) return;
        targetEl.innerHTML = '';

        if (typeof HanziWriter === 'undefined') {
            targetEl.innerHTML = `<div class="text-5xl font-serif text-slate-800 hanzi-font">${char}</div>`;
            return;
        }

        try {
            const thisSession = ++quizWriterState.animSessionId;
            quizWriterState.writerInstance = HanziWriter.create('quiz-writer-target', char, {
                width: 230,
                height: 230,
                padding: 16,
                showOutline: quizWriterState.outlineVisible,
                strokeAnimationSpeed: 1.1,
                delayBetweenStrokes: 160,
                strokeColor: '#2563eb',
                outlineColor: '#cbd5e1',
                drawingColor: '#dc2626',
                drawingWidth: 15,
                showHintAfterMisses: 2,
                highlightOnComplete: false,
                onLoadCharDataSuccess: () => {
                    if (quizWriterState.animSessionId === thisSession && !quizWriterState.isQuizMode) {
                        quizWriterAnimate();
                    }
                },
                onLoadCharDataError: () => {
                    targetEl.innerHTML = `<div class="text-center p-3 text-slate-400 text-xs font-medium">Chưa có dữ liệu nét cho chữ "${char}"</div>`;
                }
            });
            updateQuizWriterStatus(`Đang hiển thị thứ tự nét của chữ "${char}"`);
        } catch (e) {
            console.error('Lỗi khi khởi tạo Quiz HanziWriter:', e);
            targetEl.innerHTML = `<div class="text-5xl font-serif text-slate-800 hanzi-font">${char}</div>`;
        }
    }

    function renderQuizWriterCharTabs() {
        const container = document.getElementById('quizWriterCharTabs');
        const wrapper = document.getElementById('quizWriterCharTabsContainer');
        if (!container || !wrapper) return;

        if (quizWriterState.chars.length <= 1) {
            wrapper.classList.add('hidden');
            return;
        }

        wrapper.classList.remove('hidden');
        container.innerHTML = '';

        quizWriterState.chars.forEach((c, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            const isActive = idx === quizWriterState.activeCharIndex;
            btn.className = `px-3 py-1 rounded-lg text-sm font-bold border transition cursor-pointer ${
                isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs scale-105'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`;
            btn.innerText = c;
            btn.onclick = () => {
                if (quizWriterState.activeCharIndex !== idx) {
                    loadQuizWriterChar(idx);
                }
            };
            container.appendChild(btn);
        });
    }

    function quizWriterAnimate() {
        if (!quizWriterState.writerInstance) return;
        stopQuizWriter();
        quizWriterState.isQuizMode = false;
        updateQuizWriterStatus('Đang chạy hoạt ảnh nét viết...');
        const box = document.getElementById('quizWriterMizige');
        if (box) box.classList.remove('quiz-active');

        try {
            quizWriterState.writerInstance.showOutline();
            quizWriterState.writerInstance.animateCharacter({
                onComplete: () => {
                    updateQuizWriterStatus('Hoàn thành 1 lượt xem nét. Bấm "Tự tập viết" để vẽ!');
                }
            });
        } catch (e) {}
    }

    function quizWriterStartQuiz() {
        if (!quizWriterState.writerInstance) return;
        stopQuizWriter();
        quizWriterState.isQuizMode = true;

        const box = document.getElementById('quizWriterMizige');
        if (box) box.classList.add('quiz-active');

        try {
            quizWriterState.writerInstance.hideCharacter();
            if (quizWriterState.outlineVisible) {
                quizWriterState.writerInstance.showOutline();
            } else {
                quizWriterState.writerInstance.hideOutline();
            }

            updateQuizWriterStatus('Dùng chuột hoặc ngón tay vẽ theo từng nét!', 'Bắt đầu');

            quizWriterState.writerInstance.quiz({
                onMistake: (strokeData) => {
                    updateQuizWriterStatus(`Chưa đúng nét! (Lỗi ${strokeData.mistakesOnStroke || 1}) ✍️`, 'Thử lại');
                },
                onCorrectStroke: (strokeData) => {
                    const current = strokeData.strokeNum + 1;
                    const total = strokeData.totalStrokes || strokeData.strokeNum + 1;
                    updateQuizWriterStatus(`Chính xác! Tiếp tục nét tiếp theo`, `Nét ${current}/${total}`);
                },
                onComplete: (summary) => {
                    quizWriterState.isQuizMode = false;
                    if (box) box.classList.remove('quiz-active');
                    const mistakes = summary ? summary.totalMistakes : 0;
                    const msg = mistakes === 0 ? 'Xuất sắc! 🎉 Không sai nét nào!' : `Rất tốt! 🎉 Hoàn thành (Lỗi: ${mistakes})`;
                    updateQuizWriterStatus(msg, 'Xong 100%');
                    showToast(`Tuyệt vời! Bạn đã viết xong chữ "${quizWriterState.chars[quizWriterState.activeCharIndex]}"! ⭐`);
                }
            });
        } catch (e) {
            console.error('Lỗi khi bật chế độ viết trong Quiz:', e);
        }
    }

    function quizWriterToggleOutline() {
        quizWriterState.outlineVisible = !quizWriterState.outlineVisible;
        const btn = document.getElementById('btnQuizWriterOutline');
        if (btn) {
            btn.innerHTML = `<span>👁️ Nét mờ: ${quizWriterState.outlineVisible ? 'Bật' : 'Tắt'}</span>`;
        }
        if (quizWriterState.writerInstance) {
            if (quizWriterState.outlineVisible) {
                quizWriterState.writerInstance.showOutline();
            } else {
                quizWriterState.writerInstance.hideOutline();
            }
        }
    }

    // ====================================================
    // 9.2 CHỨC NĂNG KIỂM TRA VIẾT CHỮ HÁN THEO GỢI Ý (WRITE TEST)
    // ====================================================
    const writeTestState = {
        questions: [],
        currentIndex: 0,
        score: 0,
        isAnswered: false,
        activeCharIndex: 0,
        chars: [],
        userStrokes: [],
        currentStroke: [],
        isDrawing: false,
        canvas: null,
        ctx: null,
        reviewWriterInstance: null,
        targetCharData: null,
        testResults: [],
        currentWordPassed: true
    };

    function initWriteTest() {
        const saved = StorageService.getSavedWords();
        const emptyState = document.getElementById('writeTestEmptyState');
        const playArea = document.getElementById('writeTestPlayArea');
        const resultArea = document.getElementById('writeTestResultArea');
        const scoreBadge = document.getElementById('writeTestScoreBadge');

        if (saved.length < 2) {
            if (emptyState) emptyState.classList.remove('hidden');
            if (playArea) playArea.classList.add('hidden');
            if (resultArea) resultArea.classList.add('hidden');
            if (scoreBadge) scoreBadge.classList.add('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        if (resultArea) resultArea.classList.add('hidden');
        if (playArea) playArea.classList.remove('hidden');
        if (scoreBadge) scoreBadge.classList.remove('hidden');

        // Lấy ngẫu nhiên từ 3 đến 8 từ đã lưu để tạo bài kiểm tra
        const questionCount = Math.min(Math.max(saved.length, 3), 8);
        writeTestState.questions = shuffleArray(saved).slice(0, questionCount);
        writeTestState.currentIndex = 0;
        writeTestState.score = 0;
        writeTestState.testResults = [];

        updateWriteTestScoreBadge();
        initWriteTestCanvas();
        renderWriteTestCurrentQuestion();
    }

    function updateWriteTestScoreBadge() {
        const scoreText = document.getElementById('writeTestScoreText');
        const totalText = document.getElementById('writeTestTotalText');
        if (scoreText) scoreText.innerText = writeTestState.score;
        if (totalText) totalText.innerText = writeTestState.questions.length;
    }

    function initWriteTestCanvas() {
        const canvas = document.getElementById('writeTestCanvas');
        if (!canvas) return;

        writeTestState.canvas = canvas;
        writeTestState.ctx = canvas.getContext('2d');

        // Thiết lập kích thước DPR chống mờ nét
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 260;
        const height = rect.height || 260;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        writeTestState.ctx.scale(dpr, dpr);

        function getPos(e) {
            const r = canvas.getBoundingClientRect();
            return {
                x: e.clientX - r.left,
                y: e.clientY - r.top
            };
        }

        function startDrawing(e) {
            if (writeTestState.isAnswered) return;
            writeTestState.isDrawing = true;
            try {
                canvas.setPointerCapture(e.pointerId);
            } catch (err) {}

            const pos = getPos(e);
            writeTestState.currentStroke = [pos];

            const ctx = writeTestState.ctx;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }

        function draw(e) {
            if (!writeTestState.isDrawing) return;
            const pos = getPos(e);
            writeTestState.currentStroke.push(pos);

            const ctx = writeTestState.ctx;
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }

        function stopDrawing(e) {
            if (!writeTestState.isDrawing) return;
            writeTestState.isDrawing = false;
            try {
                canvas.releasePointerCapture(e.pointerId);
            } catch (err) {}

            if (writeTestState.currentStroke.length > 0) {
                writeTestState.userStrokes.push(writeTestState.currentStroke);
                writeTestState.currentStroke = [];
                updateWriteTestStrokeCounter();
            }
        }

        canvas.onpointerdown = startDrawing;
        canvas.onpointermove = draw;
        canvas.onpointerup = stopDrawing;
        canvas.onpointercancel = stopDrawing;
    }

    function updateWriteTestStrokeCounter() {
        const countEl = document.getElementById('writeTestCurrentStrokesCount');
        if (countEl) countEl.innerText = writeTestState.userStrokes.length;
    }

    function clearWriteTestCanvas() {
        if (!writeTestState.canvas || !writeTestState.ctx) return;
        writeTestState.userStrokes = [];
        writeTestState.currentStroke = [];
        const rect = writeTestState.canvas.getBoundingClientRect();
        const width = rect.width || 260;
        const height = rect.height || 260;
        writeTestState.ctx.clearRect(0, 0, width, height);
        updateWriteTestStrokeCounter();
    }

    function undoWriteTestStroke() {
        if (writeTestState.isAnswered) return;
        if (writeTestState.userStrokes.length === 0) return;
        writeTestState.userStrokes.pop();
        redrawWriteTestCanvas();
        updateWriteTestStrokeCounter();
    }

    function redrawWriteTestCanvas() {
        if (!writeTestState.canvas || !writeTestState.ctx) return;
        const rect = writeTestState.canvas.getBoundingClientRect();
        const width = rect.width || 260;
        const height = rect.height || 260;
        const ctx = writeTestState.ctx;

        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        writeTestState.userStrokes.forEach(stroke => {
            if (stroke.length === 0) return;
            ctx.beginPath();
            ctx.moveTo(stroke[0].x, stroke[0].y);
            for (let i = 1; i < stroke.length; i++) {
                ctx.lineTo(stroke[i].x, stroke[i].y);
            }
            ctx.stroke();
        });
    }

    function renderWriteTestCurrentQuestion() {
        writeTestState.isAnswered = false;
        writeTestState.currentWordPassed = true;
        const q = writeTestState.questions[writeTestState.currentIndex];
        const total = writeTestState.questions.length;

        const progressText = document.getElementById('writeTestProgressText');
        if (progressText) progressText.innerText = `Câu ${writeTestState.currentIndex + 1} / ${total}`;

        const progressBar = document.getElementById('writeTestProgressBar');
        if (progressBar) progressBar.style.width = `${((writeTestState.currentIndex + 1) / total) * 100}%`;

        // Ẩn hộp kết quả câu trước
        const feedbackBox = document.getElementById('writeTestFeedbackBox');
        if (feedbackBox) feedbackBox.classList.add('hidden');

        // Hiển thị gợi ý đề bài (Pinyin + Nghĩa, ẩn chữ Hán)
        const promptPinyin = document.getElementById('writeTestPromptPinyin');
        const promptMeaning = document.getElementById('writeTestPromptMeaning');
        const charCountHint = document.getElementById('writeTestCharCountHint');
        const speakBtn = document.getElementById('btnWriteTestSpeak');

        const pinyin = DictionaryService.computeFullPinyin(q.word) || q.pinyin || '';
        const meaning = q.meaning || DictionaryService.lookupDefaultMeaning(q.word) || '';

        if (promptPinyin) promptPinyin.innerText = pinyin || 'Chưa có Pinyin';
        if (promptMeaning) promptMeaning.innerText = meaning ? `Nghĩa: ${meaning}` : 'Chưa có nghĩa';

        // Tách chữ Hán của từ đang kiểm tra
        writeTestState.chars = DictionaryService.extractHanzi(q.word);
        if (writeTestState.chars.length === 0) {
            writeTestState.chars = ['你'];
        }

        if (charCountHint) {
            charCountHint.innerText = `Gồm ${writeTestState.chars.length} chữ Hán`;
        }

        if (speakBtn) {
            speakBtn.onclick = () => AudioService.speak(q.word);
        }

        // Hiện nút Nộp bài
        const submitBtn = document.getElementById('btnWriteTestSubmit');
        if (submitBtn) {
            submitBtn.classList.remove('hidden');
            submitBtn.innerText = '✅ Xong - Kiểm tra nét viết';
        }

        renderWriteTestCharTabs();
        setupWriteTestChar(0);
    }

    function renderWriteTestCharTabs() {
        const wrapper = document.getElementById('writeTestCharTabsWrapper');
        const container = document.getElementById('writeTestCharTabs');
        if (!wrapper || !container) return;

        if (writeTestState.chars.length <= 1) {
            wrapper.classList.add('hidden');
            return;
        }

        wrapper.classList.remove('hidden');
        container.innerHTML = '';

        writeTestState.chars.forEach((c, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            const isActive = idx === writeTestState.activeCharIndex;
            btn.className = `px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`;
            btn.innerText = `Chữ ${idx + 1}`;
            btn.onclick = () => {
                if (writeTestState.activeCharIndex !== idx) {
                    setupWriteTestChar(idx);
                }
            };
            container.appendChild(btn);
        });
    }

    async function setupWriteTestChar(idx) {
        writeTestState.activeCharIndex = idx;
        writeTestState.isAnswered = false;

        const label = document.getElementById('writeTestActiveCharIndexLabel');
        if (label) {
            label.innerText = `${idx + 1} / ${writeTestState.chars.length}`;
        }

        renderWriteTestCharTabs();
        clearWriteTestCanvas();

        const feedbackBox = document.getElementById('writeTestFeedbackBox');
        if (feedbackBox) feedbackBox.classList.add('hidden');

        const reviewWriterEl = document.getElementById('writeTestReviewWriter');
        if (reviewWriterEl) {
            reviewWriterEl.classList.add('hidden');
            reviewWriterEl.innerHTML = '';
        }

        const char = writeTestState.chars[idx];
        writeTestState.targetCharData = null;

        if (typeof HanziWriter !== 'undefined') {
            try {
                const data = await HanziWriter.loadCharacterData(char);
                writeTestState.targetCharData = data;
            } catch (e) {
                console.warn(`Chưa tải được dữ liệu nét cho "${char}":`, e);
            }
        }
    }

    function handleWriteTestSubmit() {
        if (writeTestState.userStrokes.length === 0) {
            showToast('Vui lòng dùng chuột hoặc ngón tay viết chữ vào ô Mễ Tự Cách trước khi ấn Xong nhé! ✍️');
            return;
        }

        writeTestState.isAnswered = true;
        const currentChar = writeTestState.chars[writeTestState.activeCharIndex];
        const currentPinyin = DictionaryService.computeFullPinyin(currentChar);
        const userStrokesCount = writeTestState.userStrokes.length;
        const targetStrokesCount = (writeTestState.targetCharData && writeTestState.targetCharData.strokes)
            ? writeTestState.targetCharData.strokes.length
            : 0;

        const feedbackBox = document.getElementById('writeTestFeedbackBox');
        const badge = document.getElementById('writeTestResultBadge');
        const correctDisplay = document.getElementById('writeTestCorrectDisplay');
        const correctSub = document.getElementById('writeTestCorrectSub');
        const analysisText = document.getElementById('writeTestAnalysisText');

        if (correctDisplay) {
            correctDisplay.innerHTML = `<span class="text-3xl text-slate-900">${escapeHtml(currentChar)}</span> <span class="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">${escapeHtml(currentPinyin)}</span>`;
        }

        if (correctSub) {
            correctSub.innerText = `Chữ chuẩn có ${targetStrokesCount} nét • Bạn đã vẽ ${userStrokesCount} nét`;
        }

        const diff = Math.abs(userStrokesCount - targetStrokesCount);
        let isCorrect = false;

        if (targetStrokesCount > 0 && userStrokesCount === targetStrokesCount) {
            isCorrect = true;
            if (badge) {
                badge.className = 'text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300';
                badge.innerText = 'Xuất sắc! Chuẩn số nét 🎉';
            }
            if (analysisText) {
                analysisText.innerHTML = `Bạn đã vẽ <strong>đúng chuẩn ${targetStrokesCount}/${targetStrokesCount} nét</strong> của chữ "${currentChar}". Hãy đối chiếu hình thể với chữ chuẩn bên dưới!`;
            }
        } else if (diff <= 1) {
            isCorrect = true;
            if (badge) {
                badge.className = 'text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300';
                badge.innerText = 'Khá tốt! ⚠️';
            }
            if (analysisText) {
                const msg = userStrokesCount > targetStrokesCount ? 'vẽ thừa 1 nét' : 'vẽ thiếu 1 nét (hoặc nét bị dính)';
                analysisText.innerHTML = `Chữ "${currentChar}" chuẩn có <strong>${targetStrokesCount} nét</strong>, bạn vẽ <strong>${userStrokesCount} nét</strong> (${msg}). Hãy xem hoạt ảnh thứ tự nét chuẩn để ghi nhớ!`;
            }
        } else {
            isCorrect = false;
            writeTestState.currentWordPassed = false;
            if (badge) {
                badge.className = 'text-xs font-bold px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300';
                badge.innerText = 'Cần luyện thêm ✍️';
            }
            if (analysisText) {
                const diffMsg = userStrokesCount > targetStrokesCount ? `thừa ${diff} nét` : `thiếu ${diff} nét`;
                analysisText.innerHTML = `Chữ "${currentChar}" chuẩn có <strong>${targetStrokesCount} nét</strong>, bạn vẽ <strong>${userStrokesCount} nét</strong> (${diffMsg}). Xem thứ tự nét chuẩn để nắm quy tắc viết!`;
            }
        }

        if (feedbackBox) feedbackBox.classList.remove('hidden');

        // Hiển thị lớp HanziWriter chữ chuẩn
        showWriteTestTargetReview(currentChar);

        // Nút xem hoạt ảnh
        const animBtn = document.getElementById('btnWriteTestAnimateTarget');
        if (animBtn) {
            animBtn.onclick = () => writeTestAnimateTargetChar();
        }

        // Tự động cộng điểm nếu đúng cả từ
        if (isCorrect && writeTestState.currentWordPassed && writeTestState.activeCharIndex === writeTestState.chars.length - 1) {
            writeTestState.score++;
            updateWriteTestScoreBadge();
        }

        // Cập nhật nhãn nút tiếp theo
        const nextBtn = document.getElementById('btnWriteTestNextWord');
        if (nextBtn) {
            if (writeTestState.activeCharIndex + 1 < writeTestState.chars.length) {
                nextBtn.innerHTML = `<span>Viết chữ tiếp (${writeTestState.activeCharIndex + 2}/${writeTestState.chars.length}) →</span>`;
            } else {
                nextBtn.innerHTML = `<span>Câu tiếp theo →</span>`;
            }
        }
    }

    function showWriteTestTargetReview(char) {
        const reviewWriterEl = document.getElementById('writeTestReviewWriter');
        if (!reviewWriterEl || typeof HanziWriter === 'undefined') return;

        reviewWriterEl.innerHTML = '';
        reviewWriterEl.classList.remove('hidden');

        try {
            writeTestState.reviewWriterInstance = HanziWriter.create('writeTestReviewWriter', char, {
                width: 240,
                height: 240,
                padding: 16,
                showOutline: true,
                strokeAnimationSpeed: 1.2,
                strokeColor: '#2563eb',
                outlineColor: '#cbd5e1',
                onLoadCharDataSuccess: () => {
                    writeTestAnimateTargetChar();
                }
            });
        } catch (e) {
            console.error('Lỗi khi vẽ chữ đối chiếu:', e);
        }
    }

    function writeTestAnimateTargetChar() {
        if (!writeTestState.reviewWriterInstance) return;
        try {
            writeTestState.reviewWriterInstance.showOutline();
            writeTestState.reviewWriterInstance.animateCharacter();
        } catch (e) {}
    }

    function handleWriteTestNext() {
        if (writeTestState.activeCharIndex + 1 < writeTestState.chars.length) {
            setupWriteTestChar(writeTestState.activeCharIndex + 1);
            return;
        }

        const currentQ = writeTestState.questions[writeTestState.currentIndex];
        writeTestState.testResults.push({
            word: currentQ.word,
            pinyin: currentQ.pinyin,
            meaning: currentQ.meaning,
            isCorrect: writeTestState.currentWordPassed
        });

        writeTestState.currentIndex++;
        if (writeTestState.currentIndex < writeTestState.questions.length) {
            renderWriteTestCurrentQuestion();
        } else {
            showWriteTestResults();
        }
    }

    function showWriteTestResults() {
        const playArea = document.getElementById('writeTestPlayArea');
        const resultArea = document.getElementById('writeTestResultArea');
        if (playArea) playArea.classList.add('hidden');
        if (resultArea) resultArea.classList.remove('hidden');

        const total = writeTestState.questions.length;
        const score = writeTestState.score;
        const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

        const finalScore = document.getElementById('writeTestFinalScore');
        if (finalScore) finalScore.innerText = `${score}/${total}`;

        const finalAcc = document.getElementById('writeTestFinalAccuracy');
        if (finalAcc) finalAcc.innerText = `${accuracy}%`;

        const listEl = document.getElementById('writeTestResultList');
        if (listEl) {
            listEl.innerHTML = '';
            writeTestState.testResults.forEach(res => {
                const card = document.createElement('div');
                card.className = 'flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-left';
                card.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="hanzi-font text-2xl font-black text-slate-900">${escapeHtml(res.word)}</span>
                        <div>
                            <p class="text-xs font-bold text-blue-600">${escapeHtml(res.pinyin)}</p>
                            <p class="text-[11px] text-slate-500">${escapeHtml(res.meaning || '')}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold px-2 py-0.5 rounded-md ${res.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                            ${res.isCorrect ? '✓ Đạt' : '✕ Cần ôn'}
                        </span>
                        <button type="button" class="btn-test-retry px-2.5 py-1 text-xs font-bold bg-white text-blue-600 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition shadow-2xs cursor-pointer">
                            ✍️ Viết lại
                        </button>
                    </div>
                `;
                card.querySelector('.btn-test-retry').onclick = () => {
                    openQuizWriterModal(res.word, res.pinyin, res.meaning);
                };
                listEl.appendChild(card);
            });
        }
    }

    /**
     * Tự động chuẩn hóa và cập nhật Pinyin chuẩn từ bộ từ điển
     * cho các từ đã lưu trong LocalStorage nếu trước đó bị lưu sai thanh điệu
     */
    function healSavedWords() {
        try {
            const list = StorageService.getSavedWords();
            let hasChanges = false;
            list.forEach(item => {
                if (item.word && DictionaryService.DICTIONARY_BY_WORD && DictionaryService.DICTIONARY_BY_WORD[item.word]) {
                    const curated = DictionaryService.DICTIONARY_BY_WORD[item.word];
                    if (curated.pinyin && item.pinyin !== curated.pinyin) {
                        item.pinyin = curated.pinyin;
                        hasChanges = true;
                    }
                    if (!item.meaning && curated.meaning) {
                        item.meaning = curated.meaning;
                        hasChanges = true;
                    }
                }
            });
            if (hasChanges) {
                localStorage.setItem(StorageService.STORAGE_KEY, JSON.stringify(list));
            }
        } catch (e) {
            console.error('Lỗi khi đồng bộ từ vựng chuẩn:', e);
        }
    }

    // ----------------------------------------------------
    // 10. KHỞI TẠO ỨNG DỤNG (INITIALIZATION)
    // ----------------------------------------------------
    function initApp() {
        // Đồng bộ và sửa các từ vựng đã lưu trong cache cũ
        healSavedWords();

        // 1. Khởi tạo Audio Service
        AudioService.init();

        // 2. Tải từ mặc định ban đầu: "你好"
        loadWord('你好');
        updateSavedBadgeCount();

        // 3. Sự kiện Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
        });

        // 4. Sự kiện ô tìm kiếm & Bộ gõ Live IME
        const inputEl = document.getElementById('userInput');
        let isComposing = false;

        if (inputEl) {
            inputEl.addEventListener('focus', () => {
                if (typeof HanziWriterService !== 'undefined') {
                    HanziWriterService.stopAnimation();
                }
            });

            inputEl.addEventListener('compositionstart', () => {
                isComposing = true;
            });

            inputEl.addEventListener('compositionend', (e) => {
                isComposing = false;
                scheduleDebouncedPinyin(e.target.value);
            });

            inputEl.addEventListener('input', (e) => {
                if (typeof HanziWriterService !== 'undefined') {
                    HanziWriterService.stopAnimation();
                }
                if (isComposing) return;
                scheduleDebouncedPinyin(e.target.value);
            });

            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(state.debounceTimer);
                    handleSearch();
                }
            });
        }

        function scheduleDebouncedPinyin(text) {
            clearTimeout(state.debounceTimer);
            const val = text.trim();
            if (!val) {
                const cand = document.getElementById('candidateContainer');
                if (cand) cand.classList.add('hidden');
                return;
            }
            if (!DictionaryService.isHanzi(val)) {
                state.debounceTimer = setTimeout(() => {
                    const clean = DictionaryService.normalizePinyinInput(val);
                    const candidates = DictionaryService.lookupOffline(clean);
                    if (candidates.length > 0) {
                        renderCandidates(candidates);
                    }
                }, 150);
            }
        }

        const btnSearch = document.getElementById('btnSearch');
        if (btnSearch) {
            btnSearch.addEventListener('click', () => {
                clearTimeout(state.debounceTimer);
                handleSearch();
            });
        }

        // 5. Nút từ gợi ý nhanh
        document.querySelectorAll('.quick-btn').forEach(b => {
            b.addEventListener('click', () => {
                const w = b.getAttribute('data-word');
                if (inputEl) inputEl.value = w;
                loadWord(w);
            });
        });

        // 6. Phát âm toàn bộ cụm từ & từng ký tự
        const btnAudioWord = document.getElementById('btnAudioWord');
        if (btnAudioWord) {
            btnAudioWord.addEventListener('click', () => {
                AudioService.speak(state.currentWordObj.word);
            });
        }

        const btnAudioChar = document.getElementById('btnAudioChar');
        if (btnAudioChar) {
            btnAudioChar.addEventListener('click', () => {
                AudioService.speak(state.currentChar);
            });
        }

        // 7. Ô nhập nghĩa: Mở khóa chỉnh sửa trực tiếp
        const inputMeaningEl = document.getElementById('inputMeaning');
        if (inputMeaningEl) {
            inputMeaningEl.addEventListener('change', (e) => {
                const newMeaning = e.target.value.trim();
                state.currentWordObj.meaning = newMeaning;
                if (StorageService.isSaved(state.currentWordObj.word)) {
                    StorageService.updateMeaning(state.currentWordObj.word, newMeaning);
                }
            });
        }

        // 8. Lưu cụm từ
        const btnSaveWord = document.getElementById('btnSaveWord');
        if (btnSaveWord) {
            btnSaveWord.addEventListener('click', handleSaveCurrentWord);
        }

        // 9. Nút Chạy lại nét & Tự tập viết
        const btnReplay = document.getElementById('btnReplay');
        if (btnReplay) {
            btnReplay.addEventListener('click', () => {
                resetQuizButtonUI();
                if (typeof HanziWriterService !== 'undefined') {
                    HanziWriterService.stopAnimation();
                    HanziWriterService.animate();
                }
            });
        }

        const btnQuiz = document.getElementById('btnQuiz');
        if (btnQuiz) {
            btnQuiz.addEventListener('click', toggleInteractiveWritingQuiz);
        }

        // 10. Nút Bật/Tắt nét mờ
        const btnToggleOutline = document.getElementById('btnToggleOutline');
        if (btnToggleOutline) {
            btnToggleOutline.addEventListener('click', () => {
                if (typeof HanziWriterService === 'undefined') return;
                const isVisible = HanziWriterService.toggleOutline();
                const outlineText = document.getElementById('outlineStatusText');
                if (outlineText) {
                    outlineText.innerText = isVisible ? 'Ẩn nét mờ' : 'Hiện nét mờ';
                }
            });
        }

        // 11. Các nút tốc độ nét
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.speed-btn').forEach(b => {
                    b.classList.remove('bg-white', 'text-blue-600', 'shadow-2xs');
                    b.classList.add('text-slate-600');
                });
                btn.classList.add('bg-white', 'text-blue-600', 'shadow-2xs');
                btn.classList.remove('text-slate-600');

                const speed = parseFloat(btn.getAttribute('data-speed')) || 1;
                state.strokeSpeed = speed;
                if (typeof HanziWriterService !== 'undefined') {
                    HanziWriterService.setSpeed(speed);
                }
            });
        });

        // 12. Tab 2 Actions (Từ đã lưu)
        const btnAddSample = document.getElementById('btnAddSampleWords');
        if (btnAddSample) {
            btnAddSample.addEventListener('click', loadSampleWords);
        }

        const btnClearSaved = document.getElementById('btnClearAllSaved');
        if (btnClearSaved) {
            btnClearSaved.addEventListener('click', () => {
                if (confirm('Bạn có chắc muốn xóa tất cả từ đã lưu trong Sổ từ vựng?')) {
                    StorageService.clearAll();
                    renderSavedWordsList();
                    updateSaveButtonUI();
                    showToast('Đã xóa toàn bộ Sổ từ vựng!');
                }
            });
        }

        // 13. Tab 3 Actions (Quiz Ôn tập)
        const btnQuizNext = document.getElementById('btnQuizNext');
        if (btnQuizNext) btnQuizNext.addEventListener('click', handleQuizNext);

        const btnQuizRestart = document.getElementById('btnQuizRestart');
        if (btnQuizRestart) btnQuizRestart.addEventListener('click', initReviewQuiz);

        const btnQuizLoadSample = document.getElementById('btnQuizLoadSample');
        if (btnQuizLoadSample) {
            btnQuizLoadSample.addEventListener('click', () => {
                loadSampleWords();
                initReviewQuiz();
            });
        }

        // 13.1 Quiz Writer Modal Actions
        const btnQuizCloseWriter = document.getElementById('btnQuizCloseWriter');
        if (btnQuizCloseWriter) btnQuizCloseWriter.addEventListener('click', closeQuizWriterModal);

        const btnQuizResume = document.getElementById('btnQuizResume');
        if (btnQuizResume) btnQuizResume.addEventListener('click', closeQuizWriterModal);

        const btnQuizWriterAnimate = document.getElementById('btnQuizWriterAnimate');
        if (btnQuizWriterAnimate) btnQuizWriterAnimate.addEventListener('click', quizWriterAnimate);

        const btnQuizWriterStartQuiz = document.getElementById('btnQuizWriterStartQuiz');
        if (btnQuizWriterStartQuiz) btnQuizWriterStartQuiz.addEventListener('click', quizWriterStartQuiz);

        const btnQuizWriterOutline = document.getElementById('btnQuizWriterOutline');
        if (btnQuizWriterOutline) btnQuizWriterOutline.addEventListener('click', quizWriterToggleOutline);

        const btnQuizGoToPracticeTab = document.getElementById('btnQuizGoToPracticeTab');
        if (btnQuizGoToPracticeTab) {
            btnQuizGoToPracticeTab.addEventListener('click', () => {
                const targetWord = quizWriterState.word;
                const targetPin = quizWriterState.pinyin;
                const targetMean = quizWriterState.meaning;
                closeQuizWriterModal();
                switchTab('practice');
                loadWord(targetWord, targetPin, targetMean);
            });
        }

        const modalOverlay = document.getElementById('quizWritingModal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeQuizWriterModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const m = document.getElementById('quizWritingModal');
                if (m && !m.classList.contains('hidden')) {
                    closeQuizWriterModal();
                }
            }
        });

        // 13.2 Tab 4 Actions (Kiểm tra viết theo gợi ý - Write Test)
        const btnWriteTestLoadSample = document.getElementById('btnWriteTestLoadSample');
        if (btnWriteTestLoadSample) {
            btnWriteTestLoadSample.addEventListener('click', () => {
                loadSampleWords();
                initWriteTest();
            });
        }

        const btnWriteTestUndo = document.getElementById('btnWriteTestUndo');
        if (btnWriteTestUndo) btnWriteTestUndo.addEventListener('click', undoWriteTestStroke);

        const btnWriteTestClear = document.getElementById('btnWriteTestClear');
        if (btnWriteTestClear) btnWriteTestClear.addEventListener('click', clearWriteTestCanvas);

        const btnWriteTestSubmit = document.getElementById('btnWriteTestSubmit');
        if (btnWriteTestSubmit) btnWriteTestSubmit.addEventListener('click', handleWriteTestSubmit);

        const btnWriteTestNextWord = document.getElementById('btnWriteTestNextWord');
        if (btnWriteTestNextWord) btnWriteTestNextWord.addEventListener('click', handleWriteTestNext);

        const btnWriteTestMarkCorrect = document.getElementById('btnWriteTestMarkCorrect');
        if (btnWriteTestMarkCorrect) {
            btnWriteTestMarkCorrect.addEventListener('click', () => {
                writeTestState.score++;
                updateWriteTestScoreBadge();
                showToast('Đã ghi nhận Viết đúng! (+1 điểm) ⭐');
                handleWriteTestNext();
            });
        }

        const btnWriteTestMarkWrong = document.getElementById('btnWriteTestMarkWrong');
        if (btnWriteTestMarkWrong) {
            btnWriteTestMarkWrong.addEventListener('click', () => {
                showToast('Đã ghi nhận Viết sai. Hãy chăm chỉ luyện tập nhé!');
                handleWriteTestNext();
            });
        }

        const btnWriteTestRestart = document.getElementById('btnWriteTestRestart');
        if (btnWriteTestRestart) btnWriteTestRestart.addEventListener('click', initWriteTest);

        // 14. Đăng ký sự kiện storage thay đổi để đồng bộ badge
        window.addEventListener('saved-words-changed', () => {
            updateSavedBadgeCount();
        });
    }

    // Đưa các hàm cần thiết ra window
    window.switchTab = switchTab;
    window.loadWord = loadWord;
    window.renderCharacterTabs = renderCharacterTabs;
    window.openQuizWriterModal = openQuizWriterModal;
    window.initWriteTest = initWriteTest;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();
