// Телеграм бот для таро MiaxiaLip - ЛІДОГЕНЕРАЦІЯ + ChatGPT контент
// Роль: збір лідів, безкоштовні розклади, контент для каналу
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

// База даних користувачів та лідів
let users = new Map();
let leads = new Map(); // Для збору потенційних клієнтів
let userSessions = new Map();

// Картки Таро для безкоштовних розкладів
const tarotCards = [
    { name: "Дурень", meaning: "Нові початки, спонтанність, невинність", emoji: "🃏" },
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
            leads: Array.from(leads.entries()),
            lastSave: new Date().toISOString()
        };
        await fs.writeFile('users_leads.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Помилка збереження користувачів:', error);
    }
}

async function loadUserData() {
    try {
        const data = await fs.readFile('users_leads.json', 'utf8');
        const parsed = JSON.parse(data);
        users = new Map(parsed.users || []);
        leads = new Map(parsed.leads || []);
        console.log(`Завантажено ${users.size} користувачів та ${leads.size} лідів`);
    } catch (error) {
        console.log('Файл користувачів не знайдено, створюємо новий');
        users = new Map();
        leads = new Map();
    }
}

// Функція збору лідів
function collectLead(chatId, user, action) {
    const leadData = {
        chatId: chatId,
        firstName: user.firstName || 'Невідомо',
        username: user.username || '',
        action: action, // 'free_reading', 'consultation_interest', 'question_asked'
        timestamp: new Date().toISOString(),
        readingsCount: leads.has(chatId) ? leads.get(chatId).readingsCount + 1 : 1
    };
    
    leads.set(chatId, leadData);
    
    // Сповістити адміна про активного ліда
    if (leadData.readingsCount >= 3) {
        bot.sendMessage(ADMIN_CHAT_ID, 
            `🔥 ГАРЯЧИЙ ЛІД!\n\n👤 ${leadData.firstName} (@${leadData.username})\n📊 Розкладів: ${leadData.readingsCount}\n💡 Рекомендую зв'язатися!`);
    }
    
    saveUserData();
}

// Функції генерації контенту
function getRandomCard() {
    return tarotCards[Math.floor(Math.random() * tarotCards.length)];
}

// Клавіатури
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ['🔮 Безкоштовний розклад', '💝 Любовний прогноз'],
            ['⭐ Гороскоп на день', '🎯 Задати питання'],
            ['📞 Замовити консультацію', '💎 Про MiaxiaLip'],
            ['📺 Наш канал', '🎁 Спеціальні ціни']
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
                { text: '👥 Ліди', callback_data: 'admin_leads' }
            ],
            [
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

✨ Що можу для вас зробити:
• 🆓 Безкоштовний розклад Таро
• 💝 Любовний прогноз
• ⭐ Гороскоп за вашим знаком  
• 🎯 Відповідь на особисте питання

🎁 **Спеціальна пропозиція:** перша персональна консультація всього 70 грн!

💫 Оберіть опцію з меню або напишіть ваше питання!`;

    await bot.sendMessage(chatId, welcomeMessage, mainKeyboard);
    
    // Сповіщення адміну про нового користувача
    await bot.sendMessage(ADMIN_CHAT_ID, `🆕 Новий користувач: ${firstName} (@${msg.from.username || 'без username'})`);
});

// Адмін команди
bot.onText(/\/admin/, async (msg) => {
    if (msg.chat.id.toString() === ADMIN_CHAT_ID) {
        await bot.sendMessage(ADMIN_CHAT_ID, '👑 Панель лідогенерації:', adminKeyboard);
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
        case '🔮 Безкоштовний розклад':
            await handleFreeReading(chatId);
            break;
            
        case '💝 Любовний прогноз':
            await handleLoveReading(chatId);
            break;
            
        case '⭐ Гороскоп на день':
            await bot.sendMessage(chatId, '🌟 Оберіть ваш знак зодіаку:', zodiacKeyboard);
            break;
            
        case '🎯 Задати питання':
            await handleQuestionPrompt(chatId);
            break;
            
        case '📞 Замовити консультацію':
            await handleConsultationRedirect(chatId);
            break;
            
        case '💎 Про MiaxiaLip':
            await handleAbout(chatId);
            break;
            
        case '📺 Наш канал':
            await handleChannelPromo(chatId);
            break;
            
        case '🎁 Спеціальні ціни':
            await handleSpecialPrices(chatId);
            break;
            
        default:
            if (text && !text.startsWith('/')) {
                await handleUserQuestion(chatId, text);
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
                
                const statsMessage = `📊 **СТАТИСТИКА ЛІДОГЕНЕРАЦІЇ**

👥 **Користувачі:**
• Всього: ${stats.totalUsers}
• Активні сьогодні: ${stats.activeToday}
• Нові сьогодні: ${stats.newToday}

🎯 **Ліди:**
• Всього лідів: ${stats.totalLeads}
• Гарячі ліди: ${stats.hotLeads}
• Конверсія: ${stats.conversionRate}%

🤖 **ChatGPT:**
• Всього згенеровано: ${gptStats.totalGenerated}
• Успішність: ${gptStats.successRate}%

⚙️ **Система:**
• Статус ChatGPT: ${process.env.OPENAI_API_KEY ? '✅ Активний' : '❌ Неактивний'}
• Канал: ${CHANNEL_ID}`;

                await bot.editMessageText(statsMessage, {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                break;
                
            case 'admin_leads':
                const leadsReport = await generateLeadsReport();
                await bot.editMessageText(leadsReport, {
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
                        { text: '📞 Персональний гороскоп', url: 'https://theglamstyle.com.ua' }
                    ]]
                }
            });
            
            // Збираємо лід
            if (users.has(message.chat.id)) {
                collectLead(message.chat.id, users.get(message.chat.id), 'horoscope_viewed');
            }
        }
    }
    
    if (data === 'show_zodiac_menu') {
        await bot.editMessageText('🌟 Оберіть ваш знак зодіаку:', {
            chat_id: message.chat.id,
            message_id: message.message_id,
            reply_markup: zodiacKeyboard.reply_markup
        });
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
});

// ОСНОВНІ ФУНКЦІЇ ЛІДОГЕНЕРАЦІЇ

// Безкоштовний розклад (головний лід-магніт)
async function handleFreeReading(chatId) {
    const cards = [getRandomCard(), getRandomCard(), getRandomCard()];
    
    const reading = `🔮 **БЕЗКОШТОВНИЙ РОЗКЛАД НА ДЕНЬ**

🌅 **Ранок:** ${cards[0].emoji} ${cards[0].name}
${cards[0].meaning}

☀️ **День:** ${cards[1].emoji} ${cards[1].name}
${cards[1].meaning}

🌙 **Вечір:** ${cards[2].emoji} ${cards[2].name}
${cards[2].meaning}

💫 *Цей розклад допоможе вам краще зрозуміти енергії дня!*

🎁 **Сподобався розклад?** Персональна консультація всього 70 грн!`;

    await bot.sendMessage(chatId, reading, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '💝 Замовити персональну консультацію', url: 'https://theglamstyle.com.ua' }],
                [{ text: '🤖 Швидке замовлення', url: 'https://t.me/MiaxiaTaro_bot' }]
            ]
        }
    });
    
    // Збираємо лід
    if (users.has(chatId)) {
        collectLead(chatId, users.get(chatId), 'free_reading');
    }
}

// Любовний прогноз
async function handleLoveReading(chatId) {
    const cards = [getRandomCard(), getRandomCard()];
    
    const reading = `💝 **ЛЮБОВНИЙ ПРОГНОЗ**

💕 **Ваш стан у любові:** ${cards[0].emoji} ${cards[0].name}
${cards[0].meaning}

🌹 **Що очікує в стосунках:** ${cards[1].emoji} ${cards[1].name}
${cards[1].meaning}

✨ *Пам'ятайте: справжнє кохання починається з любові до себе!*

💖 **Хочете детальний любовний розклад?** Тільки 280 грн!`;

    await bot.sendMessage(chatId, reading, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '💝 Замовити любовний розклад', url: 'https://theglamstyle.com.ua' }],
                [{ text: '🤖 Швидке замовлення', url: 'https://t.me/MiaxiaTaro_bot' }]
            ]
        }
    });
    
    // Збираємо лід
    if (users.has(chatId)) {
        collectLead(chatId, users.get(chatId), 'love_reading');
    }
}

// Промпт для питання
async function handleQuestionPrompt(chatId) {
    const promptMessage = `🎯 **ЗАДАЙТЕ ВАШЕ ПИТАННЯ**

Напишіть своє питання, і я дам вам безкоштовну відповідь через карти Таро!

💡 **Приклади питань:**
• Чи варто міняти роботу?
• Як покращити стосунки?
• Що мене чекає цього місяця?
• Чи правильно я роблю?

✨ Просто напишіть своє питання наступним повідомленням!`;

    await bot.sendMessage(chatId, promptMessage, { parse_mode: 'Markdown' });
    
    // Встановлюємо статус очікування питання
    userSessions.set(chatId, { waitingForQuestion: true });
}

// Обробка питання користувача
async function handleUserQuestion(chatId, question) {
    const card = getRandomCard();
    
    const response = `🔮 **ВІДПОВІДЬ НА ВАШЕ ПИТАННЯ**

❓ **Питання:** "${question}"

🃏 **Карта-відповідь:** ${card.emoji} ${card.name}

✨ **Значення:** ${card.meaning}

💫 **Порада:** Ця карта радить довіряти своїй інтуїції. Відповідь вже є у вашому серці, потрібно лише прислухатися до неї.

🎁 **Потрібна детальна консультація?** Перша сесія всього 70 грн!`;

    await bot.sendMessage(chatId, response, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '💎 Замовити детальну консультацію', url: 'https://theglamstyle.com.ua' }],
                [{ text: '🤖 Швидке замовлення', url: 'https://t.me/MiaxiaTaro_bot' }],
                [{ text: '🔮 Ще одне питання', callback_data: 'ask_another' }]
            ]
        }
    });
    
    // Збираємо лід
    if (users.has(chatId)) {
        collectLead(chatId, users.get(chatId), 'question_asked');
    }
    
    // Очищаємо сесію
    userSessions.delete(chatId);
}

// Перенаправлення на замовлення (КЛЮЧОВА ФУНКЦІЯ)
async function handleConsultationRedirect(chatId) {
    const redirectMessage = `📞 **ПЕРСОНАЛЬНА КОНСУЛЬТАЦІЯ**

🎁 **СПЕЦІАЛЬНА ПРОПОЗИЦІЯ:** 70 грн замість 100!

🔮 **Що ви отримаєте:**
• Детальну відповідь на ваше питання
• Професійну інтерпретацію карт
• Практичні поради та рекомендації
• Індивідуальний підхід

⏱️ **Тривалість:** 20-30 хвилин
📱 **Формат:** голосові повідомлення або відео

🛒 **Як замовити:**`;

    await bot.sendMessage(chatId, redirectMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🌐 Замовити через сайт', url: 'https://theglamstyle.com.ua' }],
                [{ text: '🤖 Швидке замовлення в боті', url: 'https://t.me/MiaxiaTaro_bot' }],
                [{ text: '📱 Написати в Instagram', url: 'https://instagram.com/miaxialip' }]
            ]
        }
    });
    
    // Збираємо лід
    if (users.has(chatId)) {
        collectLead(chatId, users.get(chatId), 'consultation_interest');
    }
}

// Промо каналу
async function handleChannelPromo(chatId) {
    const channelMessage = `📺 **НАШ TELEGRAM КАНАЛ**

🔮 Підписуйтесь на @MiaxiaLipTarot!

✨ **Що вас чекає:**
• Щоденні розклади від ChatGPT
• Мотиваційні пости про духовність  
• Астрологічні інсайти
• Любовні прогнози
• Практики самопізнання

🎁 **Бонус для підписників:** щотижневий безкоштовний розклад!

💫 Приєднуйтесь до нашої спільноти духовного розвитку!`;

    await bot.sendMessage(chatId, channelMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📺 Підписатися на канал', url: 'https://t.me/MiaxiaLipTarot' }],
                [{ text: '📱 Instagram', url: 'https://instagram.com/miaxialip' }]
            ]
        }
    });
}

// Спеціальні ціни
async function handleSpecialPrices(chatId) {
    const pricesMessage = `🎁 **СПЕЦІАЛЬНІ ЦІНИ ДЛЯ ВАС**

💎 **АКЦІЙНІ ПРОПОЗИЦІЇ:**

🔥 **1 питання** - 70 грн (замість 100!)
⚡ Швидка відповідь за 2-3 години

💝 **Любовний розклад** - 280 грн
💕 Детальний аналіз стосунків

🎯 **"Про себе"** - 450 грн  
🌟 6 питань для самопізнання

⭐ **Персональна матриця** - 570 грн
🔮 Повний аналіз особистості

🎁 **БОНУСИ:**
• Новим клієнтам -30% 
• За підписку в Instagram - безкоштовний міні-розклад

⏰ **Акція діє обмежений час!**`;

    await bot.sendMessage(chatId, pricesMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🛒 Замовити зі знижкою', url: 'https://theglamstyle.com.ua' }],
                [{ text: '🤖 Замовити в боті', url: 'https://t.me/MiaxiaTaro_bot' }]
            ]
        }
    });
}

// Про MiaxiaLip
async function handleAbout(chatId) {
    const aboutMessage = `💎 **ПРО MIAXIALIP**

🌟 Привіт! Я Міа - ваш провідник у світі Таро!

🔮 **Мій досвід:**
• 5+ років практики Таро
• Більше 1000+ консультацій
• Індивідуальний підхід до кожного
• Сучасні методи інтерпретації

✨ **Моя місія:** 
Допомогти вам знайти відповіді на важливі питання та віднайти свій унікальний шлях.

💫 **Що відрізняє мене:**
• Чесність та відкритість
• Практичні поради  
• Підтримка в складних ситуаціях
• Доступні ціни

🌈 *Таро - це інструмент самопізнання, доступний кожному!*`;

    await bot.sendMessage(chatId, aboutMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📱 Instagram', url: 'https://instagram.com/miaxialip' }],
                [{ text: '🌐 Сайт', url: 'https://theglamstyle.com.ua' }],
                [{ text: '📞 Замовити консультацію', url: 'https://t.me/MiaxiaTaro_bot' }]
            ]
        }
    });
}

// Допоміжні функції
function getZodiacName(key) {
    const mapping = {
        'aries': 'овен', 'taurus': 'телець', 'gemini': 'близнюки',
        'cancer': 'рак', 'leo': 'лев', 'virgo': 'діва',
        'libra': 'терези', 'scorpio': 'скорпіон', 'sagittarius': 'стрілець',
        'capricorn': 'козеріг', 'aquarius': 'водолій', 'pisces': 'риби'
    };
    return mapping[key] || '';
}

function generateHoroscope(sign) {
    const horoscopes = [
        "Сьогодні зірки радять бути відкритими до нових можливостей",
        "День сприятливий для важливих рішень та змін",
        "Зосередьтесь на внутрішній гармонії та спокої",
        "Час для творчості та самовираження",
        "Довіряйте своїй інтуїції - вона не підведе"
    ];
    
    const horoscope = horoscopes[Math.floor(Math.random() * horoscopes.length)];
    
    return `${sign.emoji} **${sign.name.toUpperCase()}** (${sign.dates})

🌟 **Гороскоп на сьогодні:**
${horoscope}

💫 **Щасливий колір:** ${getRandomColor()}
🔢 **Щасливе число:** ${Math.floor(Math.random() * 9) + 1}

✨ *Хочете персональний гороскоп? Замовте консультацію!*`;
}

function getRandomColor() {
    const colors = ['🔴 Червоний', '🟠 Помаранчевий', '🟡 Жовтий', '🟢 Зелений', '🔵 Синій', '🟣 Фіолетовий'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Статистика лідогенерації
async function getStatistics() {
    const totalUsers = users.size;
    const totalLeads = leads.size;
    const activeToday = Array.from(users.values()).filter(user => {
        const lastActivity = new Date(user.lastActivity);
        const today = new Date();
        return lastActivity.toDateString() === today.toDateString();
    }).length;
    
    const hotLeads = Array.from(leads.values()).filter(lead => lead.readingsCount >= 3).length;
    const conversionRate = totalUsers > 0 ? ((totalLeads / totalUsers) * 100).toFixed(1) : 0;
    
    return {
        totalUsers,
        totalLeads,
        hotLeads,
        conversionRate,
        activeToday,
        newToday: Array.from(users.values()).filter(user => {
            const joinDate = new Date(user.joinDate);
            const today = new Date();
            return joinDate.toDateString() === today.toDateString();
        }).length
    };
}

// Звіт по лідах
async function generateLeadsReport() {
    const leadsArray = Array.from(leads.values());
    const hotLeads = leadsArray.filter(lead => lead.readingsCount >= 3);
    const recentLeads = leadsArray.filter(lead => {
        const leadDate = new Date(lead.timestamp);
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        return leadDate > threeDaysAgo;
    });
    
    let report = `🎯 **ЗВІТ ПО ЛІДАХ**

🔥 **Гарячі ліди (3+ розкладів):**\n`;
    
    hotLeads.slice(0, 5).forEach(lead => {
        report += `• ${lead.firstName} (@${lead.username}) - ${lead.readingsCount} розкладів\n`;
    });
    
    report += `\n📈 **Останні 3 дні:**\n`;
    recentLeads.slice(0, 5).forEach(lead => {
        report += `• ${lead.firstName} - ${lead.action}\n`;
    });
    
    report += `\n📊 **Загальна статистика:**
• Всього лідів: ${leadsArray.length}
• Гарячих лідів: ${hotLeads.length}
• За останні 3 дні: ${recentLeads.length}`;
    
    return report;
}

// Щоденна статистика для адміна (21:00)
cron.schedule('0 21 * * *', async () => {
    const stats = await getStatistics();
    const gptStats = getChatGPTStats();
    
    const statsMessage = `📊 **ЩОДЕННА СТАТИСТИКА ЛІДОГЕНЕРАЦІЇ**

👥 **Користувачі:**
• Всього: ${stats.totalUsers}
• Активні сьогодні: ${stats.activeToday}  
• Нові сьогодні: ${stats.newToday}

🎯 **Ліди:**
• Всього лідів: ${stats.totalLeads}
• Гарячі ліди: ${stats.hotLeads}
• Конверсія: ${stats.conversionRate}%

🤖 **ChatGPT:**
• Успішність: ${gptStats.successRate}%
• Статус: ${process.env.OPENAI_API_KEY ? '✅ Активний' : '❌ Неактивний'}

📈 Зростання: ${stats.newToday > 0 ? '+' : ''}${stats.newToday} користувачів`;

    await bot.sendMessage(ADMIN_CHAT_ID, statsMessage, { parse_mode: 'Markdown' });
});

// Запуск бота
async function startBot() {
    await loadUserData();
    
    // Запуск ChatGPT автопостів
    scheduleSmartPosts(bot, CHANNEL_ID);
    
    console.log('🤖 Бот лідогенерації MiaxiaLip запущено!');
    console.log('🧠 ChatGPT контент для каналу активний');
    console.log('🎯 Система збору лідів активна');
    console.log('📊 Статистика збирається');
    
    // Перевірка ChatGPT
    const hasOpenAI = process.env.OPENAI_API_KEY ? '✅' : '❌';
    console.log(`🔑 ChatGPT API: ${hasOpenAI}`);
    
    // Повідомлення адміну про запуск
    await bot.sendMessage(ADMIN_CHAT_ID, `🚀 Бот лідогенерації запущено!

🎯 **Роль:** Збір лідів + контент для каналу
✅ Всі системи працюють
🧠 ChatGPT: ${hasOpenAI}
📅 Розумні пости в канал активні

📊 **Поточна статистика:**
• Користувачів: ${users.size}
• Лідів: ${leads.size}

🔗 **Інтеграція:**
• Канал: ${CHANNEL_ID}
• Замовлення → @MiaxiaTaro_bot
• Сайт: theglamstyle.com.ua

Команди:
/admin - панель лідогенерації
/test_gpt - тест ChatGPT
/post_now - пост в канал`);
}

// Обробка помилок
process.on('unhandledRejection', (error) => {
    console.error('Необроблена помилка:', error);
});

process.on('SIGINT', async () => {
    console.log('🛑 Зупинка бота лідогенерації...');
    await saveUserData();
    await bot.sendMessage(ADMIN_CHAT_ID, '⏹️ Бот лідогенерації зупинено');
    process.exit(0);
});

// Запуск
startBot();
