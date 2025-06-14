// Телеграм бот для таро MiaxiaLip - ЛІДОГЕНЕРАЦІЯ + ФОРМА ЗАМОВЛЕННЯ
// Роль: збір лідів, безкоштовні розклади, контент для каналу, ПРИЙОМ ЗАМОВЛЕНЬ
// Запуск: node tarot-bot.js

const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

// Безпечне підключення ChatGPT інтеграції
let chatGPTIntegration = null;
try {
    chatGPTIntegration = require('./chatgpt-integration');
    console.log('✅ ChatGPT інтеграція завантажена');
} catch (error) {
    console.log('⚠️ ChatGPT інтеграція недоступна:', error.message);
    // Створюємо заглушки
    chatGPTIntegration = {
        scheduleSmartPosts: () => console.log('ChatGPT автопости вимкнені'),
        testChatGPT: (bot, chatId) => {
            console.log('⚠️ ChatGPT тест заблокований - модуль недоступний');
            return Promise.resolve(false);
        },
        sendSmartPost: () => Promise.resolve(false),
        getChatGPTStats: () => ({ successRate: 0 })
    };
}

const { 
    scheduleSmartPosts, 
    testChatGPT, 
    sendSmartPost,
    getChatGPTStats 
} = chatGPTIntegration;

// Функція додавання обов'язкового футера до постів
function addMandatoryFooter(postText) {
    if (!postText || typeof postText !== 'string') return postText;
    
    const footer = `
🔮 Записатися на консультацію:
🌐 theglamstyle.com.ua
📱 Instagram: @miaxialip
🤖 Telegram бот: @miaxialiptarotbot`;
    
    // ЗАВЖДИ додаємо футер, навіть якщо контакти уже є
    // Спочатку видаляємо старі контакти, якщо є
    let cleanText = postText;
    
    // Видаляємо можливі старі футери
    cleanText = cleanText.replace(/🔮 Записатися на консультацію:[\s\S]*$/g, '');
    cleanText = cleanText.replace(/theglamstyle\.com\.ua[\s\S]*$/g, '');
    cleanText = cleanText.replace(/@miaxialip[\s\S]*$/g, '');
    cleanText = cleanText.replace(/@miaxialiptarotbot[\s\S]*$/g, '');
    
    // Прибираємо зайві пробіли в кінці
    cleanText = cleanText.trim();
    
    return cleanText + footer;
}

// Безпечна обгортка для відправки постів з автоматичним футером
async function sendSmartPostWithFooter(bot, channelId) {
    try {
        if (!sendSmartPost || typeof sendSmartPost !== 'function') {
            console.log('⚠️ ChatGPT недоступний для постів');
            return false;
        }
        
        const result = await sendSmartPost(bot, channelId);
        
        // ЗАВЖДИ додаємо контакти до кожного поста
        if (result && typeof result === 'string') {
            console.log('📬 Додаю обов\'язкові контакти до поста...');
            const correctedPost = addMandatoryFooter(result);
            
            // Відправляємо виправлений пост
            await bot.sendMessage(channelId, correctedPost);
            return correctedPost;
        }
        
        return result;
    } catch (error) {
        console.error('❌ Помилка відправки поста:', error);
        return false;
    }
}

// Безпечна обгортка для планування постів
function scheduleSmartPostsWithFooter(bot, channelId) {
    try {
        if (!scheduleSmartPosts) {
            console.log('⚠️ ChatGPT автопости недоступні');
            return;
        }
        
        // Перевизначаємо функцію sendSmartPost глобально для cron завдань
        if (chatGPTIntegration && chatGPTIntegration.sendSmartPost) {
            const originalSendSmartPost = chatGPTIntegration.sendSmartPost;
            chatGPTIntegration.sendSmartPost = async (bot, channelId) => {
                console.log('🤖 Генеруємо автопост...');
                const result = await originalSendSmartPost(bot, channelId);
                
                // ЗАВЖДИ додаємо контакти до автопостів
                if (result && typeof result === 'string') {
                    console.log('📬 Додаю обов\'язкові контакти до автопоста...');
                    const correctedPost = addMandatoryFooter(result);
                    await bot.sendMessage(channelId, correctedPost);
                    return correctedPost;
                }
                return result;
            };
        }
        
        scheduleSmartPosts(bot, channelId);
        console.log('✅ ChatGPT автопости з обов\'язковими контактами активні');
    } catch (error) {
        console.error('❌ Помилка планування автопостів:', error);
    }
}

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
// ЗМІНЕНО: новий канал Міа замість старого
const CHANNEL_ID = '@miaxiataro'; // https://t.me/miaxiataro

// Перевірка обов'язкових параметрів
if (!BOT_TOKEN || BOT_TOKEN === 'ВСТАВТЕ_ВАШ_ТОКЕН_БОТА_СЮДИ') {
    console.error('❌ Помилка: Не вказано токен бота в config.js');
    process.exit(1);
}

// Ініціалізація бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// База даних користувачів, лідів та замовлень
let users = new Map();
let leads = new Map();
let orders = new Map(); // Для збереження замовлень
let userSessions = new Map();

// Стани для форми замовлення
const ORDER_STATES = {
    WAITING_NAME: 'waiting_name',
    WAITING_PHONE: 'waiting_phone', 
    WAITING_SERVICE: 'waiting_service',
    WAITING_INSTAGRAM: 'waiting_instagram',
    CONFIRMING: 'confirming'
};

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

// ДОДАНО: Знаки зодіаку для гороскопу
const zodiacSigns = [
    { name: "♈ Овен", period: "21.03 - 19.04", element: "Вогонь", emoji: "🔥" },
    { name: "♉ Телець", period: "20.04 - 20.05", element: "Земля", emoji: "🌱" },
    { name: "♊ Близнюки", period: "21.05 - 20.06", element: "Повітря", emoji: "🌬️" },
    { name: "♋ Рак", period: "21.06 - 22.07", element: "Вода", emoji: "🌊" },
    { name: "♌ Лев", period: "23.07 - 22.08", element: "Вогонь", emoji: "🔥" },
    { name: "♍ Діва", period: "23.08 - 22.09", element: "Земля", emoji: "🌱" },
    { name: "♎ Терези", period: "23.09 - 22.10", element: "Повітря", emoji: "🌬️" },
    { name: "♏ Скорпіон", period: "23.10 - 21.11", element: "Вода", emoji: "🌊" },
    { name: "♐ Стрілець", period: "22.11 - 21.12", element: "Вогонь", emoji: "🔥" },
    { name: "♑ Козеріг", period: "22.12 - 19.01", element: "Земля", emoji: "🌱" },
    { name: "♒ Водолій", period: "20.01 - 18.02", element: "Повітря", emoji: "🌬️" },
    { name: "♓ Риби", period: "19.02 - 20.03", element: "Вода", emoji: "🌊" }
];

// Список послуг - ОНОВЛЕНО відповідно до нових цін
const SERVICES = {
    'individual': { name: '1 питання', price: 70, originalPrice: 100 },
    'love': { name: 'Любовний прогноз', price: 280, originalPrice: 350 },
    'career': { name: 'Кар\'єра і фінанси', price: 350, originalPrice: 400 },
    'full': { name: '"Про себе" (6 питань)', price: 400, originalPrice: 450 }, // ЗМІНЕНО: ціна з 450 на 400
    'relationship': { name: '"Стосунки" (6 питань)', price: 390, originalPrice: 450 },
    'business': { name: '"Бізнес" (6 питань)', price: 400, originalPrice: 450 },
    'environment': { name: '"Я та моє оточення"', price: 300, originalPrice: 350 }, // ДОДАНО: нова послуга
    'matrix': { name: 'Персональна матриця', price: 570, originalPrice: 650 },
    'compatibility': { name: 'Матриця сумісності', price: 550, originalPrice: 600 },
    'year': { name: 'Аркан на рік', price: 560, originalPrice: 600 }
};

// Функції для роботи з базою даних
async function saveUserData() {
    try {
        const data = {
            users: Array.from(users.entries()),
            leads: Array.from(leads.entries()),
            orders: Array.from(orders.entries()),
            lastSave: new Date().toISOString()
        };
        await fs.writeFile('users_leads_orders.json', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Помилка збереження даних:', error);
    }
}

async function loadUserData() {
    try {
        const data = await fs.readFile('users_leads_orders.json', 'utf8');
        const parsed = JSON.parse(data);
        users = new Map(parsed.users || []);
        leads = new Map(parsed.leads || []);
        orders = new Map(parsed.orders || []);
        console.log(`Завантажено ${users.size} користувачів, ${leads.size} лідів, ${orders.size} замовлень`);
    } catch (error) {
        console.log('Файл даних не знайдено, створюємо новий');
        users = new Map();
        leads = new Map();
        orders = new Map();
    }
}

// Функція збору лідів
function collectLead(chatId, user, action) {
    const leadData = {
        chatId: chatId,
        firstName: user.firstName || 'Невідомо',
        username: user.username || '',
        action: action,
        timestamp: new Date().toISOString(),
        readingsCount: leads.has(chatId) ? leads.get(chatId).readingsCount + 1 : 1
    };
    
    leads.set(chatId, leadData);
    
    // Сповістити адміна про активного ліда
    if (leadData.readingsCount >= 3) {
        bot.sendMessage(ADMIN_CHAT_ID, 
            `🔥 ГАРЯЧИЙ ЛІД!\n\n👤 ${leadData.firstName} (@${leadData.username})\n📊 Розкладів: ${leadData.readingsCount}\n💡 Готовий до замовлення!`)
            .catch(err => console.log('⚠️ Помилка сповіщення про гарячий лід:', err.message));
    }
    
    saveUserData();
}

// Функції генерації контенту
function getRandomCard() {
    return tarotCards[Math.floor(Math.random() * tarotCards.length)];
}

// ДОДАНО: Функція отримання випадкового знака зодіаку
function getRandomZodiacSign() {
    return zodiacSigns[Math.floor(Math.random() * zodiacSigns.length)];
}

// Клавіатури
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ['🔮 Безкоштовний розклад', '💝 Любовний прогноз'],
            ['⭐ Гороскоп на день', '🎯 Задати питання'],
            ['📞 Замовити консультацію', '⚡ Швидке замовлення'],
            ['💎 Про MiaxiaLip', '📺 Наш канал'],
            ['🎁 Спеціальні ціни']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

// ОНОВЛЕНО: клавіатура з новими послугами
const servicesKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '🔥 1 питання - 70 грн', callback_data: 'service_individual' },
                { text: '💝 Любовний - 280 грн', callback_data: 'service_love' }
            ],
            [
                { text: '🎯 Кар\'єра - 350 грн', callback_data: 'service_career' },
                { text: '🌟 "Про себе" - 400 грн', callback_data: 'service_full' }
            ],
            [
                { text: '💕 "Стосунки" - 390 грн', callback_data: 'service_relationship' },
                { text: '🏢 "Бізнес" - 400 грн', callback_data: 'service_business' }
            ],
            [
                { text: '👥 "Я та оточення" - 300 грн', callback_data: 'service_environment' },
                { text: '⭐ Матриця - 570 грн', callback_data: 'service_matrix' }
            ],
            [
                { text: '💫 Сумісність - 550 грн', callback_data: 'service_compatibility' },
                { text: '🎯 Аркан на рік - 560 грн', callback_data: 'service_year' }
            ],
            [
                { text: '🔙 Назад', callback_data: 'back_to_main' }
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
                { text: '📋 Замовлення', callback_data: 'admin_orders' },
                { text: '🔄 Оновити дані', callback_data: 'admin_restart' }
            ]
        ]
    }
};

// Обробники команд
bot.onText(/\/start/, async (msg) => {
    try {
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
• ⚡ Швидке замовлення консультації

🎁 **Спеціальна пропозиція:** персональна консультація всього 70 грн!

💫 Оберіть опцію з меню або напишіть ваше питання!`;

        await bot.sendMessage(chatId, welcomeMessage, mainKeyboard);
        
        // Сповіщення адміну про нового користувача
        try {
            await bot.sendMessage(ADMIN_CHAT_ID, `🆕 Новий користувач: ${firstName} (@${msg.from.username || 'без username'})`);
        } catch (error) {
            console.log('⚠️ Не вдалося сповістити адміна:', error.message);
        }
    } catch (error) {
        console.error('❌ Помилка в /start:', error);
    }
});

// Адмін команди
bot.onText(/\/admin/, async (msg) => {
    try {
        if (msg.chat.id.toString() === ADMIN_CHAT_ID) {
            await bot.sendMessage(ADMIN_CHAT_ID, '👑 Панель лідогенерації + замовлень:', adminKeyboard);
        }
    } catch (error) {
        console.error('❌ Помилка в /admin:', error);
    }
});

bot.on('message', async (msg) => {
    try {
        const chatId = msg.chat.id;
        const text = msg.text;
        
        // Ігноруємо команди
        if (!text || text.startsWith('/')) return;
        
        // Оновлюємо активність користувача
        if (users.has(chatId)) {
            const user = users.get(chatId);
            user.lastActivity = new Date().toISOString();
            users.set(chatId, user);
        }
        
        // Перевіряємо чи користувач в процесі замовлення
        if (userSessions.has(chatId) && userSessions.get(chatId).orderInProgress) {
            await handleOrderStep(chatId, text);
            return;
        }
        
        switch (text) {
            case '🔮 Безкоштовний розклад':
                await handleFreeReading(chatId);
                break;
                
            case '💝 Любовний прогноз':
                await handleLoveReading(chatId);
                break;
                
            case '⭐ Гороскоп на день':
                // ВИПРАВЛЕНО: додана функція гороскопу
                await handleHoroscope(chatId);
                break;
                
            case '🎯 Задати питання':
                await handleQuestionPrompt(chatId);
                break;
                
            case '📞 Замовити консультацію':
                await handleConsultationRedirect(chatId);
                break;
                
            case '⚡ Швидке замовлення':
                await startQuickOrder(chatId);
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
                await handleUserQuestion(chatId, text);
        }
    } catch (error) {
        console.error('❌ Помилка обробки повідомлення:', error);
    }
});

// НОВА ФУНКЦІЯ: ШВИДКЕ ЗАМОВЛЕННЯ
async function startQuickOrder(chatId) {
    try {
        const quickOrderMessage = `⚡ **ШВИДКЕ ЗАМОВЛЕННЯ**

🔮 Оберіть послугу, яка вас цікавить:

💎 Всі ціни зі знижкою для користувачів бота!`;

        await bot.sendMessage(chatId, quickOrderMessage, {
            parse_mode: 'Markdown',
            ...servicesKeyboard
        });
        
        // Збираємо лід
        if (users.has(chatId)) {
            collectLead(chatId, users.get(chatId), 'quick_order_started');
        }
    } catch (error) {
        console.error('❌ Помилка швидкого замовлення:', error);
    }
}

// Обробка кроків замовлення
async function handleOrderStep(chatId, text) {
    try {
        const session = userSessions.get(chatId);
        if (!session) return;
        
        const orderData = session.orderData;
        
        switch (session.orderState) {
            case ORDER_STATES.WAITING_NAME:
                orderData.name = text.trim();
                session.orderState = ORDER_STATES.WAITING_PHONE;
                await bot.sendMessage(chatId, '📱 **Вкажіть ваш номер телефону:**\n\nНаприклад: +380123456789', {parse_mode: 'Markdown'});
                break;
                
            case ORDER_STATES.WAITING_PHONE:
                orderData.phone = text.trim();
                session.orderState = ORDER_STATES.WAITING_INSTAGRAM;
                await bot.sendMessage(chatId, '📷 **Вкажіть ваш Instagram (ОБОВ\'ЯЗКОВО):**\n\nНаприклад: @username', {parse_mode: 'Markdown'});
                break;
                
            case ORDER_STATES.WAITING_INSTAGRAM:
                const instagramInput = text.trim();
                if (!instagramInput || instagramInput.toLowerCase() === 'немає' || instagramInput.length < 2) {
                    await bot.sendMessage(chatId, '❌ **Instagram обов\'язковий для заповнення!**\n\nБудь ласка, вкажіть ваш Instagram нікнейм (наприклад: @username):', {parse_mode: 'Markdown'});
                    return; // Не переходимо до наступного кроку
                }
                orderData.instagram = instagramInput;
                session.orderState = ORDER_STATES.CONFIRMING;
                await showOrderConfirmation(chatId, orderData);
                break;
        }
        
        userSessions.set(chatId, session);
    } catch (error) {
        console.error('❌ Помилка в handleOrderStep:', error);
    }
}

// Показ підтвердження замовлення
async function showOrderConfirmation(chatId, orderData) {
    try {
        const service = SERVICES[orderData.serviceKey];
        
        const confirmationMessage = `✅ **ПІДТВЕРДЖЕННЯ ЗАМОВЛЕННЯ**

👤 **Ім'я:** ${orderData.name}
📱 **Телефон:** ${orderData.phone}
🔮 **Послуга:** ${service.name}
💰 **Ціна:** ${service.price} грн ${service.originalPrice > service.price ? `(зі знижкою з ${service.originalPrice} грн)` : ''}
📷 **Instagram:** ${orderData.instagram}

💫 **Що далі:**
• Після підтвердження з вами зв'яжеться MiaxiaLip
• Оплата до консультації
• Тривалість: 20-30 хвилин
• Формат: голосові повідомлення/відео

Підтверджуєте замовлення?`;

        await bot.sendMessage(chatId, confirmationMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Підтверджую', callback_data: 'confirm_order' },
                        { text: '❌ Скасувати', callback_data: 'cancel_order' }
                    ],
                    [
                        { text: '✏️ Редагувати', callback_data: 'edit_order' }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error('❌ Помилка показу підтвердження:', error);
    }
}

// Підтвердження замовлення
async function confirmOrder(chatId) {
    try {
        const session = userSessions.get(chatId);
        if (!session) return;
        
        const orderData = session.orderData;
        const service = SERVICES[orderData.serviceKey];
        
        // Генеруємо ID замовлення
        const orderId = Date.now().toString();
        
        // Зберігаємо замовлення
        const orderRecord = {
            id: orderId,
            chatId: chatId,
            name: orderData.name,
            phone: orderData.phone,
            service: service.name,
            price: service.price,
            instagram: orderData.instagram,
            status: 'new',
            timestamp: new Date().toISOString(),
            source: 'Telegram бот (лідогенерація)'
        };
        
        orders.set(orderId, orderRecord);
        
        // Відправляємо замовлення адміну (в форматі як з сайту)
        const adminNotification = `🔔 **Нове замовлення з бота лідогенерації!**

👤 **Ім'я:** ${orderData.name}
📱 **Телефон:** ${orderData.phone}  
🔮 **Послуга:** ${service.name}
💰 **Ціна:** ${service.price} грн
📷 **Instagram:** ${orderData.instagram}

🤖 **Джерело:** Telegram бот @miaxialip_tarot_bot
📅 **Дата подачі:** ${new Date().toLocaleString('uk-UA')}
🆔 **ID замовлення:** ${orderId}

📞 **Дії:** Зв'яжіться з клієнтом для уточнення деталей`;

        try {
            await bot.sendMessage(ADMIN_CHAT_ID, adminNotification, {parse_mode: 'Markdown'});
        } catch (error) {
            console.error('❌ Помилка сповіщення адміна:', error);
        }
        
        // ВИДАЛЕНО: відправка в старий бот, тепер всі замовлення тільки в @miaxialip_tarot_bot
        
        // Повідомляємо користувача
        await bot.sendMessage(chatId, `🎉 **ЗАМОВЛЕННЯ ПІДТВЕРДЖЕНО!**

✅ Ваше замовлення №${orderId} прийнято

📞 **З вами зв'яжеться MiaxiaLip протягом 2-3 годин**

💰 **Оплата:** до консультації
⏰ **Тривалість:** 20-30 хвилин  
📱 **Формат:** голосові повідомлення або відео

🙏 Дякуємо за довіру! Незабаром ви отримаєте відповіді на свої питання!

📺 Підписуйтесь на наш канал: @miaxiataro`, {
            parse_mode: 'Markdown',
            reply_markup: mainKeyboard.reply_markup
        });
        
        // Очищаємо сесію
        userSessions.delete(chatId);
        
        // Зберігаємо дані
        await saveUserData();
        
        // Збираємо лід як конверсію
        if (users.has(chatId)) {
            collectLead(chatId, users.get(chatId), 'order_completed');
        }
    } catch (error) {
        console.error('❌ Помилка підтвердження замовлення:', error);
    }
}

// ДОДАНО: Функція гороскопу
async function handleHoroscope(chatId) {
    try {
        const sign = getRandomZodiacSign();
        const card = getRandomCard();
        
        const horoscope = `⭐ **ГОРОСКОП НА ДЕНЬ**

${sign.emoji} **${sign.name}** (${sign.period})

🔮 **Карта дня:** ${card.emoji} ${card.name}

✨ **Прогноз:** ${card.meaning}

${sign.element === 'Вогонь' ? '🔥 **Енергія вогню:** Сьогодні ваша енергія на піку! Використовуйте це для важливих справ.' :
  sign.element === 'Земля' ? '🌱 **Енергія землі:** День для практичних рішень та стабільності.' :
  sign.element === 'Повітря' ? '🌬️ **Енергія повітря:** Відмінний час для спілкування та нових ідей.' :
  '🌊 **Енергія води:** Довіряйте інтуїції та емоціям сьогодні.'}

💫 *Це загальний прогноз. Для персонального гороскопу замовте консультацію!*

🎁 **Потрібен персональний прогноз?** Консультація всього 70 грн!`;

        await bot.sendMessage(chatId, horoscope, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⚡ Персональний прогноз - 70 грн', callback_data: 'service_individual' }],
                    [{ text: '⭐ Інший знак', callback_data: 'another_horoscope' }]
                ]
            }
        });
        
        // Збираємо лід
        if (users.has(chatId)) {
            collectLead(chatId, users.get(chatId), 'horoscope_reading');
        }
    } catch (error) {
        console.error('❌ Помилка гороскопу:', error);
    }
}

// Звіт по лідах
async function generateLeadsReport() {
    const leadsArray = Array.from(leads.values());
    const hotLeads = leadsArray.filter(lead => lead.readingsCount >= 3);
    
    let report = `👥 **ЗВІТ ПО ЛІДАХ**

📊 **Загальна статистика:**
• Всього лідів: ${leadsArray.length}
• Гарячі ліди: ${hotLeads.length}

🔥 **Гарячі ліди (3+ дії):**\n`;
    
    if (hotLeads.length > 0) {
        hotLeads.slice(-10).forEach(lead => {
            const lastActivity = new Date(lead.timestamp).toLocaleDateString('uk-UA');
            report += `• ${lead.firstName} (@${lead.username}) - ${lead.readingsCount} дій - ${lastActivity}\n`;
        });
    } else {
        report += '• Поки немає гарячих лідів\n';
    }
    
    report += `\n📈 **Останні дії лідів:**\n`;
    leadsArray.slice(-5).forEach(lead => {
        const date = new Date(lead.timestamp).toLocaleDateString('uk-UA');
        report += `• ${lead.firstName} - ${lead.action} - ${date}\n`;
    });
    
    return report;
}

// Обробка callback кнопок
bot.on('callback_query', async (callbackQuery) => {
    try {
        const message = callbackQuery.message;
        const data = callbackQuery.data;
        const chatId = message.chat.id;
        
        // ДОДАНО: обробка повторного гороскопу
        if (data === 'another_horoscope') {
            await handleHoroscope(chatId);
            await bot.answerCallbackQuery(callbackQuery.id);
            return;
        }
        
        // Сервіси
        if (data.startsWith('service_')) {
            const serviceKey = data.replace('service_', '');
            const service = SERVICES[serviceKey];
            
            if (service) {
                // Початок процесу замовлення
                const orderData = {
                    serviceKey: serviceKey,
                    name: '',
                    phone: '',
                    instagram: ''
                };
                
                userSessions.set(chatId, {
                    orderInProgress: true,
                    orderState: ORDER_STATES.WAITING_NAME,
                    orderData: orderData
                });
                
                await bot.editMessageText(`📝 **ЗАМОВЛЕННЯ: ${service.name.toUpperCase()}**

💰 **Ціна:** ${service.price} грн ${service.originalPrice > service.price ? `(зі знижкою з ${service.originalPrice} грн)` : ''}

👤 **Вкажіть ваше ім'я:**`, {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
            }
        }
        
        // Підтвердження замовлення
        if (data === 'confirm_order') {
            await confirmOrder(chatId);
        }
        
        if (data === 'cancel_order') {
            userSessions.delete(chatId);
            await bot.editMessageText('❌ Замовлення скасовано', {
                chat_id: chatId,
                message_id: message.message_id
            });
        }
        
        if (data === 'edit_order') {
            // Перезапускаємо процес замовлення
            const session = userSessions.get(chatId);
            if (session) {
                session.orderState = ORDER_STATES.WAITING_NAME;
                userSessions.set(chatId, session);
                
                await bot.editMessageText(`✏️ **РЕДАГУВАННЯ ЗАМОВЛЕННЯ**

👤 **Вкажіть ваше ім'я:**`, {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
            }
        }
        
        // Адмін кнопки
        if (data.startsWith('admin_') && chatId.toString() === ADMIN_CHAT_ID) {
            switch (data) {
                case 'admin_test_gpt':
                    try {
                        await bot.editMessageText('🧪 Тестую ChatGPT...', {
                            chat_id: chatId,
                            message_id: message.message_id
                        });
                        
                        // Безпечна перевірка наявності функції
                        if (!testChatGPT || typeof testChatGPT !== 'function') {
                            await bot.editMessageText(`🧪 **ТЕСТ CHATGPT**\n\n❌ ChatGPT модуль недоступний!`, {
                                chat_id: chatId,
                                message_id: message.message_id,
                                parse_mode: 'Markdown'
                            });
                            break;
                        }
                        
                        const testResult = await testChatGPT(bot, chatId);
                        await bot.editMessageText(`🧪 **ТЕСТ CHATGPT**\n\n${testResult ? '✅ ChatGPT працює!' : '❌ ChatGPT недоступний!'}`, {
                            chat_id: chatId,
                            message_id: message.message_id,
                            parse_mode: 'Markdown'
                        });
                    } catch (error) {
                        await bot.editMessageText(`❌ **Помилка тесту ChatGPT:**\n\n${error.message}`, {
                            chat_id: chatId,
                            message_id: message.message_id,
                            parse_mode: 'Markdown'
                        });
                    }
                    break;
                    
                case 'admin_post_now':
                    try {
                        await bot.editMessageText('📝 Генерую пост + додаю контакти...', {
                            chat_id: chatId,
                            message_id: message.message_id
                        });
                        
                        const postResult = await sendSmartPostWithFooter(bot, CHANNEL_ID);
                        await bot.editMessageText(`📝 **ПОСТ ВІДПРАВЛЕНО**\n\n${postResult ? '✅ Пост опублікований в каналі @miaxiataro!\n📬 Контакти додано автоматично!' : '❌ Помилка публікації або ChatGPT недоступний!'}`, {
                            chat_id: chatId,
                            message_id: message.message_id,
                            parse_mode: 'Markdown'
                        });
                    } catch (error) {
                        await bot.editMessageText(`❌ **Помилка публікації:**\n\n${error.message}`, {
                            chat_id: chatId,
                            message_id: message.message_id,
                            parse_mode: 'Markdown'
                        });
                    }
                    break;
                    
                case 'admin_leads':
                    const leadsReport = await generateLeadsReport();
                    await bot.editMessageText(leadsReport, {
                        chat_id: chatId,
                        message_id: message.message_id,
                        parse_mode: 'Markdown'
                    });
                    break;
                    
                case 'admin_orders':
                    const ordersReport = await generateOrdersReport();
                    await bot.editMessageText(ordersReport, {
                        chat_id: chatId,
                        message_id: message.message_id,
                        parse_mode: 'Markdown'
                    });
                    break;
                    
                case 'admin_restart':
                    try {
                        await bot.editMessageText('🔄 Оновлюю дані...', {
                            chat_id: chatId,
                            message_id: message.message_id
                        });
                        
                        // Зберігаємо всі дані
                        await saveUserData();
                        
                        // Перезавантажуємо дані
                        await loadUserData();
                        
                        // Очищаємо кеші та сесії
                        userSessions.clear();
                        
                        const stats = await getStatistics();
                        
                        await bot.editMessageText(`✅ **ДАНІ ОНОВЛЕНО**

📊 **Поточний стан:**
• Користувачів: ${stats.totalUsers}
• Лідів: ${stats.totalLeads}  
• Замовлень: ${stats.totalOrders}
• Активні сесії очищено

🔄 **Система працює стабільно!**
📬 **ГАРАНТІЯ:** Контакти додаються до ВСІХ постів автоматично`, {
                            chat_id: chatId,
                            message_id: message.message_id,
                            parse_mode: 'Markdown'
                        });
                    } catch (error) {
                        await bot.editMessageText(`❌ **Помилка оновлення:**\n\n${error.message}`, {
                            chat_id: chatId,
                            message_id: message.message_id,
                            parse_mode: 'Markdown'
                        });
                    }
                    break;
                    
                case 'admin_stats':
                    const stats = await getStatistics();
                    const gptStats = getChatGPTStats();
                    
                    const statsMessage = `📊 **СТАТИСТИКА ЛІДОГЕНЕРАЦІЇ + ЗАМОВЛЕНЬ**

👥 **Користувачі:**
• Всього: ${stats.totalUsers}
• Активні сьогодні: ${stats.activeToday}
• Нові сьогодні: ${stats.newToday}

🎯 **Ліди:**
• Всього лідів: ${stats.totalLeads}
• Гарячі ліди: ${stats.hotLeads}
• Конверсія: ${stats.conversionRate}%

📋 **Замовлення:**
• Всього замовлень: ${stats.totalOrders}
• Сьогодні: ${stats.ordersToday}
• Конверсія лідів: ${stats.orderConversionRate}%

🤖 **ChatGPT:**
• Успішність: ${gptStats.successRate}%

📺 **Канал:** @miaxiataro

⚙️ **Система:**
• Статус: ✅ Повний цикл (ліди → замовлення)
• Контакти: ✅ ГАРАНТОВАНО додаються до ВСІХ постів`;

                    await bot.editMessageText(statsMessage, {
                        chat_id: chatId,
                        message_id: message.message_id,
                        parse_mode: 'Markdown'
                    });
                    break;
            }
        }
        
        await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
        console.error('❌ Помилка callback:', error);
        try {
            await bot.answerCallbackQuery(callbackQuery.id);
        } catch (e) {
            console.error('❌ Помилка відповіді callback:', e);
        }
    }
});

// РЕШТА ФУНКЦІЙ (безкоштовні розклади і т.д.)
async function handleFreeReading(chatId) {
    try {
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
                    [{ text: '⚡ Швидке замовлення - 70 грн', callback_data: 'service_individual' }],
                    [{ text: '🌐 Замовити через сайт', url: 'https://theglamstyle.com.ua' }]
                ]
            }
        });
        
        // Збираємо лід
        if (users.has(chatId)) {
            collectLead(chatId, users.get(chatId), 'free_reading');
        }
    } catch (error) {
        console.error('❌ Помилка безкоштовного розкладу:', error);
    }
}

// Інші функції залишаємо без змін...
async function handleLoveReading(chatId) {
    try {
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
                    [{ text: '⚡ Замовити любовний розклад', callback_data: 'service_love' }],
                    [{ text: '🌐 Замовити через сайт', url: 'https://theglamstyle.com.ua' }]
                ]
            }
        });
        
        if (users.has(chatId)) {
            collectLead(chatId, users.get(chatId), 'love_reading');
        }
    } catch (error) {
        console.error('❌ Помилка любовного прогнозу:', error);
    }
}

async function handleUserQuestion(chatId, question) {
    try {
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
                    [{ text: '⚡ Замовити консультацію - 70 грн', callback_data: 'service_individual' }],
                    [{ text: '🔮 Ще одне питання', callback_data: 'ask_another' }]
                ]
            }
        });
        
        if (users.has(chatId)) {
            collectLead(chatId, users.get(chatId), 'question_asked');
        }
    } catch (error) {
        console.error('❌ Помилка відповіді на питання:', error);
    }
}

async function handleQuestionPrompt(chatId) {
    try {
        const promptMessage = `🎯 **ЗАДАЙТЕ ВАШЕ ПИТАННЯ**

Напишіть своє питання, і я дам вам безкоштовну відповідь через карти Таро!

💡 **Приклади питань:**
• Чи варто міняти роботу?
• Як покращити стосунки?
• Що мене чекає цього місяця?
• Чи правильно я роблю?

✨ Просто напишіть своє питання наступним повідомленням!`;

        await bot.sendMessage(chatId, promptMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('❌ Помилка промпту питання:', error);
    }
}

async function handleConsultationRedirect(chatId) {
    try {
        const redirectMessage = `📞 **ПЕРСОНАЛЬНА КОНСУЛЬТАЦІЯ**

🎁 **СПЕЦІАЛЬНА ПРОПОЗИЦІЯ:** 70 грн!

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
                    [{ text: '⚡ Швидке замовлення в боті', callback_data: 'service_individual' }],
                    [{ text: '🌐 Замовити через сайт', url: 'https://theglamstyle.com.ua' }],
                    [{ text: '📱 Написати в Instagram', url: 'https://instagram.com/miaxialip' }]
                ]
            }
        });
        
        if (users.has(chatId)) {
            collectLead(chatId, users.get(chatId), 'consultation_interest');
        }
    } catch (error) {
        console.error('❌ Помилка редіректу консультації:', error);
    }
}

// ОНОВЛЕНО: функція промо каналу без згадування ChatGPT
async function handleChannelPromo(chatId) {
    try {
        const channelMessage = `📺 **НАШ TELEGRAM КАНАЛ**

🔮 Підписуйтесь на @miaxiataro!

✨ **Що вас чекає:**
• Щоденні розклади та прогнози
• Мотиваційні пости про духовність  
• Астрологічні інсайти та поради
• Любовні прогнози
• Корисна інформація про астрологічні періоди року
• Підказки в ретроградні періоди планет
• Застереження та рекомендації під час складних транзитів
• Практики самопізнання
• Багато іншої корисної інформації

💫 Приєднуйтесь до нашої спільноти духовного розвитку!`;

        await bot.sendMessage(chatId, channelMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📺 Підписатися на канал', url: 'https://t.me/miaxiataro' }],
                    [{ text: '📱 Instagram', url: 'https://instagram.com/miaxialip' }]
                ]
            }
        });
    } catch (error) {
        console.error('❌ Помилка промо каналу:', error);
    }
}

// ОНОВЛЕНО: функція спеціальних цін з новими послугами та цінами
async function handleSpecialPrices(chatId) {
    try {
        const pricesMessage = `🎁 **СПЕЦІАЛЬНІ ЦІНИ ДЛЯ КОРИСТУВАЧІВ БОТА**

💎 **АКЦІЙНІ ПРОПОЗИЦІЇ:**

🔥 **1 питання** - 70 грн (замість 100!)
⚡ Замовлення по запису в найближчі для вас години

🎯 **"Про себе"** - 400 грн (замість 450!)
🌟 6 питань для самопізнання

💕 **"Стосунки"** - 390 грн (замість 450!)
💖 6 питань про ваші стосунки

🏢 **"Бізнес"** - 400 грн (замість 450!)
💼 6 питань про кар'єру та бізнес

👥 **"Я та моє оточення"** - 300 грн (замість 350!)
🤝 Аналіз взаємин з оточенням

⭐ **Персональна матриця** - 570 грн (замість 650!)
🔮 Повний аналіз особистості

🎁 **ЕКСКЛЮЗИВНО ДЛЯ БОТА:**
• Знижки до 30% на всі послуги
• Швидке оформлення замовлення
• Пріоритетне обслуговування

⏰ **Акція діє тільки через бот!**`;

        await bot.sendMessage(chatId, pricesMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⚡ Швидке замовлення', callback_data: 'quick_order' }],
                    [{ text: '🌐 Сайт (без знижок)', url: 'https://theglamstyle.com.ua' }]
                ]
            }
        });
    } catch (error) {
        console.error('❌ Помилка спеціальних цін:', error);
    }
}

async function handleAbout(chatId) {
    try {
        const aboutMessage = `💎 **ПРО MIAXIALIP**

🌟 Привіт! Я Міа - ваш провідник у світі Таро!

🔮 **Мій досвід:**
• 5+ років практики Таро
• Більше 2000+ консультацій
• Індивідуальний підхід до кожного
• Сучасні методи інтерпретації

✨ **Моя місія:** 
Допомогти вам знайти відповіді на важливі питання та віднайти свій унікальний шлях.

💫 **Що відрізняє мене:**
• Чесність та відкритість
• Практичні поради  
• Підтримка в складних ситуаціях
• Доступні ціни
• Анонімність гарантована

🌈 *Таро - це інструмент самопізнання, доступний кожному!*`;

        await bot.sendMessage(chatId, aboutMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📱 Instagram', url: 'https://instagram.com/miaxialip' }],
                    [{ text: '🌐 Сайт', url: 'https://theglamstyle.com.ua' }],
                    [{ text: '⚡ Замовити консультацію', callback_data: 'service_individual' }]
                ]
            }
        });
    } catch (error) {
        console.error('❌ Помилка про MiaxiaLip:', error);
    }
}

// Звіт по замовленнях
async function generateOrdersReport() {
    const ordersArray = Array.from(orders.values());
    const recentOrders = ordersArray.filter(order => {
        const orderDate = new Date(order.timestamp);
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        return orderDate > threeDaysAgo;
    });
    
    let report = `📋 **ЗВІТ ПО ЗАМОВЛЕННЯХ**

📊 **Загальна статистика:**
• Всього замовлень: ${ordersArray.length}
• За останні 3 дні: ${recentOrders.length}

💰 **Останні замовлення:**\n`;
    
    if (recentOrders.length > 0) {
        recentOrders.slice(-5).forEach(order => {
            const date = new Date(order.timestamp).toLocaleDateString('uk-UA');
            report += `• ${order.name} - ${order.service} (${order.price} грн) - ${date}\n`;
        });
    } else {
        report += '• Поки немає замовлень\n';
    }
    
    return report;
}

// Статистика
async function getStatistics() {
    const totalUsers = users.size;
    const totalLeads = leads.size;
    const totalOrders = orders.size;
    
    const activeToday = Array.from(users.values()).filter(user => {
        const lastActivity = new Date(user.lastActivity);
        const today = new Date();
        return lastActivity.toDateString() === today.toDateString();
    }).length;
    
    const ordersToday = Array.from(orders.values()).filter(order => {
        const orderDate = new Date(order.timestamp);
        const today = new Date();
        return orderDate.toDateString() === today.toDateString();
    }).length;
    
    const hotLeads = Array.from(leads.values()).filter(lead => lead.readingsCount >= 3).length;
    const conversionRate = totalUsers > 0 ? ((totalLeads / totalUsers) * 100).toFixed(1) : 0;
    const orderConversionRate = totalLeads > 0 ? ((totalOrders / totalLeads) * 100).toFixed(1) : 0;
    
    return {
        totalUsers,
        totalLeads,
        totalOrders,
        hotLeads,
        conversionRate,
        orderConversionRate,
        activeToday,
        ordersToday,
        newToday: Array.from(users.values()).filter(user => {
            const joinDate = new Date(user.joinDate);
            const today = new Date();
            return joinDate.toDateString() === today.toDateString();
        }).length
    };
}

// Запуск бота
async function startBot() {
    await loadUserData();
    
    // Запуск ChatGPT автопостів з обов'язковими контактами
    scheduleSmartPostsWithFooter(bot, CHANNEL_ID);
    
    console.log('🤖 Повний цикл бота MiaxiaLip запущено!');
    console.log('🎯 Лідогенерація + Прийом замовлень активні');
    console.log('🧠 ChatGPT контент для каналу @miaxiataro активний');
    console.log('📊 Статистика збирається');
    console.log('📬 ОБОВ\'ЯЗКОВІ контакти додаються до ВСІХ постів');
    
    const hasOpenAI = process.env.OPENAI_API_KEY ? '✅' : '❌';
    const hasChatGPT = chatGPTIntegration && chatGPTIntegration.sendSmartPost !== (() => Promise.resolve(false)) ? '✅' : '❌';
    console.log(`🔑 ChatGPT API: ${hasOpenAI}`);
    console.log(`🧠 ChatGPT модуль: ${hasChatGPT}`);
    
    try {
        await bot.sendMessage(ADMIN_CHAT_ID, `🚀 Повний цикл бота запущено!

🎯 **Функції:**
• ✅ Лідогенерація (безкоштовні розклади)
• ✅ Прийом замовлень (тільки в @miaxialip_tarot_bot)
• ${hasChatGPT} ChatGPT контент для каналу @miaxiataro
• ✅ Аналітика лідів та замовлень
• ✅ Гороскоп на день відновлено
• ✅ КОНТАКТИ ДОДАЮТЬСЯ ДО ВСІХ ПОСТІВ АВТОМАТИЧНО

📊 **Поточна статистика:**
• Користувачів: ${users.size}
• Лідів: ${leads.size}
• Замовлень: ${orders.size}

🔗 **Повний цикл:**
Канал @miaxiataro → Бот → Безкоштовний розклад → Замовлення → Сповіщення адміну

📬 **ГАРАНТІЯ:** Кожен пост ChatGPT матиме контакти!

Команди:
/admin - повна панель керування`);
    } catch (error) {
        console.error('❌ Помилка сповіщення про запуск:', error);
    }
}

// Щоденна статистика (21:00)
cron.schedule('0 21 * * *', async () => {
    try {
        const stats = await getStatistics();
        const gptStats = getChatGPTStats();
        
        const statsMessage = `📊 **ЩОДЕННА СТАТИСТИКА ПОВНОГО ЦИКЛУ**

👥 **Користувачі:** ${stats.totalUsers} (+${stats.newToday})
🎯 **Ліди:** ${stats.totalLeads} (конверсія ${stats.conversionRate}%)
📋 **Замовлення:** ${stats.totalOrders} (+${stats.ordersToday}) (конверсія ${stats.orderConversionRate}%)
🔥 **Гарячі ліди:** ${stats.hotLeads}

🤖 **ChatGPT:** ${gptStats.successRate}% успішність
📺 **Канал:** @miaxiataro
📬 **Контакти:** ГАРАНТОВАНО в КОЖНОМУ пості
⚡ **Ефективність:** повний цикл працює`;

        await bot.sendMessage(ADMIN_CHAT_ID, statsMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('❌ Помилка щоденної статистики:', error);
    }
});

// Обробка помилок
process.on('unhandledRejection', (error) => {
    console.error('Необроблена помилка:', error);
});

process.on('SIGINT', async () => {
    console.log('🛑 Зупинка повного циклу бота...');
    await saveUserData();
    try {
        await bot.sendMessage(ADMIN_CHAT_ID, '⏹️ Повний цикл бота зупинено');
    } catch (error) {
        console.error('❌ Помилка сповіщення про зупинку:', error);
    }
    process.exit(0);
});

startBot();
