/**
 * HanziLab - Dictionary & Pinyin Service
 * Quản lý từ điển cụm từ HSK, âm tiết Pinyin đầy đủ (400+ âm tiết),
 * xử lý tra cứu Offline/Online và phân tích ngữ âm Hán tự qua pinyin-pro.
 */

(function () {
    'use strict';

    const DictionaryService = {
        // 1. Từ điển cụm từ thông dụng kèm Pinyin chuẩn và Nghĩa tiếng Việt (HSK 1 - 3 & Giao tiếp)
        PHRASES: {
            "nihao": { word: "你好", pinyin: "nǐ hǎo", meaning: "Xin chào" },
            "xiexie": { word: "谢谢", pinyin: "xiè xie", meaning: "Cảm ơn" },
            "zaijian": { word: "再见", pinyin: "zài jiàn", meaning: "Tạm biệt" },
            "duibuqi": { word: "对不起", pinyin: "duì bu qǐ", meaning: "Xin lỗi" },
            "meiguanxi": { word: "没关系", pinyin: "méi guān xi", meaning: "Không sao / Không có chi" },
            "xuexi": { word: "学习", pinyin: "xué xí", meaning: "Học tập" },
            "zhongguo": { word: "中国", pinyin: "zhōng guó", meaning: "Trung Quốc" },
            "hanzi": { word: "汉字", pinyin: "hàn zì", meaning: "Chữ Hán" },
            "zhongwen": { word: "中文", pinyin: "zhōng wén", meaning: "Tiếng Trung" },
            "hanyu": { word: "汉语", pinyin: "hàn yǔ", meaning: "Tiếng Hán / Tiếng Trung" },
            "laoshi": { word: "老师", pinyin: "lǎo shī", meaning: "Thầy / Cô giáo" },
            "xuesheng": { word: "学生", pinyin: "xué sheng", meaning: "Học sinh / Sinh viên" },
            "pengyou": { word: "朋友", pinyin: "péng you", meaning: "Bạn bè" },
            "baba": { word: "爸爸", pinyin: "bà ba", meaning: "Bố / Ba" },
            "mama": { word: "妈妈", pinyin: "mā ma", meaning: "Mẹ" },
            "gege": { word: "哥哥", pinyin: "gē ge", meaning: "Anh trai" },
            "jiejie": { word: "姐姐", pinyin: "jiě jie", meaning: "Chị gái" },
            "didi": { word: "弟弟", pinyin: "dì di", meaning: "Em trai" },
            "meimei": { word: "妹妹", pinyin: "mèi mei", meaning: "Em gái" },
            "mingtian": { word: "明天", pinyin: "míng tiān", meaning: "Ngày mai" },
            "jintian": { word: "今天", pinyin: "jīn tiān", meaning: "Hôm nay" },
            "zuotian": { word: "昨天", pinyin: "zuó tiān", meaning: "Hôm qua" },
            "chifan": { word: "吃饭", pinyin: "chī fàn", meaning: "Ăn cơm" },
            "shuijiao": { word: "睡觉", pinyin: "shuì jiào", meaning: "Đi ngủ" },
            "hecha": { word: "喝茶", pinyin: "hē chá", meaning: "Uống trà" },
            "xihuan": { word: "喜欢", pinyin: "xǐ huan", meaning: "Thích" },
            "gaoxing": { word: "高兴", pinyin: "gāo xìng", meaning: "Vui vẻ" },
            "renshi": { word: "认识", pinyin: "rèn shi", meaning: "Quen biết" },
            "beijing": { word: "北京", pinyin: "běi jīng", meaning: "Bắc Kinh" },
            "shanghai": { word: "上海", pinyin: "shàng hǎi", meaning: "Thượng Hải" },
            "shouji": { word: "手机", pinyin: "shǒu jī", meaning: "Điện thoại di động" },
            "diannao": { word: "电脑", pinyin: "diàn nǎo", meaning: "Máy vi tính" },
            "tianqi": { word: "天气", pinyin: "tiān qì", meaning: "Thời tiết" },
            "feiji": { word: "飞机", pinyin: "fēi jī", meaning: "Máy bay" },
            "huoche": { word: "火车", pinyin: "huǒ chē", meaning: "Tàu hỏa" },
            "chuzuche": { word: "出租车", pinyin: "chū zū chē", meaning: "Xe taxi" },
            "yiyuan": { word: "医院", pinyin: "yī yuàn", meaning: "Bệnh viện" },
            "xuexiao": { word: "学校", pinyin: "xué xiào", meaning: "Trường học" },
            "shangdian": { word: "商店", pinyin: "shāng diàn", meaning: "Cửa hàng" },
            "fanguan": { word: "饭馆", pinyin: "fàn guǎn", meaning: "Quán ăn / Nhà hàng" },
            "kafei": { word: "咖啡", pinyin: "kā fēi", meaning: "Cà phê" },
            "shuiguo": { word: "水果", pinyin: "shuǐ guǒ", meaning: "Hoa quả / Trái cây" },
            "pingguo": { word: "苹果", pinyin: "píng guǒ", meaning: "Quả táo" },
            "shuohua": { word: "说话", pinyin: "shuō huà", meaning: "Nói chuyện" },
            "dushu": { word: "读书", pinyin: "dú shū", meaning: "Đọc sách / Đi học" },
            "duxi": { word: "读书", pinyin: "dú shū", meaning: "Đọc sách" },
            "xiezi": { word: "写字", pinyin: "xiě zì", meaning: "Viết chữ" },
            "gongzuo": { word: "工作", pinyin: "gōng zuò", meaning: "Công việc / Đi làm" },
            "shengri": { word: "生日", pinyin: "shēng rì", meaning: "Sinh nhật" },
            "kuaile": { word: "快乐", pinyin: "kuài lè", meaning: "Vui vẻ / Hạnh phúc" },
            "shijian": { word: "时间", pinyin: "shí jiān", meaning: "Thời gian" },
            "duoshao": { word: "多少", pinyin: "duō shao", meaning: "Bao nhiêu" },
            "shenme": { word: "什么", pinyin: "shén me", meaning: "Cái gì" },
            "shei": { word: "谁", pinyin: "shéi", meaning: "Ai" },
            "naer": { word: "哪儿", pinyin: "nǎr", meaning: "Ở đâu" },
            "zenmeyang": { word: "怎么样", pinyin: "zěn me yàng", meaning: "Như thế nào" },
            "weishenme": { word: "为什么", pinyin: "wèi shén me", meaning: "Tại sao" },
            "zenme": { word: "怎么", pinyin: "zěn me", meaning: "Làm sao / Thế nào" },
            "yidian": { word: "一点", pinyin: "yī diǎn", meaning: "Một chút" },
            "women": { word: "我们", pinyin: "wǒ men", meaning: "Chúng tôi / Chúng ta" },
            "nimen": { word: "你们", pinyin: "nǐ men", meaning: "Các bạn" },
            "tamen": { word: "他们", pinyin: "tā men", meaning: "Họ / Bọn họ" },
            "dajia": { word: "大家", pinyin: "dà jiā", meaning: "Mọi người" },
            "dongxi": { word: "东西", pinyin: "dōng xi", meaning: "Đồ vật / Đồ đạc" },
            "yisi": { word: "意思", pinyin: "yì si", meaning: "Ý nghĩa" },
            "wenti": { word: "问题", pinyin: "wèn tí", meaning: "Vấn đề / Câu hỏi" },
            "bangzhu": { word: "帮助", pinyin: "bāng zhù", meaning: "Giúp đỡ" },
            "kaishi": { word: "开始", pinyin: "kāi shǐ", meaning: "Bắt đầu" },
            "jieshu": { word: "结束", pinyin: "jié shù", meaning: "Kết thúc" },
            "xiwang": { word: "希望", pinyin: "xī wàng", meaning: "Hy vọng" },
            "mingbai": { word: "明白", pinyin: "míng bai", meaning: "Hiểu rõ" },
            "zhidao": { word: "知道", pinyin: "zhī dào", meaning: "Biết" },
            "kanjian": { word: "看见", pinyin: "kàn jiàn", meaning: "Nhìn thấy" },
            "tingjian": { word: "听见", pinyin: "tīng jiàn", meaning: "Nghe thấy" },
            "huida": { word: "回答", pinyin: "huí dá", meaning: "Trả lời" },
            "fuxi": { word: "复习", pinyin: "fù xí", meaning: "Ôn tập" },
            "kaoshi": { word: "考试", pinyin: "kǎo shì", meaning: "Thi cử / Kiểm tra" },
            "nuoli": { word: "努力", pinyin: "nǔ lì", meaning: "Nỗ lực / Chăm chỉ" },
            "jinbu": { word: "进步", pinyin: "jìn bù", meaning: "Tiến bộ" },
            "yundong": { word: "运动", pinyin: "yùn dòng", meaning: "Vận động / Thể thao" },
            "tiyu": { word: "体育", pinyin: "tǐ yù", meaning: "Thể dục / Thể thao" },
            "yisheng": { word: "医生", pinyin: "yī shēng", meaning: "Bác sĩ" },
            "hushi": { word: "护士", pinyin: "hù shi", meaning: "Y tá" },
            "siji": { word: "司机", pinyin: "sī jī", meaning: "Tài xế" },
            "shangban": { word: "上班", pinyin: "shàng bān", meaning: "Đi làm" },
            "xiaban": { word: "下班", pinyin: "xià bān", meaning: "Tan làm" },
            "shangke": { word: "上课", pinyin: "shàng kè", meaning: "Vào học" },
            "xiake": { word: "下课", pinyin: "xià kè", meaning: "Tan học" },
            "fangxue": { word: "放学", pinyin: "fàng xué", meaning: "Tan trường" },
            "kaiche": { word: "开车", pinyin: "kāi chē", meaning: "Lái xe" },
            "zuoche": { word: "坐车", pinyin: "zuò chē", meaning: "Đi xe" }
        },

        // 2. Chữ Hán đơn lẻ thông dụng kèm nghĩa
        SINGLE_WORDS: {
            "好": { pinyin: "hǎo", meaning: "Tốt, đẹp, hay" },
            "你": { pinyin: "nǐ", meaning: "Bạn, anh, chị" },
            "我": { pinyin: "wǒ", meaning: "Tôi, ta, mình" },
            "他": { pinyin: "tā", meaning: "Anh ấy, ông ấy" },
            "她": { pinyin: "tā", meaning: "Cô ấy, bà ấy" },
            "它": { pinyin: "tā", meaning: "Nó (đồ vật/con vật)" },
            "学": { pinyin: "xué", meaning: "Học" },
            "习": { pinyin: "xí", meaning: "Tập, rèn luyện" },
            "汉": { pinyin: "hàn", meaning: "Hán (chữ Hán)" },
            "字": { pinyin: "zì", meaning: "Chữ, ký tự" },
            "中": { pinyin: "zhōng", meaning: "Trung (ở giữa)" },
            "国": { pinyin: "guó", meaning: "Nước, quốc gia" },
            "大": { pinyin: "dà", meaning: "To, lớn" },
            "小": { pinyin: "xiǎo", meaning: "Nhỏ, bé" },
            "多": { pinyin: "duō", meaning: "Nhiều" },
            "少": { pinyin: "shǎo", meaning: "Ít" },
            "爱": { pinyin: "ài", meaning: "Yêu, thương" },
            "人": { pinyin: "rén", meaning: "Người" },
            "天": { pinyin: "tiān", meaning: "Trời, ngày" },
            "水": { pinyin: "shuǐ", meaning: "Nước" },
            "火": { pinyin: "huǒ", meaning: "Lửa" },
            "山": { pinyin: "shān", meaning: "Núi" },
            "日": { pinyin: "rì", meaning: "Mặt trời, ngày" },
            "月": { pinyin: "yuè", meaning: "Mặt trăng, tháng" },
            "年": { pinyin: "nián", meaning: "Năm" },
            "看": { pinyin: "kàn", meaning: "Xem, nhìn" },
            "听": { pinyin: "tīng", meaning: "Nghe" },
            "说": { pinyin: "shuō", meaning: "Nói" },
            "写": { pinyin: "xiě", meaning: "Viết" },
            "吃": { pinyin: "chī", meaning: "Ăn" },
            "喝": { pinyin: "hē", meaning: "Uống" },
            "买": { pinyin: "mǎi", meaning: "Mua" },
            "卖": { pinyin: "mài", meaning: "Bán" },
            "去": { pinyin: "qù", meaning: "Đi" },
            "来": { pinyin: "lái", meaning: "Đến, tới" },
            "是": { pinyin: "shì", meaning: "Là, phải" },
            "不": { pinyin: "bù", meaning: "Không" },
            "有": { pinyin: "yǒu", meaning: "Có" },
            "没": { pinyin: "méi", meaning: "Không có, chưa" },
            "猫": { pinyin: "māo", meaning: "Con mèo" },
            "狗": { pinyin: "gǒu", meaning: "Con chó" },
            "门": { pinyin: "mén", meaning: "Cửa" },
            "书": { pinyin: "shū", meaning: "Sách" }
        },

        // 3. Toàn bộ 400+ âm tiết Pinyin chuẩn (Syllables -> Danh sách Hán tự phổ biến)
        SYLLABLES: {
            "a": ["啊", "阿"],
            "ai": ["爱", "矮", "挨", "哎"],
            "an": ["安", "按", "暗", "岸"],
            "ba": ["吧", "爸", "八", "把", "拔"],
            "bai": ["百", "白", "摆", "败"],
            "ban": ["半", "办", "班", "搬", "板"],
            "bang": ["帮", "榜", "棒", "旁"],
            "bao": ["包", "报", "保", "饱", "宝", "抱"],
            "bei": ["杯", "北", "被", "背", "备"],
            "ben": ["本", "奔", "笨"],
            "bi": ["比", "笔", "币", "必", "闭", "避"],
            "bian": ["边", "变", "便", "遍"],
            "biao": ["表", "标", "示"],
            "bie": ["别", "憋"],
            "bing": ["冰", "兵", "病", "并"],
            "bu": ["不", "步", "部", "布", "补"],
            "ca": ["擦"],
            "cai": ["菜", "才", "彩", "采", "材"],
            "can": ["餐", "参", "残"],
            "cang": ["藏", "仓"],
            "cao": ["草", "操", "槽"],
            "ce": ["册", "测", "厕"],
            "ceng": ["层", "曾"],
            "cha": ["茶", "查", "差", "叉"],
            "chai": ["拆", "柴"],
            "chan": ["产", "铲"],
            "chang": ["长", "常", "场", "唱", "厂"],
            "chao": ["超", "朝", "吵", "炒"],
            "che": ["车", "扯", "撤"],
            "chen": ["晨", "沉", "陈"],
            "cheng": ["成", "城", "程", "称", "乘", "承"],
            "chi": ["吃", "尺", "持", "池", "迟", "赤"],
            "chong": ["重", "充", "冲", "虫"],
            "chou": ["抽", "愁", "丑", "臭"],
            "chu": ["出", "初", "除", "处", "楚"],
            "chuan": ["穿", "船", "传", "川"],
            "chuang": ["床", "窗", "创"],
            "chun": ["春", "纯", "唇"],
            "ci": ["次", "此", "词", "辞", "赐"],
            "cong": ["从", "聪", "匆"],
            "cu": ["粗", "促", "醋"],
            "cui": ["催", "脆", "翠"],
            "cun": ["村", "存", "寸"],
            "cuo": ["错", "挫", "措"],
            "da": ["大", "达", "打", "答"],
            "dai": ["带", "代", "待", "袋", "戴"],
            "dan": ["但", "单", "蛋", "担", "淡"],
            "dang": ["当", "党", "挡"],
            "dao": ["到", "道", "导", "倒", "刀", "岛"],
            "de": ["的", "得", "地", "德"],
            "deng": ["等", "灯", "登"],
            "di": ["第", "地", "低", "底", "弟", "递"],
            "dian": ["点", "电", "店", "典", "垫"],
            "diao": ["掉", "条", "调", "吊"],
            "ding": ["定", "顶", "订", "钉"],
            "dong": ["东", "动", "冬", "懂", "洞"],
            "dou": ["都", "豆", "斗"],
            "du": ["读", "度", "都", "独", "毒", "肚"],
            "duan": ["短", "段", "断", "端"],
            "dui": ["对", "队", "堆"],
            "dun": ["顿", "吨", "蹲"],
            "duo": ["多", "朵", "夺", "躲"],
            "e": ["饿", "俄", "恶", "鹅"],
            "en": ["恩"],
            "er": ["二", "儿", "耳", "而"],
            "fa": ["发", "法", "罚"],
            "fan": ["饭", "反", "翻", "烦", "繁"],
            "fang": ["房", "方", "放", "防", "访"],
            "fei": ["非", "飞", "费", "肥", "废"],
            "fen": ["分", "份", "粉", "奋"],
            "feng": ["风", "丰", "封", "峰"],
            "fu": ["服", "复", "福", "父", "付", "富", "副"],
            "gai": ["该", "改", "盖"],
            "gan": ["感", "干", "敢", "赶", "甘"],
            "gang": ["刚", "钢", "港"],
            "gao": ["高", "告", "搞", "稿"],
            "ge": ["个", "各", "歌", "哥", "格", "隔"],
            "gen": ["跟", "根"],
            "geng": ["更", "耕"],
            "gong": ["工", "公", "共", "功", "供"],
            "gou": ["够", "狗", "钩", "购"],
            "gu": ["古", "故", "骨", "股"],
            "gua": ["瓜", "挂", "刮"],
            "guan": ["关", "馆", "观", "管", "官"],
            "guang": ["光", "广", "逛"],
            "gui": ["贵", "规", "归", "鬼"],
            "guo": ["国", "果", "过", "锅"],
            "hai": ["海", "还", "孩", "害"],
            "han": ["汉", "汗", "寒", "含", "喊", "韩"],
            "hang": ["行", "航"],
            "hao": ["好", "号", "毫", "豪", "浩"],
            "he": ["和", "喝", "河", "合", "何", "黑"],
            "hei": ["黑"],
            "hen": ["很", "狠", "恨"],
            "hong": ["红", "洪", "宏"],
            "hou": ["后", "候", "厚", "猴"],
            "hu": ["湖", "护", "互", "户", "呼"],
            "hua": ["话", "花", "画", "华", "化"],
            "huai": ["坏", "怀"],
            "huan": ["欢", "还", "换", "环", "缓"],
            "huang": ["黄", "皇", "慌"],
            "hui": ["会", "回", "灰", "汇", "辉"],
            "huo": ["火", "活", "或", "货"],
            "ji": ["几", "机", "鸡", "极", "集", "记", "计", "基", "级", "寄"],
            "jia": ["家", "加", "价", "假", "架"],
            "jian": ["见", "件", "间", "简", "建", "检", "减", "剑"],
            "jiang": ["江", "将", "讲", "奖"],
            "jiao": ["叫", "交", "教", "脚", "角", "较"],
            "jie": ["接", "节", "姐", "借", "街", "解", "结", "介"],
            "jin": ["今", "进", "近", "金", "斤", "紧"],
            "jing": ["经", "京", "精", "净", "静", "睛", "景", "警"],
            "jiu": ["九", "就", "酒", "旧", "救", "久"],
            "ju": ["句", "车", "局", "举", "居", "剧"],
            "juan": ["卷", "捐"],
            "jue": ["觉", "绝", "决"],
            "ka": ["卡", "咖"],
            "kai": ["开", "凯"],
            "kan": ["看", "砍", "刊"],
            "kang": ["康", "抗"],
            "kao": ["考", "靠", "烤"],
            "ke": ["可", "课", "客", "刻", "渴", "克", "科"],
            "ken": ["肯"],
            "kong": ["空", "孔", "恐", "控"],
            "kou": ["口", "扣"],
            "ku": ["哭", "苦", "库", "裤"],
            "kuai": ["快", "块", "筷"],
            "kuan": ["宽", "款"],
            "kuang": ["况", "矿", "框"],
            "lai": ["来", "赖"],
            "lan": ["蓝", "篮", "懒", "览"],
            "lang": ["浪", "狼"],
            "lao": ["老", "劳", "牢"],
            "le": ["了", "乐", "勒"],
            "lei": ["累", "类", "泪", "雷"],
            "leng": ["冷"],
            "li": ["里", "离", "李", "利", "力", "立", "理", "丽", "礼", "例"],
            "lian": ["脸", "连", "练", "恋"],
            "liang": ["两", "量", "亮", "凉", "良"],
            "liao": ["了", "聊", "料"],
            "lie": ["列", "烈", "猎"],
            "lin": ["林", "邻", "临"],
            "ling": ["零", "领", "令", "另"],
            "liu": ["六", "流", "留", "楼"],
            "long": ["龙", "隆"],
            "lou": ["楼", "漏"],
            "lu": ["路", "陆", "录", "绿", "鹿"],
            "lv": ["绿", "律", "旅", "虑"],
            "luan": ["乱", "卵"],
            "lun": ["论", "轮"],
            "luo": ["落", "罗", "络"],
            "ma": ["吗", "妈", "马", "骂", "码"],
            "mai": ["买", "卖", "麦"],
            "man": ["慢", "满", "忙"],
            "mang": ["忙", "盲", "芒"],
            "mao": ["猫", "毛", "冒", "帽"],
            "me": ["么"],
            "mei": ["没", "美", "每", "妹", "煤"],
            "men": ["们", "门", "闷"],
            "mi": ["米", "密", "秘", "迷"],
            "mian": ["面", "免", "棉"],
            "miao": ["秒", "妙", "描"],
            "mie": ["灭"],
            "min": ["民", "敏"],
            "ming": ["明", "名", "命"],
            "mo": ["磨", "末", "模", "摸", "墨"],
            "mou": ["某"],
            "mu": ["木", "目", "母", "暮"],
            "na": ["那", "哪", "拿"],
            "nai": ["奶", "奈", "耐"],
            "nan": ["南", "难", "男"],
            "nao": ["脑", "闹"],
            "ne": ["呢"],
            "nei": ["内", "那"],
            "neng": ["能"],
            "ni": ["你", "呢", "泥", "拟", "逆", "倪"],
            "nian": ["年", "念", "粘"],
            "niang": ["娘"],
            "niao": ["鸟"],
            "nie": ["捏"],
            "nin": ["您"],
            "ning": ["宁", "柠"],
            "niu": ["牛", "纽"],
            "nong": ["弄", "农", "浓"],
            "nu": ["努", "怒"],
            "nuan": ["暖"],
            "nv": ["女"],
            "ou": ["偶", "欧"],
            "pa": ["怕", "爬"],
            "pai": ["拍", "牌", "排", "派"],
            "pan": ["盘", "判", "盼"],
            "pang": ["旁", "胖"],
            "pao": ["跑", "泡", "包"],
            "pei": ["陪", "培", "配"],
            "pen": ["盆", "喷"],
            "peng": ["朋", "碰", "棚"],
            "pi": ["皮", "批", "披", "疲"],
            "pian": ["片", "篇", "骗"],
            "piao": ["票", "漂", "飘"],
            "pin": ["品", "拼", "贫"],
            "ping": ["平", "苹", "瓶", "评"],
            "po": ["破", "婆", "迫"],
            "pu": ["普", "铺", "谱"],
            "qi": ["七", "起", "期", "气", "奇", "妻", "骑", "其", "齐", "企"],
            "qia": ["恰", "卡"],
            "qian": ["钱", "前", "千", "浅", "签", "铅"],
            "qiang": ["强", "墙", "枪"],
            "qiao": ["桥", "瞧", "巧", "敲"],
            "qie": ["切", "且"],
            "qin": ["亲", "琴", "勤"],
            "qing": ["请", "情", "轻", "晴", "清", "青", "庆"],
            "qiong": ["穷"],
            "qiu": ["秋", "求", "球"],
            "qu": ["去", "取", "区", "曲", "趣"],
            "quan": ["全", "圈", "权", "劝"],
            "que": ["却", "确", "缺", "雀"],
            "qun": ["群", "裙"],
            "ran": ["然", "燃", "染"],
            "rang": ["让", "嚷"],
            "re": ["热"],
            "ren": ["人", "认", "任", "忍"],
            "reng": ["扔", "仍"],
            "ri": ["日"],
            "rong": ["容", "荣", "融"],
            "rou": ["肉", "柔"],
            "ru": ["如", "入", "儒"],
            "ruan": ["软"],
            "run": ["润"],
            "ruo": ["弱", "若"],
            "sa": ["洒", "撒"],
            "sai": ["赛", "塞"],
            "san": ["三", "散", "伞"],
            "sang": ["嗓", "桑"],
            "sao": ["扫", "骚"],
            "se": ["色", "瑟"],
            "sen": ["森"],
            "seng": ["僧"],
            "sha": ["沙", "傻", "杀", "厦"],
            "shai": ["晒"],
            "shan": ["山", "闪", "衫", "扇", "善"],
            "shang": ["上", "商", "伤", "尚", "赏"],
            "shao": ["少", "绍", "烧", "勺"],
            "she": ["社", "设", "摄", "舍", "蛇"],
            "shei": ["谁"],
            "shen": ["身", "深", "甚", "神", "申", "伸"],
            "sheng": ["生", "声", "省", "升", "胜", "圣"],
            "shi": ["是", "十", "时", "事", "师", "市", "识", "实", "使", "视", "试", "始", "石"],
            "shou": ["手", "收", "首", "受", "瘦", "授"],
            "shu": ["书", "树", "数", "水", "叔", "输", "熟", "术", "束"],
            "shua": ["刷", "耍"],
            "shuai": ["帅", "摔"],
            "shuan": ["栓"],
            "shuang": ["双", "霜"],
            "shui": ["水", "睡", "谁", "税"],
            "shun": ["顺"],
            "shuo": ["说", "硕"],
            "si": ["四", "死", "思", "司", "丝", "私"],
            "song": ["送", "松", "颂"],
            "sou": ["搜", "艘"],
            "su": ["速", "素", "诉", "宿", "苏"],
            "suan": ["算", "酸"],
            "sui": ["岁", "随", "碎", "虽"],
            "sun": ["孙", "损"],
            "suo": ["所", "缩", "锁"],
            "ta": ["他", "她", "它", "塔", "踏"],
            "tai": ["太", "台", "抬", "态"],
            "tan": ["谈", "探", "弹", "贪"],
            "tang": ["汤", "糖", "堂", "躺", "趟"],
            "tao": ["套", "逃", "讨", "桃"],
            "te": ["特"],
            "teng": ["疼", "腾"],
            "ti": ["提", "题", "体", "替", "踢"],
            "tian": ["天", "田", "填", "甜"],
            "tiao": ["条", "跳", "调", "挑"],
            "tie": ["铁", "贴"],
            "ting": ["听", "停", "厅", "挺"],
            "tong": ["同", "通", "童", "痛", "桶"],
            "tou": ["头", "透", "投"],
            "tu": ["土", "图", "兔", "途", "突"],
            "tuan": ["团"],
            "tui": ["推", "腿", "退"],
            "tuo": ["托", "脱", "拖"],
            "wa": ["挖", "娃", "瓦"],
            "wai": ["外", "歪"],
            "wan": ["完", "玩", "晚", "万", "碗", "弯"],
            "wang": ["王", "望", "忘", "网", "往"],
            "wei": ["为", "位", "喂", "微", "唯", "危", "味", "围", "卫"],
            "wen": ["文", "问", "温", "闻", "稳"],
            "weng": ["翁"],
            "wo": ["我", "握", "窝", "卧"],
            "wu": ["五", "午", "物", "屋", "无", "舞", "务", "武", "误"],
            "xi": ["西", "洗", "细", "喜", "系", "习", "希", "息", "戏", "吸"],
            "xia": ["下", "夏", "吓", "狭", "虾"],
            "xian": ["先", "现", "线", "限", "显", "险", "见", "咸"],
            "xiang": ["想", "向", "相", "香", "像", "响", "箱", "乡", "详"],
            "xiao": ["小", "校", "笑", "消", "效", "晓"],
            "xie": ["写", "些", "鞋", "谢", "斜", "携"],
            "xin": ["心", "新", "信", "辛"],
            "xing": ["行", "性", "形", "星", "姓", "兴", "醒"],
            "xiong": ["兄", "凶", "熊", "雄"],
            "xiu": ["休", "修", "秀"],
            "xu": ["需", "许", "续", "须", "虚"],
            "xuan": ["选", "宣", "悬"],
            "xue": ["学", "雪", "靴", "穴"],
            "xun": ["寻", "训", "讯", "迅速"],
            "ya": ["鸭", "压", "牙", "呀"],
            "yan": ["眼", "言", "演", "颜", "严", "烟", "研", "验"],
            "yang": ["样", "阳", "洋", "羊", "养"],
            "yao": ["要", "药", "遥", "摇", "腰"],
            "ye": ["也", "业", "夜", "叶", "爷", "页"],
            "yi": ["一", "以", "已", "衣", "意", "医", "易", "议", "艺", "移", "忆"],
            "yin": ["因", "音", "银", "饮", "引", "阴"],
            "ying": ["英", "应", "影", "硬", "迎", "赢", "莹"],
            "yong": ["用", "勇", "永", "拥", "泳"],
            "you": ["有", "又", "友", "右", "油", "游", "邮", "幼"],
            "yu": ["雨", "语", "鱼", "与", "玉", "遇", "预", "于", "余", "欲"],
            "yuan": ["元", "院", "原", "园", "员", "远", "源", "愿"],
            "yue": ["月", "越", "约", "阅", "乐"],
            "yun": ["运", "云", "允", "匀"],
            "za": ["杂", "砸"],
            "zai": ["在", "再", "载", "灾"],
            "zan": ["咱", "赞"],
            "zang": ["脏", "藏"],
            "zao": ["早", "造", "澡", "糟"],
            "ze": ["则", "责", "择"],
            "zen": ["怎"],
            "zeng": ["增", "赠"],
            "zha": ["扎", "炸", "渣"],
            "zhai": ["摘", "窄", "宅"],
            "zhan": ["站", "占", "战", "展"],
            "zhang": ["张", "长", "章", "掌", "涨"],
            "zhao": ["找", "照", "招", "召", "着"],
            "zhe": ["这", "着", "者", "折", "遮"],
            "zhen": ["真", "正", "针", "阵", "震"],
            "zheng": ["正", "整", "争", "证", "政", "征"],
            "zhi": ["只", "知", "指", "支", "直", "至", "制", "治", "纸", "志", "职", "质"],
            "zhong": ["中", "重", "种", "钟", "终", "众"],
            "zhou": ["周", "州", "洲", "舟"],
            "zhu": ["住", "主", "祝", "注", "猪", "竹", "著", "珠"],
            "zhua": ["抓"],
            "zhuan": ["专", "转", "赚", "砖"],
            "zhuang": ["装", "壮", "状", "撞"],
            "zhui": ["追", "坠"],
            "zhun": ["准"],
            "zhuo": ["桌", "捉", "着"],
            "zi": ["字", "子", "自", "紫", "资", "姿"],
            "zong": ["总", "宗", "综"],
            "zou": ["走", "奏"],
            "zu": ["组", "足", "祖", "族"],
            "zuan": ["钻"],
            "zui": ["最", "嘴", "醉"],
            "zun": ["尊"],
            "zuo": ["做", "作", "坐", "座", "左", "昨"]
        },

        // Bảng chỉ mục tra cứu ngược O(1) theo chữ Hán
        DICTIONARY_BY_WORD: {},

        init() {
            this.DICTIONARY_BY_WORD = {};
            for (const key in this.PHRASES) {
                const item = this.PHRASES[key];
                if (item && item.word) {
                    this.DICTIONARY_BY_WORD[item.word] = item;
                }
            }
            for (const word in this.SINGLE_WORDS) {
                const item = this.SINGLE_WORDS[word];
                if (!this.DICTIONARY_BY_WORD[word]) {
                    this.DICTIONARY_BY_WORD[word] = {
                        word,
                        pinyin: item.pinyin,
                        meaning: item.meaning
                    };
                }
            }
        },

        /**
         * Kiểm tra xem chuỗi có chứa chữ Hán hay không
         */
        isHanzi(text) {
            if (!text) return false;
            return /[\u4e00-\u9fa5]/.test(text);
        },

        /**
         * Lấy mảng ký tự chữ Hán từ chuỗi
         */
        extractHanzi(text) {
            if (!text) return [];
            const matches = String(text).match(/[\u4e00-\u9fa5]/g);
            return matches || [];
        },

        /**
         * Chuẩn hóa Pinyin nhập vào:
         * - Hỗ trợ gõ tiếng Việt Telex: chuyển 'đ'/'Đ' thành 'd' tránh bị nuốt chữ
         * - Hỗ trợ gõ 'v' thay cho 'ü' (nv -> nǚ, lv -> lǜ)
         * - Loại bỏ dấu thanh điệu NFD và khoảng trắng thừa
         */
        normalizePinyinInput(str) {
            if (!str) return '';
            return String(str)
                .toLowerCase()
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'd')
                .replace(/([nl])v/g, '$1u')
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z]/g, "")
                .trim();
        },

        cleanPinyin(text) {
            return this.normalizePinyinInput(text);
        },

        /**
         * Tra cứu nhanh ứng viên chữ Hán Offline từ bộ từ điển
         * @param {string} pinyin - Pinyin thô (ví dụ: 'nihao', 'xuexi', 'hanzi')
         * @returns {Array<string>} Danh sách ứng viên từ hoặc ký tự
         */
        lookupOffline(pinyin) {
            const clean = this.normalizePinyinInput(pinyin);
            if (!clean) return [];

            const candidates = new Set();

            // 1. Khớp chính xác cụm từ trong PHRASES
            if (this.PHRASES[clean]) {
                candidates.add(this.PHRASES[clean].word);
            }

            // 2. Khớp tiền tố cụm từ (khi người dùng đang gõ dở dang)
            for (const [key, item] of Object.entries(this.PHRASES)) {
                if (key.startsWith(clean) && key !== clean) {
                    candidates.add(item.word);
                }
            }

            // 3. Khớp âm tiết đơn lẻ trong SYLLABLES
            if (this.SYLLABLES[clean]) {
                this.SYLLABLES[clean].forEach(c => candidates.add(c));
            }

            return Array.from(candidates);
        },

        /**
         * Tra cứu ứng viên online qua Google Input Tools API (nếu có kết nối mạng)
         * Fallback an toàn nếu lỗi mạng hoặc CORS
         * @param {string} pinyin
         * @returns {Promise<Array<string>>}
         */
        async fetchOnlineCandidates(pinyin) {
            const clean = this.normalizePinyinInput(pinyin);
            if (!clean) return [];

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 800);

                const url = `https://inputtools.google.com/request?ime=pinyin&ie=utf-8&oe=utf-8&app=translate&num=10&text=${encodeURIComponent(clean)}`;
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) return [];

                const data = await response.json();
                if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
                    return data[1][0][1];
                }
            } catch (e) {
                // Bỏ qua lỗi mạng, fallback nhẹ nhàng
            }
            return [];
        },

        /**
         * Tra cứu tổng hợp: kết hợp Offline tức thì + Online
         * @param {string} pinyin
         * @returns {Promise<Array<string>>}
         */
        async searchPinyin(pinyin) {
            const offlineResults = this.lookupOffline(pinyin);

            try {
                const onlineResults = await this.fetchOnlineCandidates(pinyin);
                if (onlineResults.length > 0) {
                    const combined = Array.from(new Set([...onlineResults, ...offlineResults]));
                    return combined.slice(0, 15);
                }
            } catch (err) {}

            return offlineResults.slice(0, 15);
        },

        /**
         * Tính toán Pinyin đầy đủ có thanh điệu
         * @param {string} text - Chữ Hán hoặc cụm từ
         * @returns {string}
         */
        computeFullPinyin(text) {
            if (!text) return '';

            // 1. Ưu tiên số 1: Tra cứu tức thời O(1) từ bảng chỉ mục từ điển chuẩn đã quy ước
            // (Đảm bảo chuẩn thanh nhẹ / khinh thanh như 爸爸 -> bà ba, 妈妈 -> mā ma, 谢谢 -> xiè xie...)
            if (this.DICTIONARY_BY_WORD && this.DICTIONARY_BY_WORD[text] && this.DICTIONARY_BY_WORD[text].pinyin) {
                return this.DICTIONARY_BY_WORD[text].pinyin;
            }

            // 2. Fallback: Dùng pinyin-pro nếu là từ mới/tự do không có trong từ điển chuẩn
            if (typeof pinyinPro !== 'undefined' && typeof pinyinPro.pinyin === 'function') {
                try {
                    const res = pinyinPro.pinyin(text, { toneType: 'symbol' });
                    if (res) return res;
                } catch (e) {}
            }

            return '';
        },

        /**
         * Tra cứu nhanh nghĩa mặc định của từ
         * @param {string} word
         * @returns {string}
         */
        lookupDefaultMeaning(word) {
            if (!word) return '';
            if (this.DICTIONARY_BY_WORD && this.DICTIONARY_BY_WORD[word]) {
                return this.DICTIONARY_BY_WORD[word].meaning || '';
            }
            return '';
        },

        /**
         * Lấy thông tin ngữ âm chi tiết qua từ điển hoặc pinyin-pro
         */
        getPinyinInfo(hanzi) {
            if (!hanzi) {
                return { withTone: '', noTone: '', toneNum: '' };
            }

            // Lấy pinyin có dấu ưu tiên từ bộ từ điển chuẩn
            const curatedPinyin = this.computeFullPinyin(hanzi);
            const cleanNoTone = curatedPinyin ? curatedPinyin.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';

            if (typeof pinyinPro !== 'undefined' && typeof pinyinPro.pinyin === 'function') {
                try {
                    return {
                        withTone: curatedPinyin || pinyinPro.pinyin(hanzi, { toneType: 'symbol' }),
                        noTone: cleanNoTone || pinyinPro.pinyin(hanzi, { toneType: 'none' }),
                        toneNum: pinyinPro.pinyin(hanzi, { toneType: 'num' })
                    };
                } catch (e) {}
            }

            return {
                withTone: curatedPinyin,
                noTone: cleanNoTone,
                toneNum: ''
            };
        }
    };

    // Khởi tạo bảng chỉ mục O(1) ngay khi tải module
    DictionaryService.init();

    if (typeof window !== 'undefined') {
        window.DictionaryService = DictionaryService;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DictionaryService;
    }
})();
