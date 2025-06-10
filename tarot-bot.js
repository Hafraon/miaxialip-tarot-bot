// Телеграм бот для таро MiaxiaLip з оновленими цінами
// Запуск: node tarot-bot.js

const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

// Підключення ChatGPT інтеграції
const { 
    scheduleSmartPosts, 
    testChatGPT, 
    sendSmartPost,
    getChatGPTStats 
} = require('./chatgpt-integration');

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

// База даних користувачів
let users = new Map();
let userSessions = new Map();

// Картки Таро (залишаємо для інтерактивних розкладів)
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

// Зодіакальні знаки
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

// Функції генерації контенту (залишаємо для інтерактивних розкладів)
function getRandomCard() {
    return tarotCards[Math.floor(Math.random() * tarotCards.length)];
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

// Адмін клавіатура
const adminKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '🧪 Тест ChatGPT', callback_data: 'admin_test_gpt' },
                { text: '📊 Статистика', callback_data: 'admin_stats' }
            ],
            [
                { text: '📝 Пост зараз', callback_data: 'admin_post_now' },
                { text: '🔄 Перезапуск', callback_data: 'admin_restart' }
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

// Адмін команди
bot.onText(/\/admin/, async (msg) => {
    if (msg.chat.id.toString() === ADMIN_CHAT_ID) {
        await bot.sendMessage(ADMIN_CHAT_ID, '👑 Адмін панель:', adminKeyboard);
    }
});

bot.onText(/\/test_gpt/, async (msg) => {
    if (msg.chat.id.toString() === ADMIN_CHAT_ID) {
        await testChatGPT(bot, msg.chat.id);
    } else {
        await bot.sendMessage(msg.chat.id, '❌ Ця команда доступна тільки адміну');
    }
});

bot.onText(/\/post_now/, async (msg) => {
    if (msg.chat.id.toString() === ADMIN_CHAT_ID) {
        try {
            await sendSmartPost(bot, CHANNEL_ID);
            await bot.sendMessage(msg.chat.id, '✅ Розумний пост відправлено в канал!');
        } catch (error) {
            await bot.sendMessage(msg.chat.id, `❌ Помилка: ${error.message}`);
        }
    } else {
        await bot.sendMessage(msg.chat.id, '❌ Ця команда доступна тільки адміну');
    }
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

// Обробка callback кнопок
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;
    
    // Адмін кнопки
    if (data.startsWith('admin_') && chatId.toString() === ADMIN_CHAT_ID) {
        switch (data) {
            case 'admin_test_gpt':
                await testChatGPT(bot, chatId);
                break;
                
            case 'admin_stats':
                const stats = await getStatistics();
                const gptStats = getChatGPTStats();
                
                const statsMessage = `📊 **СТАТИСТИКА БОТА**

👥 **Користувачі:**
• Всього: ${stats.totalUsers}
• Активні сьогодні: ${stats.activeToday}
• Нові сьогодні: ${stats.newToday}

🤖 **ChatGPT:**
• Всього згенеровано: ${gptStats.totalGenerated}
• Успішних: ${gptStats.successfulRequests}
• Помилок: ${gptStats.failedRequests}
• Успішність: ${gptStats.successRate}%
• Останнє використання: ${gptStats.lastUsed ? new Date(gptStats.lastUsed).toLocaleString('uk-UA') : 'Ніколи'}

⚙️ **Система:**
• Статус ChatGPT: ${process.env.OPENAI_API_KEY ? '✅ Активний' : '❌ Неактивний'}
• Канал: ${CHANNEL_ID}`;

                await bot.editMessageText(statsMessage, {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                break;
                
            case 'admin_post_now':
                try {
                    await sendSmartPost(bot, CHANNEL_ID);
                    await bot.editMessageText('✅ Розумний пост відправлено в канал!', {
                        chat_id: chatId,
                        message_id: message.message_id
                    });
                } catch (error) {
                    await bot.editMessageText(`❌ Помилка: ${error.message}`, {
                        chat_id: chatId,
                        message_id: message.message_id
                    });
                }
                break;
                
            case 'admin_restart':
                await bot.editMessageText('🔄 Перезапуск бота...', {
                    chat_id: chatId,
                    message_id: message.message_id
                });
                
                await saveUserData();
                setTimeout(() => {
                    process.exit(0);
                }, 2000);
                break;
        }
    }
    
    // Зодіакальні кнопки
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

// Функції обробки різних типів розкладів (залишаємо без змін)
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

// ОНОВЛЕНА ФУНКЦІЯ З РЕАЛЬНИМИ ЦІНАМИ МІА
async function handleConsultationOrder(chatId) {
    const orderMessage = `📞 **ЗАМОВЛЕННЯ КОНСУЛЬТАЦІЇ**

🔮 **ПОПУЛЯРНІ ПОСЛУГИ:**

💎 **1 питання** - 70 грн (спеціальна ціна!)
Швидка відповідь на конкретне питання

💝 **Любовний прогноз** - 280 грн  
Детальний розклад про стосунки та кохання

🎯 **Кар'єра і фінанси** - 350 грн
Професійне керівництво та поради

🌟 **ТЕМАТИЧНІ ПАКЕТИ:**

• **"Про себе"** (6 питань) - 450 грн
• **"Стосунки"** (6 питань) - 390 грн  
• **"Бізнес"** (6 питань) - 400 грн
• **"Я та оточення"** (3 питання) - 300 грн

⭐ **СПЕЦІАЛЬНІ ПОСЛУГИ:**

• **Персональна матриця** - 570 грн
• **Матриця сумісності** - 550 грн
• **Аркан на рік** - 560 грн

🎁 **ЗНИЖКИ:**
• Новим клієнтам -30% (промокод: NEWCLIENT)
• Постійним клієнтам -15%

📱 **Як замовити:**
1. Перейдіть на сайт
2. Оберіть послугу  
3. Вкажіть зручний час
4. Отримайте професійну консультацію

✨ Індивідуальний підхід до кожного клієнта!`;

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

// ОНОВЛЕНА ФУНКЦІЯ СПЕЦІАЛЬНИХ ПРОПОЗИЦІЙ
async function handleSpecialOffers(chatId) {
    const offers = `🎁 **СПЕЦІАЛЬНІ ПРОПОЗИЦІЇ**

✨ **Акція "Перше питання"**
70 грн замість 100 грн (-30%!)
*Промокод: NEWCLIENT*

💝 **Пакет "Кохання і гармонія"**
Любовний прогноз + "Я та оточення" = 550 грн (замість 580)

🌟 **Тематичні пакети зі знижкою:**
• "Про себе" - 450 грн (6 глибоких питань)
• "Стосунки" - 390 грн (повний аналіз відносин)
• "Бізнес" - 400 грн (кар'єрне керівництво)

🎯 **VIP послуги:**
• Персональна матриця - 570 грн
• Матриця сумісності - 550 грн
• Аркан на рік - 560 грн

📱 **Бонус за підписку в Instagram:**
Щомісячний безкоштовний мікро-розклад!

⏰ *Спеціальна ціна 70 грн діє для всіх нових клієнтів!*`;

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

🌟 *Для детального аналізу замовте персональну консультацію всього за 70 грн!*`;

    await bot.sendMessage(chatId, response, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: '📞 Детальна консультація', url: 'https://theglamstyle.com.ua' }
            ]]
        }
    });
}

// Допоміжні функції
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
    const gptStats = getChatGPTStats();
    
    const statsMessage = `📊 **ЩОДЕННА СТАТИСТИКА**

👥 **Користувачі:**
• Всього: ${stats.totalUsers}
• Активні сьогодні: ${stats.activeToday}  
• Нові сьогодні: ${stats.newToday}

🤖 **ChatGPT сьогодні:**
• Успішність: ${gptStats.successRate}%
• Статус: ${process.env.OPENAI_API_KEY ? '✅ Активний' : '❌ Неактивний'}

📈 Зростання: ${stats.newToday > 0 ? '+' : ''}${stats.newToday} користувачів`;

    await bot.sendMessage(ADMIN_CHAT_ID, statsMessage, { parse_mode: 'Markdown' });
});

// Запуск бота
async function startBot() {
    await loadUserData();
    
    // Запуск ChatGPT автопостів замість старих
    scheduleSmartPosts(bot, CHANNEL_ID);
    
    console.log('🤖 Telegram бот MiaxiaLip запущено!');
    console.log('🧠 ChatGPT інтеграція активна');
    console.log('📅 Розклад розумних постів активовано');
    console.log('📊 Статистика збирається');
    
    // Перевірка ChatGPT
    const hasOpenAI = process.env.OPENAI_API_KEY ? '✅' : '❌';
    console.log(`🔑 ChatGPT API: ${hasOpenAI}`);
    
    // Повідомлення адміну про запуск
    await bot.sendMessage(ADMIN_CHAT_ID, `🚀 Бот MiaxiaLip запущено!
✅ Всі системи працюють
🧠 ChatGPT: ${hasOpenAI}
📅 Розумні пости активні

💰 Оновлені ціни:
• 1 питання: 70 грн (спеціальна ціна)
• Пакети: 280-450 грн
• Матриці: 550-570 грн

Команди адміна:
/admin - панель керування
/test_gpt - тест ChatGPT
/post_now - пост зараз`);
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
