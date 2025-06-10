// Телеграм бот для таро MiaxiaLip
// Запуск: node tarot-bot.js

const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

// Завантаження конфігурації
let config;
try {
    config = require('./config');
    console.log('✅ Конфігурація завантажена успішно');
} catch (error) {
    console.error('❌ Помилка завантаження config.js:');
    console.error('Створіть файл config.js на основі config-template.js');
    console.error('Детальні інструкції в README або документації');
    process.exit(1);
}

// Отримання конфігурації
const BOT_TOKEN = config.telegram.botToken;
const ADMIN_CHAT_ID = config.telegram.adminChatId;
const CHANNEL_ID = config.telegram.channelId;

// Перевірка обов'язкових параметрів
if (!BOT_TOKEN || BOT_TOKEN === 'ВСТАВТЕ_ВАШ_ТОКЕН_БОТА_СЮДИ') {
    console.error('❌ Помилка: Не вказано токен бота в config.js');
    console.error('Отримайте токен від @BotFather і вставте в config.js');
    process.exit(1);
}

if (!ADMIN_CHAT_ID || ADMIN_CHAT_ID === 'ВСТАВТЕ_ВАШ_CHAT_ID_СЮДИ') {
    console.error('❌ Помилка: Не вказано Chat ID адміна в config.js');
    console.error('Отримайте Chat ID від @userinfobot і вставте в config.js');
    process.exit(1);
}

// Ініціалізація бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// База даних користувачів (в реальному проекті використовуйте MongoDB/PostgreSQL)
let users = new Map();
let userSessions = new Map();

// Картки Таро
const tarotCards = [
    { name: "Дурень", meaning: "Нові початки, спонтанність, innocence", emoji: "🃏" },
    { name: "Маг", meaning: "Воля, прояв, ресурси", emoji: "🎩" },
    { name: "Верховна жриця", meaning: "Інтуїція, підсвідоме, внутрішня мудрість", emoji: "🌙" },
    { name: "Імператриця", meaning: "Материнство, плодючість, природа", emoji: "👑" },
    { name: "Імператор", meaning: "Авторитет, структура, контроль", emoji: "⚜️" },
    { name: "Ієрофант", meaning: "Традиції, соціальні норми, духовність", emoji: "⛪" },
    { name: "Закохані", meaning: "Любов, гармонія, стосунки", emoji: "💝" },
    { name: "Колісниця", meaning: "Контроль, воля до перемоги, визначеність", emoji: "🏆" },
    { name: "Сила", meaning: "Внутрішня сила, терпіння, співчуття", emoji: "💪" },
    { name: "Відлюдник", meaning: "Самоаналіз, пошук істини, внутрішнє керівництво", emoji: "🏮" },
    { name: "Колесо Фортуни", meaning: "Удача, доля, життєві цикли", emoji: "🎰" },
    { name: "Справедливість", meaning: "Справедливість, істина, закон", emoji: "⚖️" },
    { name: "Повішений", meaning: "Жертовність, відпускання, нова перспектива", emoji: "🙃" },
    { name: "Смерть", meaning: "Трансформація, закінчення, новий початок", emoji: "🦋" },
    { name: "Помірність", meaning: "Баланс, терпіння, мета", emoji: "🧘‍♀️" },
    { name: "Диявол", meaning: "Залежність, матеріалізм, ігнорування", emoji: "😈" },
    { name: "Вежа", meaning: "Раптові зміни, хаос, пробудження", emoji: "⚡" },
    { name: "Зірка", meaning: "Надія, духовність, оновлення", emoji: "⭐" },
    { name: "Місяць", meaning: "Ілюзії, страхи, підсвідоме", emoji: "🌙" },
    { name: "Сонце", meaning: "Радість, успіх, позитивність", emoji: "☀️" },
    { name: "Суд", meaning: "Відродження, прощення, пробудження", emoji: "📯" },
    { name: "Світ", meaning: "Завершення, досягнення, виконання", emoji: "🌍" }
];

// Зодіакальні знаки та прогнози
const zodiacSigns = [
    { name: "Овен", emoji: "♈", dates: "21.03 - 19.04" },
    { name: "Телець", emoji: "♉", dates: "20.04 - 20.05" },
    { name: "Близнюки", emoji: "♊", dates: "21.05 - 20.06" },
    { name: "Рак", emoji: "♋", dates: "21.06 - 22.07" },
    { name: "Лев", emoji: "♌", dates: "23.07 - 22.08" },
    { name: "Діва", emoji: "♍", dates: "23.08 - 22.09" },
    { name: "Терези", emoji: "♎", dates: "23.09 - 22.10" },
    { name: "Скорпіон", emoji: "♏", dates: "23.10 - 21.11" },
    { name: "Стрілець", emoji: "♐", dates: "22.11 - 21.12" },
    { name: "Козеріг", emoji: "♑", dates: "22.12 - 19.01" },
    { name: "Водолій", emoji: "♒", dates: "20.01 - 18.02" },
    { name: "Риби", emoji: "♓", dates: "19.02 - 20.03" }
];

// Шаблони постів для автоматизації
const postTemplates = {
    daily: [
        "🌅 Доброго ранку! Сьогодні картка дня: {card}\n\n✨ {meaning}\n\n💫 Як ця енергія вплине на ваш день?",
        "🌟 Карта дня від MiaxiaLip: {card}\n\n🔮 {meaning}\n\n💎 Які можливості відкриває цей день для вас?",
        "☀️ Ранкове послання від Таро: {card}\n\n🌸 {meaning}\n\n🙏 Бажаю натхненного дня!"
    ],
    weekly: [
        "📅 Тижневий прогноз від MiaxiaLip!\n\n🔮 Основна енергія тижня: {card}\n\n✨ {meaning}\n\n💫 Використайте цю енергію для досягнення своїх цілей!",
        "🌙 Астрологічний тиждень розпочинається!\n\n🃏 Провідна карта: {card}\n\n🌟 {meaning}\n\n🦋 Нехай цей тиждень принесе вам гармонію!"
    ],
    motivation: [
        "💪 Мотиваційна картка від Таро: {card}\n\n🌟 {meaning}\n\n✨ Пам'ятайте: ви сильніші, ніж думаєте!",
        "🦋 Натхнення дня: {card}\n\n💎 {meaning}\n\n🌈 Довіряйте своєму шляху!"
    ]
};

// Функції для роботи з базою даних
async function saveUserData() {
    try {
        const data = {
            users: Array.from(users.entries()),
            lastSave: new Date().toISOString()
        };
        await fs.writeFile('users.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Помилка збереження користувачів:', error);
    }
}

async function loadUserData() {
    try {
        const data = await fs.readFile('users.json', 'utf8');
        const parsed = JSON.parse(data);
        users = new Map(parsed.users || []);
        console.log(`Завантажено ${users.size} користувачів`);
    } catch (error) {
        console.log('Файл користувачів не знайдено, створюємо новий');
        users = new Map();
    }
}

// Функції генерації контенту
function getRandomCard() {
    return tarotCards[Math.floor(Math.random() * tarotCards.length)];
}

function generateDailyPost() {
    const card = getRandomCard();
    const template = postTemplates.daily[Math.floor(Math.random() * postTemplates.daily.length)];
    return template.replace('{card}', `${card.emoji} ${card.name}`).replace('{meaning}', card.meaning);
}

function generateWeeklyPost() {
    const card = getRandomCard();
    const template = postTemplates.weekly[Math.floor(Math.random() * postTemplates.weekly.length)];
    return template.replace('{card}', `${card.emoji} ${card.name}`).replace('{meaning}', card.meaning);
}

function generateMotivationalPost() {
    const card = getRandomCard();
    const template = postTemplates.motivation[Math.floor(Math.random() * postTemplates.motivation.length)];
    return template.replace('{card}', `${card.emoji} ${card.name}`).replace('{meaning}', card.meaning);
}

// Клавіатури
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ['🔮 Розклад на день', '💝 Любовний прогноз'],
            ['🌟 Загальний розклад', '♈ Гороскоп'],
            ['📞 Замовити консультацію', '💎 Про MiaxiaLip'],
            ['📱 Instagram', '🎁 Спеціальні пропозиції']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

const zodiacKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '♈ Овен', callback_data: 'zodiac_aries' },
                { text: '♉ Телець', callback_data: 'zodiac_taurus' },
                { text: '♊ Близнюки', callback_data: 'zodiac_gemini' }
            ],
            [
                { text: '♋ Рак', callback_data: 'zodiac_cancer' },
                { text: '♌ Лев', callback_data: 'zodiac_leo' },
                { text: '♍ Діва', callback_data: 'zodiac_virgo' }
            ],
            [
                { text: '♎ Терези', callback_data: 'zodiac_libra' },
                { text: '♏ Скорпіон', callback_data: 'zodiac_scorpio' },
                { text: '♐ Стрілець', callback_data: 'zodiac_sagittarius' }
            ],
            [
                { text: '♑ Козеріг', callback_data: 'zodiac_capricorn' },
                { text: '♒ Водолій', callback_data: 'zodiac_aquarius' },
                { text: '♓ Риби', callback_data: 'zodiac_pisces' }
            ]
        ]
    }
};

// Обробники команд
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'Дорогий друже';
    
    // Зберігаємо користувача
    users.set(chatId, {
        firstName: firstName,
        username: msg.from.username || '',
        joinDate: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    });
    
    await saveUserData();
    
    const welcomeMessage = `🌟 Привіт, ${firstName}! 

Ласкаво прошу до світу Таро з MiaxiaLip! 🔮

✨ Я допоможу вам:
• Отримати розклад на день
• Дізнатися любовний прогноз  
• Побачити загальний розклад
• Отримати гороскоп за знаком зодіаку

🎯 Оберіть опцію з меню нижче або напишіть своє питання!

💫 Пам'ятайте: Таро не передбачає майбутнє, а допомагає краще зрозуміти себе та свій шлях.`;

    await bot.sendMessage(chatId, welcomeMessage, mainKeyboard);
    
    // Сповіщення адміну про нового користувача
    await bot.sendMessage(ADMIN_CHAT_ID, `🆕 Новий користувач: ${firstName} (@${msg.from.username || 'без username'})`);
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // Оновлюємо активність користувача
    if (users.has(chatId)) {
        const user = users.get(chatId);
        user.lastActivity = new Date().toISOString();
        users.set(chatId, user);
    }
    
    switch (text) {
        case '🔮 Розклад на день':
            await handleDailyReading(chatId);
            break;
            
        case '💝 Любовний прогноз':
            await handleLoveReading(chatId);
            break;
            
        case '🌟 Загальний розклад':
            await handleGeneralReading(chatId);
            break;
            
        case '♈ Гороскоп':
            await bot.sendMessage(chatId, '🌟 Оберіть ваш знак зодіаку:', zodiacKeyboard);
            break;
            
        case '📞 Замовити консультацію':
            await handleConsultationOrder(chatId);
            break;
            
        case '💎 Про MiaxiaLip':
            await handleAbout(chatId);
            break;
            
        case '📱 Instagram':
            await bot.sendMessage(chatId, '📱 Підписуйтесь на Instagram: @miaxialip\n\n✨ Там ви знайдете:\n• Щоденні розклади\n• Відео з порадами\n• Прямі ефіри\n• Цікавий контент про Таро', {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📱 Перейти в Instagram', url: 'https://instagram.com/miaxialip' }
                    ]]
                }
            });
            break;
            
        case '🎁 Спеціальні пропозиції':
            await handleSpecialOffers(chatId);
            break;
            
        default:
            if (text && !text.startsWith('/')) {
                await handleFreeFormQuestion(chatId, text);
            }
    }
});

// Обробка кнопок зодіаку
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    
    if (data.startsWith('zodiac_')) {
        const signKey = data.replace('zodiac_', '');
        const sign = zodiacSigns.find(z => z.name.toLowerCase() === getZodiacName(signKey));
        
        if (sign) {
            const horoscope = generateHoroscope(sign);
            await bot.editMessageText(horoscope, {
                chat_id: message.chat.id,
                message_id: message.message_id,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔄 Інший знак', callback_data: 'show_zodiac_menu' },
                        { text: '🌟 Головне меню', callback_data: 'main_menu' }
                    ]]
                }
            });
        }
    }
    
    if (data === 'show_zodiac_menu') {
        await bot.editMessageText('🌟 Оберіть ваш знак зодіаку:', {
            chat_id: message.chat.id,
            message_id: message.message_id,
            reply_markup: zodiacKeyboard.reply_markup
        });
    }
    
    if (data === 'main_menu') {
        await bot.editMessageText('🌟 Оберіть опцію з головного меню:', {
            chat_id: message.chat.id,
            message_id: message.message_id
        });
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
});

// Функції обробки різних типів розкладів
async function handleDailyReading(chatId) {
    const cards = [getRandomCard(), getRandomCard(), getRandomCard()];
    
    const reading = `🌅 РОЗКЛАД НА ДЕНЬ

🔮 **Ранок (що очікує):** ${cards[0].emoji} ${cards[0].name}
${cards[0].meaning}

☀️ **День (на що звернути увагу):** ${cards[1].emoji} ${cards[1].name}
${cards[1].meaning}

🌙 **Вечір (підсумок дня):** ${cards[2].emoji} ${cards[2].name}
${cards[2].meaning}

💫 *Нехай цей день принесе вам мудрість та гармонію!*

📞 Хочете детальний розклад? Замовте персональну консультацію!`;

    await bot.sendMessage(chatId, reading, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: '📞 Замовити консультацію', url: 'https://theglamstyle.com.ua' }
            ]]
        }
    });
}

async function handleLoveReading(chatId) {
    const cards = [getRandomCard(), getRandomCard()];
    
    const reading = `💝 ЛЮБОВНИЙ ПРОГНОЗ

💕 **Ваш стан у любові:** ${cards[0].emoji} ${cards[0].name}
${cards[0].meaning}

🌹 **Поради для серця:** ${cards[1].emoji} ${cards[1].name}
${cards[1].meaning}

✨ *Пам'ятайте: любов починається з любові до себе!*

🔮 Хочете глибший аналіз стосунків? Замовте персональну консультацію!`;

    await bot.sendMessage(chatId, reading, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: '💝 Детальний любовний розклад', url: 'https://theglamstyle.com.ua' }
            ]]
        }
    });
}

async function handleGeneralReading(chatId) {
    const card = getRandomCard();
    
    const reading = `🌟 ЗАГАЛЬНИЙ РОЗКЛАД

🔮 **Ваша картка:** ${card.emoji} ${card.name}

✨ **Значення:** ${card.meaning}

💫 **Порада дня:** 
Ця картка нагадує вам про важливість прийняття себе та своїх рішень. Довіряйте інтуїції та йдіть за своїм серцем.

🌈 *Кожен день - це новий шанс стати кращою версією себе!*`;

    await bot.sendMessage(chatId, reading, {
        parse_mode: 'Markdown'
    });
}

async function handleConsultationOrder(chatId) {
    const orderMessage = `📞 ЗАМОВЛЕННЯ КОНСУЛЬТАЦІЇ

🔮 **Доступні послуги:**

💎 **Індивідуальний розклад** - 300 грн
Детальний аналіз вашої ситуації

💝 **Любовний прогноз** - 250 грн  
Глибокий розклад на стосунки

🌟 **Кар'єра і фінанси** - 350 грн
Професійне керівництво

🎯 **Повний розклад** - 500 грн
Комплексний аналіз всіх сфер життя

📱 **Як замовити:**
1. Перейдіть на сайт
2. Заповніть форму
3. Оберіть зручний час
4. Отримайте консультацію

✨ Першокласний сервіс та індивідуальний підхід!`;

    await bot.sendMessage(chatId, orderMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🌐 Замовити на сайті', url: 'https://theglamstyle.com.ua' }],
                [{ text: '📧 Написати email', url: 'mailto:miaxialip@gmail.com' }],
                [{ text: '📱 Instagram', url: 'https://instagram.com/miaxialip' }]
            ]
        }
    });
}

async function handleAbout(chatId) {
    const aboutMessage = `💎 ПРО MIAXIALIP

🌟 Ласкаво прошу до мого світу Таро!

🔮 **Мій досвід:**
• 5+ років практики Таро
• Більше 1000+ консультацій
• Індивідуальний підхід до кожного клієнта
• Комбінація класичних і сучасних методів

✨ **Що я пропоную:**
• Точні і детальні розклади
• Професійні поради
• Підтримка в складних ситуаціях
• Допомога в прийнятті рішень

💫 **Місія:** Допомогти вам знайти відповіді, гармонію та свій унікальний шлях в житті.

🌈 *Таро - це не магія, це мудрість, доступна кожному!*`;

    await bot.sendMessage(chatId, aboutMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📱 Instagram', url: 'https://instagram.com/miaxialip' }],
                [{ text: '🌐 Сайт', url: 'https://theglamstyle.com.ua' }]
            ]
        }
    });
}

async function handleSpecialOffers(chatId) {
    const offers = `🎁 СПЕЦІАЛЬНІ ПРОПОЗИЦІЇ

✨ **Акція "Перша консультація"**
-20% знижка для нових клієнтів
*Промокод: NEWCLIENT*

💝 **Пакет "Кохання і гармонія"**
Любовний розклад + загальний = 450 грн (замість 550)

🌟 **Місячний супровід**
4 консультації за місяць = 1200 грн (замість 1400)

🎯 **VIP консультація**
Розширена 90-хвилинна сесія = 800 грн

📱 **Бонус за підписку в Instagram:**
Щомісячний безкоштовний мікро-розклад!

⏰ *Пропозиції діють до кінця місяця!*`;

    await bot.sendMessage(chatId, offers, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🛒 Замовити зі знижкою', url: 'https://theglamstyle.com.ua' }],
                [{ text: '📱 Підписатись в Instagram', url: 'https://instagram.com/miaxialip' }]
            ]
        }
    });
}

async function handleFreeFormQuestion(chatId, question) {
    const card = getRandomCard();
    
    const response = `🔮 ВІДПОВІДЬ НА ВАШЕ ПИТАННЯ

❓ **Ваше питання:** "${question}"

🃏 **Картка-відповідь:** ${card.emoji} ${card.name}

✨ **Значення:** ${card.meaning}

💫 **Інтерпретація:** 
Ця картка радить вам довіряти своїй інтуїції та бути відкритим до нових можливостей. Ваше питання знайде відповідь, якщо ви будете уважні до знаків довкола.

🌟 *Для детального аналізу замовте персональну консультацію!*`;

    await bot.sendMessage(chatId, response, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: '📞 Детальна консультація', url: 'https://theglamstyle.com.ua' }
            ]]
        }
    });
}

// Функції допоміжні
function getZodiacName(key) {
    const mapping = {
        'aries': 'овен',
        'taurus': 'телець', 
        'gemini': 'близнюки',
        'cancer': 'рак',
        'leo': 'лев',
        'virgo': 'діва',
        'libra': 'терези',
        'scorpio': 'скорпіон',
        'sagittarius': 'стрілець',
        'capricorn': 'козеріг',
        'aquarius': 'водолій',
        'pisces': 'риби'
    };
    return mapping[key] || '';
}

function generateHoroscope(sign) {
    const horoscopes = [
        "Сьогодні зірки радять вам бути більш відкритими до нових можливостей",
        "День сприятливий для прийняття важливих рішень",
        "Зосередьтесь на внутрішній гармонії та спокої",
        "Час для творчості та самовираження",
        "Важливо довіряти своїй інтуїції"
    ];
    
    const horoscope = horoscopes[Math.floor(Math.random() * horoscopes.length)];
    
    return `${sign.emoji} **${sign.name.toUpperCase()}** (${sign.dates})

🌟 **Гороскоп на сьогодні:**
${horoscope}

💫 **Щасливий колір:** ${getRandomColor()}
🔢 **Щасливе число:** ${Math.floor(Math.random() * 9) + 1}

✨ *Нехай день принесе вам радість і натхнення!*`;
}

function getRandomColor() {
    const colors = ['🔴 Червоний', '🟠 Помаранчевий', '🟡 Жовтий', '🟢 Зелений', '🔵 Синій', '🟣 Фіолетовий', '⚪ Білий', '⚫ Чорний'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// АВТОМАТИЗАЦІЯ ПОСТІВ
async function publishToChannel(message) {
    try {
        await bot.sendMessage(CHANNEL_ID, message, { parse_mode: 'Markdown' });
        console.log('📢 Пост опубліковано в каналі');
    } catch (error) {
        console.error('Помилка публікації в каналі:', error);
    }
}

// Розклад автоматичних постів
// Щоденний пост о 9:00
cron.schedule('0 9 * * *', async () => {
    const post = generateDailyPost();
    await publishToChannel(post);
    console.log('🌅 Опубліковано щоденний пост');
});

// Тижневий пост у понеділок о 8:00
cron.schedule('0 8 * * 1', async () => {
    const post = generateWeeklyPost();
    await publishToChannel(post);
    console.log('📅 Опубліковано тижневий пост');
});

// Мотиваційний пост о 15:00 (пн, ср, пт)
cron.schedule('0 15 * * 1,3,5', async () => {
    const post = generateMotivationalPost();
    await publishToChannel(post);
    console.log('💪 Опубліковано мотиваційний пост');
});

// Вечірній пост о 20:00 (вт, чт, сб)
cron.schedule('0 20 * * 2,4,6', async () => {
    const cards = [getRandomCard(), getRandomCard()];
    const post = `🌙 **ВЕЧІРНЯ РЕФЛЕКСІЯ**

🔮 Що день навчив: ${cards[0].emoji} ${cards[0].name}
${cards[0].meaning}

✨ Що взяти в завтра: ${cards[1].emoji} ${cards[1].name}  
${cards[1].meaning}

💫 *Доброї ночі та солодких снів!*`;
    
    await publishToChannel(post);
    console.log('🌙 Опубліковано вечірній пост');
});

// Функція для залучення користувачів з соціальних мереж
async function generateSocialMediaContent() {
    const content = {
        instagram: {
            story: `🔮 Картка дня в Telegram! 
Приєднуйтесь @miaxialip_tarot_bot`,
            post: `✨ Щоденні розклади Таро тепер у Telegram! 

🎯 Що вас чекає:
• Безкоштовні розклади
• Гороскопи 
• Персональні консультації
• Автоматичні щоденні пости

🔗 Посилання в bio або пошук: @miaxialip_tarot_bot

#таро #гороскоп #астрологія #україна`
        },
        tiktok: {
            script: `Хочеш щоденні розклади Таро БЕЗКОШТОВНО? 
Переходь в мій Telegram бот! 
Там тебе чекають розклади на день, любовні прогнози та багато іншого!
@miaxialip_tarot_bot`
        }
    };
    
    return content;
}

// Функція підрахунку статистики
async function getStatistics() {
    const totalUsers = users.size;
    const activeToday = Array.from(users.values()).filter(user => {
        const lastActivity = new Date(user.lastActivity);
        const today = new Date();
        return lastActivity.toDateString() === today.toDateString();
    }).length;
    
    return {
        totalUsers,
        activeToday,
        newToday: Array.from(users.values()).filter(user => {
            const joinDate = new Date(user.joinDate);
            const today = new Date();
            return joinDate.toDateString() === today.toDateString();
        }).length
    };
}

// Щоденна статистика для адміна (21:00)
cron.schedule('0 21 * * *', async () => {
    const stats = await getStatistics();
    const statsMessage = `📊 **СТАТИСТИКА ЗА ДЕНЬ**

👥 Всього користувачів: ${stats.totalUsers}
🟢 Активні сьогодні: ${stats.activeToday}  
🆕 Нові сьогодні: ${stats.newToday}

📈 Зростання: ${stats.newToday > 0 ? '+' : ''}${stats.newToday} користувачів`;

    await bot.sendMessage(ADMIN_CHAT_ID, statsMessage, { parse_mode: 'Markdown' });
});

// Запуск бота
async function startBot() {
    await loadUserData();
    console.log('🤖 Telegram бот MiaxiaLip запущено!');
    console.log('🔮 Автоматизація постів активна');
    console.log('📊 Статистика збирається');
    
    // Повідомлення адміну про запуск
    await bot.sendMessage(ADMIN_CHAT_ID, '🚀 Бот MiaxiaLip запущено!\n✅ Всі системи працюють');
}

// Обробка помилок
process.on('unhandledRejection', (error) => {
    console.error('Необроблена помилка:', error);
});

process.on('SIGINT', async () => {
    console.log('🛑 Зупинка бота...');
    await saveUserData();
    await bot.sendMessage(ADMIN_CHAT_ID, '⏹️ Бот зупинено');
    process.exit(0);
});

// Запуск
startBot();