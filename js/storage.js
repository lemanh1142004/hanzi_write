/**
 * HanziLab - Storage Service
 * Quản lý Sổ từ vựng cá nhân & Lịch sử tra cứu qua LocalStorage
 * Đối tượng từ vựng lưu trữ: { word, pinyin, meaning, date }
 */

function formatCurrentDate() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

const StorageService = {
    KEYS: {
        SAVED_WORDS: 'hanzilab_saved_word_objects_v2',
        HISTORY: 'hanzilab_search_history'
    },

    MAX_HISTORY: 30,

    /**
     * Lấy toàn bộ danh sách đối tượng từ đã lưu
     * @returns {Array<{word: string, pinyin: string, meaning: string, date: string}>}
     */
    getSavedWords() {
        try {
            const data = localStorage.getItem(this.KEYS.SAVED_WORDS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Lỗi khi đọc từ đã lưu từ LocalStorage:', e);
            return [];
        }
    },

    /**
     * Lưu một đối tượng từ vựng (cụm từ hoặc chữ Hán)
     * @param {Object} wordObj
     * @param {string} wordObj.word - Cụm từ hoặc chữ Hán (VD: '你好', '汉语')
     * @param {string} wordObj.pinyin - Phiên âm đầy đủ (VD: 'nǐ hǎo', 'hàn yǔ')
     * @param {string} [wordObj.meaning] - Nghĩa tùy chọn (VD: 'Xin chào')
     * @param {string} [wordObj.date] - Ngày lưu (VD: '06/09/2026')
     */
    saveWord(wordObj) {
        if (!wordObj || !wordObj.word) return false;

        let list = this.getSavedWords();
        const cleanWord = wordObj.word.trim();
        const existingIndex = list.findIndex(w => w.word === cleanWord);

        const newEntry = {
            word: cleanWord,
            pinyin: wordObj.pinyin ? wordObj.pinyin.trim() : '',
            meaning: wordObj.meaning ? wordObj.meaning.trim() : '',
            date: wordObj.date || formatCurrentDate()
        };

        if (existingIndex >= 0) {
            list[existingIndex] = newEntry;
        } else {
            list.unshift(newEntry);
        }

        try {
            localStorage.setItem(this.KEYS.SAVED_WORDS, JSON.stringify(list));
            this._notify('saved-words-changed', list);
            return true;
        } catch (e) {
            console.error('Lỗi khi lưu vào LocalStorage:', e);
            return false;
        }
    },

    /**
     * Xóa một cụm từ khỏi danh sách đã lưu
     * @param {string} word
     */
    removeWord(word) {
        let list = this.getSavedWords().filter(w => w.word !== word);
        localStorage.setItem(this.KEYS.SAVED_WORDS, JSON.stringify(list));
        this._notify('saved-words-changed', list);
    },

    /**
     * Cập nhật nghĩa cho từ đã lưu
     */
    updateMeaning(word, newMeaning) {
        let list = this.getSavedWords();
        const item = list.find(w => w.word === word);
        if (item) {
            item.meaning = (newMeaning || '').trim();
            localStorage.setItem(this.KEYS.SAVED_WORDS, JSON.stringify(list));
            this._notify('saved-words-changed', list);
        }
    },

    /**
     * Kiểm tra xem cụm từ đã được lưu hay chưa
     * @param {string} word
     * @returns {boolean}
     */
    isSaved(word) {
        if (!word) return false;
        return this.getSavedWords().some(w => w.word === word.trim());
    },

    /**
     * Lấy thông tin chi tiết một từ đã lưu
     */
    getWord(word) {
        if (!word) return null;
        return this.getSavedWords().find(w => w.word === word.trim()) || null;
    },

    /**
     * Xóa tất cả các từ đã lưu
     */
    clearAll() {
        localStorage.removeItem(this.KEYS.SAVED_WORDS);
        this._notify('saved-words-changed', []);
    },

    // --------------------------------------------------
    // Quản lý Lịch sử tra cứu (History)
    // --------------------------------------------------
    getHistory() {
        try {
            const data = localStorage.getItem(this.KEYS.HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    addHistory(term, word, pinyin) {
        if (!term || !word) return;
        let history = this.getHistory().filter(item => item.word !== word);

        history.unshift({
            term,
            word,
            pinyin: pinyin || '',
            date: formatCurrentDate()
        });

        if (history.length > this.MAX_HISTORY) {
            history = history.slice(0, this.MAX_HISTORY);
        }

        try {
            localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
        } catch (e) {}
    },

    clearHistory() {
        localStorage.removeItem(this.KEYS.HISTORY);
    },

    _notify(eventName, data) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
        }
    }
};

if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
}
