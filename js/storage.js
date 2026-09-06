/**
 * HanziLab - Storage Service
 * Quản lý Sổ từ vựng cá nhân qua LocalStorage
 * Schema đối tượng từ vựng: { word: string, pinyin: string, meaning: string, date: string }
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'hanzilab_saved_word_objects_v2';

    function formatDate(timestamp = Date.now()) {
        const d = new Date(timestamp);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    const StorageService = {
        STORAGE_KEY,
        formatDate,

        /**
         * Lấy toàn bộ danh sách đối tượng từ đã lưu
         * @returns {Array<{word: string, pinyin: string, meaning: string, date: string}>}
         */
        getSavedWords() {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.error('Lỗi khi đọc từ đã lưu từ LocalStorage:', e);
                return [];
            }
        },

        /**
         * Lưu hoặc cập nhật một đối tượng từ vựng
         * @param {Object} wordObj
         * @param {string} wordObj.word - Cụm từ hoặc chữ Hán
         * @param {string} [wordObj.pinyin] - Phiên âm đầy đủ
         * @param {string} [wordObj.meaning] - Nghĩa tiếng Việt
         * @param {string} [wordObj.date] - Ngày lưu (VD: '06/09/2026')
         * @returns {boolean}
         */
        saveWord(wordObj) {
            if (!wordObj || !wordObj.word) return false;

            const list = this.getSavedWords();
            const cleanWord = String(wordObj.word).trim();
            if (!cleanWord) return false;

            const existingIndex = list.findIndex(w => w.word === cleanWord);

            const newEntry = {
                word: cleanWord,
                pinyin: wordObj.pinyin ? String(wordObj.pinyin).trim() : '',
                meaning: wordObj.meaning ? String(wordObj.meaning).trim() : '',
                date: wordObj.date || formatDate()
            };

            if (existingIndex >= 0) {
                // Nếu đã có, giữ lại ngày lưu cũ trừ khi được truyền vào cụ thể
                newEntry.date = wordObj.date || list[existingIndex].date || formatDate();
                list[existingIndex] = newEntry;
            } else {
                list.unshift(newEntry);
            }

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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
            if (!word) return;
            const cleanWord = String(word).trim();
            const list = this.getSavedWords().filter(w => w.word !== cleanWord);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
                this._notify('saved-words-changed', list);
            } catch (e) {
                console.error('Lỗi khi xóa từ khỏi LocalStorage:', e);
            }
        },

        /**
         * Cập nhật nhanh nghĩa cho từ đã lưu
         * @param {string} word
         * @param {string} newMeaning
         */
        updateMeaning(word, newMeaning) {
            if (!word) return false;
            const cleanWord = String(word).trim();
            const list = this.getSavedWords();
            const item = list.find(w => w.word === cleanWord);
            if (item) {
                item.meaning = (newMeaning || '').trim();
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
                    this._notify('saved-words-changed', list);
                    return true;
                } catch (e) {
                    console.error('Lỗi khi cập nhật nghĩa trong LocalStorage:', e);
                }
            }
            return false;
        },

        /**
         * Kiểm tra xem cụm từ đã được lưu hay chưa
         * @param {string} word
         * @returns {boolean}
         */
        isSaved(word) {
            if (!word) return false;
            const cleanWord = String(word).trim();
            return this.getSavedWords().some(w => w.word === cleanWord);
        },

        /**
         * Lấy chi tiết một từ đã lưu
         * @param {string} word
         * @returns {Object|null}
         */
        getWord(word) {
            if (!word) return null;
            const cleanWord = String(word).trim();
            return this.getSavedWords().find(w => w.word === cleanWord) || null;
        },

        /**
         * Xóa toàn bộ danh sách từ đã lưu
         */
        clearAll() {
            try {
                localStorage.removeItem(STORAGE_KEY);
                this._notify('saved-words-changed', []);
            } catch (e) {
                console.error('Lỗi khi xóa sạch LocalStorage:', e);
            }
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
})();
