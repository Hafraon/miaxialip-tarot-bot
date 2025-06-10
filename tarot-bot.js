// Телеграм бот для таро MiaxiaLip - ЛІДОГЕНЕРАЦІЯ + ФОРМА ЗАМОВЛЕННЯ
// Роль: збір лідів, безкоштовні розклади, контент для каналу, ПРИЙОМ ЗАМОВЛЕНЬ
// Запуск: node tarot-bot.js

const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

// Wrapper функція для відправки постів з обов'язковим футером
async function sendChannelPostWithFooter(bot, channelId, text, options = {}) {
    const textWithFooter = addMandatoryFooter(text);
    return await bot.sendMessage(channelId, textWithFooter, options);
}

// Перевизначаємо sendSmartPost щоб завжди додавати футер
const originalSendSmartPost = sendSmartPost;
async function sendSmartPostWithFooter(bot, channelId) {
    try {
        // Спочатку генеруємо пост
        const result = await originalSendSmartPost(bot, channelId);
        
        // Якщо пост не містить контактів - це помилка, виправляємо
        if (result && typeof result === 'string' && !result.includes('theglamstyle.com.ua')) {
            console.log('⚠️ Пост без контактів, додаю футер...');
            const correctedPost = addMandatoryFooter(result);
            await bot.sendMessage(channelId, correctedPost);
            return correctedPost;
        }
        
        return result;
    } catch (error) {
        console.error('❌ Помилка відправки поста:', error);
        return false;
    }
}

// Підключення ChatGPT інтеграції (безпечно)
let chatGPTIntegration = null;
try {
    chatGPTIntegration = require('./chatgpt-integration');
    console.log('✅ ChatGPT інтеграція завантажена');
} catch (error) {
    console.log('⚠️ ChatGPT інтеграція недоступна:', error.message);
    // Створюємо заглушки
    chatGPTIntegration = {
        scheduleSmartPosts: () => console.log('ChatGPT автопости вимкнені'),
        testChatGPT: () => Promise.resolve(false),
        sendSmartPost: () => Promise.resolve(false),
        getChatGPTStats: () => ({ successRate: 0 })
    };
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
const CHANNEL_ID = config.telegram.channelId;
const OLD_BOT_CHAT_ID = '603047391'; // Chat ID для старого бота (числовий формат)

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

// Список послуг
const SERVICES = {
    'individual': { name: '1 питання', price: 70, originalPrice: 100 },
    'love': { name: 'Любовний прогноз', price: 280, originalPrice: 350 },
    'career': { name: 'Кар\'єра і фінанси', price: 350, originalPrice: 400 },
    'full': { name: '"Про себе" (6 питань)', price: 450, originalPrice: 500 },
    'relationship': { name: '"Стосунки" (6 питань)', price: 390, originalPrice: 450 },
    'business': { name: '"Бізнес" (6 питань)', price: 400, originalPrice: 450 },
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
            `🔥 ГАРЯЧИЙ ЛІД!\n\n👤 ${leadData.firstName} (@${leadData.username})\n📊 Розкладів: ${leadData.readingsCount}\n💡 Готовий до замовлення!`);
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
            ['📞 Замовити консультацію', '⚡ Швидке замовлення'],
            ['💎 Про MiaxiaLip', '📺 Наш канал'],
            ['🎁 Спеціальні ціни']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

const servicesKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '🔥 1 питання - 70 грн', callback_data: 'service_individual' },
                { text: '💝 Любовний - 280 грн', callback_data: 'service_love' }
            ],
            [
                { text: '🎯 Кар\'єра - 350 грн', callback_data: 'service_career' },
                { text: '🌟 "Про себе" - 450 грн', callback_data: 'service_full' }
            ],
            [
                { text: '💕 "Стосунки" - 390 грн', callback_data: 'service_relationship' },
                { text: '🏢 "Бізнес" - 400 грн', callback_data: 'service_business' }
            ],
            [
                { text: '⭐ Матриця - 570 грн', callback_data: 'service_matrix' },
                { text: '💫 Сумісність - 550 грн', callback_data: 'service_compatibility' }
            ],
            [
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
• ⚡ Швидке замовлення консультації

🎁 **Спеціальна пропозиція:** перша персональна консультація всього 70 грн!

💫 Оберіть опцію з меню або напишіть ваше питання!`;

    await bot.sendMessage(chatId, welcomeMessage, mainKeyboard);
    
    // Сповіщення адміну про нового користувача
    await bot.sendMessage(ADMIN_CHAT_ID, `🆕 Новий користувач: ${firstName} (@${msg.from.username || 'без username'})`);
});

// Адмін команди
bot.onText(/\/admin/, async (msg) => {
    if (msg.chat.id.toString() === ADMIN_CHAT_ID) {
        await bot.sendMessage(ADMIN_CHAT_ID, '👑 Панель лідогенерації + замовлень:', adminKeyboard);
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
            await bot.sendMessage(chatId, '🌟 Функція гороскопу буде додана незабаром!');
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
            if (text && !text.startsWith('/')) {
                await handleUserQuestion(chatId, text);
            }
    }
});

// НОВА ФУНКЦІЯ: ШВИДКЕ ЗАМОВЛЕННЯ
async function startQuickOrder(chatId) {
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
}

// Обробка кроків замовлення
async function handleOrderStep(chatId, text) {
    const session = userSessions.get(chatId);
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
}

// Показ підтвердження замовлення
async function showOrderConfirmation(chatId, orderData) {
    const service = SERVICES[orderData.serviceKey];
    
    const confirmationMessage = `✅ **ПІДТВЕРДЖЕННЯ ЗАМОВЛЕННЯ**

👤 **Ім'я:** ${orderData.name}
📱 **Телефон:** ${orderData.phone}
🔮 **Послуга:** ${service.name}
💰 **Ціна:** ${service.price} грн ${service.originalPrice > service.price ? `(зі знижкою з ${service.originalPrice} грн)` : ''}
📷 **Instagram:** ${orderData.instagram}

💫 **Що далі:**
• Після підтвердження з вами зв'яжеться MiaxiaLip
• Оплата після консультації
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
}

// Підтвердження замовлення
async function confirmOrder(chatId) {
    const session = userSessions.get(chatId);
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

    await bot.sendMessage(ADMIN_CHAT_ID, adminNotification, {parse_mode: 'Markdown'});
    
    // ВІДПРАВЛЯЄМО в старий бот @MiaxiaTaro_bot
    const oldBotFormat = `🔔 Нове замовлення з сайту MiaxiaLip!

👤 Ім'я: ${orderData.name}
📱 Телефон: ${orderData.phone}
🔮 Послуга: ${service.name}
📷 Instagram: ${orderData.instagram}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Сайт: theglamstyle.com.ua
📅 Дата подачі: ${new Date().toLocaleString('uk-UA')}`;
    
    try {
        await bot.sendMessage(OLD_BOT_CHAT_ID, oldBotFormat);
        console.log('✅ Замовлення відправлено в старий бот @MiaxiaTaro_bot');
    } catch (error) {
        console.error('❌ Помилка відправки в старий бот:', error);
        // Альтернативно відправляємо адміну
        await bot.sendMessage(ADMIN_CHAT_ID, `⚠️ Не вдалося відправити замовлення в @MiaxiaTaro_bot:\n\n${oldBotFormat}`);
    }
    
    // Повідомляємо користувача
    await bot.sendMessage(chatId, `🎉 **ЗАМОВЛЕННЯ ПІДТВЕРДЖЕНО!**

✅ Ваше замовлення №${orderId} прийнято

📞 **З вами зв'яжеться MiaxiaLip протягом 2-3 годин**

💰 **Оплата:** після консультації
⏰ **Тривалість:** 20-30 хвилин  
📱 **Формат:** голосові повідомлення або відео

🙏 Дякуємо за довіру! Незабаром ви отримаєте відповіді на свої питання!

📺 Підписуйтесь на наш канал: @MiaxiaLipTarot`, {
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
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;
    
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
                    
                    const testResult = await testChatGPTSafe();
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
                    await bot.editMessageText('📝 Генерую пост...', {
                        chat_id: chatId,
                        message_id: message.message_id
                    });
                    
                    const postResult = await sendSmartPostSafe(bot, CHANNEL_ID);
                    
                    await bot.editMessageText(`📝 **ПОСТ ВІДПРАВЛЕНО**\n\n${postResult ? '✅ Пост опублікований в каналі з контактами!' : '❌ Помилка публікації або ChatGPT недоступний!'}`, {
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

⚠️ **Для повного перезапуску** використовуйте панель Railway.

🔄 **Система працює стабільно!**`, {
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
                const gptStats = getChatGPTStatsSafe();
                
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

⚙️ **Система:**
• Статус: ✅ Повний цикл (ліди → замовлення)`;

                await bot.editMessageText(statsMessage, {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                break;
        }
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
});

// РЕШТА ФУНКЦІЙ (безкоштовні розклади і т.д.)
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
                [{ text: '⚡ Швидке замовлення - 70 грн', callback_data: 'service_individual' }],
                [{ text: '🌐 Замовити через сайт', url: 'https://theglamstyle.com.ua' }]
            ]
        }
    });
    
    // Збираємо лід
    if (users.has(chatId)) {
        collectLead(chatId, users.get(chatId), 'free_reading');
    }
}

// Інші функції залишаємо без змін...
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
                [{ text: '⚡ Замовити любовний розклад', callback_data: 'service_love' }],
                [{ text: '🌐 Замовити через сайт', url: 'https://theglamstyle.com.ua' }]
            ]
        }
    });
    
    if (users.has(chatId)) {
        collectLead(chatId, users.get(chatId), 'love_reading');
    }
}

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
                [{ text: '⚡ Замовити консультацію - 70 грн', callback_data: 'service_individual' }],
                [{ text: '🔮 Ще одне питання', callback_data: 'ask_another' }]
            ]
        }
    });
    
    if (users.has(chatId)) {
        collectLead(chatId, users.get(chatId), 'question_asked');
    }
}

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
}

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
                [{ text: '⚡ Швидке замовлення в боті', callback_data: 'service_individual' }],
                [{ text: '🌐 Замовити через сайт', url: 'https://theglamstyle.com.ua' }],
                [{ text: '📱 Написати в Instagram', url: 'https://instagram.com/miaxialip' }]
            ]
        }
    });
    
    if (users.has(chatId)) {
        collectLead(chatId, users.get(chatId), 'consultation_interest');
    }
}

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

async function handleSpecialPrices(chatId) {
    const pricesMessage = `🎁 **СПЕЦІАЛЬНІ ЦІНИ ДЛЯ КОРИСТУВАЧІВ БОТА**

💎 **АКЦІЙНІ ПРОПОЗИЦІЇ:**

🔥 **1 питання** - 70 грн (замість 100!)
⚡ Швидка відповідь за 2-3 години

💝 **Любовний розклад** - 280 грн (замість 350!)
💕 Детальний аналіз стосунків

🎯 **"Про себе"** - 450 грн (замість 500!)
🌟 6 питань для самопізнання

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
}

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
                [{ text: '⚡ Замовити консультацію', callback_data: 'service_individual' }]
            ]
        }
    });
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
    
    // Запуск ChatGPT автопостів (якщо доступний)
    try {
        if (chatGPTIntegration && chatGPTIntegration.scheduleSmartPosts) {
            chatGPTIntegration.scheduleSmartPosts(bot, CHANNEL_ID);
            console.log('✅ ChatGPT автопости активні');
        } else {
            console.log('⚠️ ChatGPT автопости недоступні');
        }
    } catch (error) {
        console.log('⚠️ Помилка запуску ChatGPT автопостів:', error.message);
    }
    
    console.log('🤖 Повний цикл бота MiaxiaLip запущено!');
    console.log('🎯 Лідогенерація + Прийом замовлень активні');
    console.log('📊 Статистика збирається');
    console.log('🔗 Обов\'язковий футер з контактами додається до всіх постів');
    
    const hasOpenAI = process.env.OPENAI_API_KEY ? '✅' : '❌';
    const hasChatGPT = chatGPTIntegration ? '✅' : '❌';
    console.log(`🔑 ChatGPT API: ${hasOpenAI}`);
    console.log(`🧠 ChatGPT модуль: ${hasChatGPT}`);
    
    await bot.sendMessage(ADMIN_CHAT_ID, `🚀 Повний цикл бота запущено!

🎯 **Функції:**
• ✅ Лідогенерація (безкоштовні розклади)
• ✅ Прийом замовлень (інтеграція з системою)
• ${hasChatGPT} ChatGPT контент для каналу
• ✅ Аналітика лідів та замовлень
• ✅ Автоматичне додавання контактів до постів

📊 **Поточна статистика:**
• Користувачів: ${users.size}
• Лідів: ${leads.size}
• Замовлень: ${orders.size}

🔗 **Повний цикл:**
Канал → Бот → Безкоштовний розклад → Замовлення → Сповіщення адміну

Команди:
/admin - повна панель керування`);
}

// Щоденна статистика (21:00)
cron.schedule('0 21 * * *', async () => {
    const stats = await getStatistics();
    const gptStats = getChatGPTStatsSafe();
    
    const statsMessage = `📊 **ЩОДЕННА СТАТИСТИКА ПОВНОГО ЦИКЛУ**

👥 **Користувачі:** ${stats.totalUsers} (+${stats.newToday})
🎯 **Ліди:** ${stats.totalLeads} (конверсія ${stats.conversionRate}%)
📋 **Замовлення:** ${stats.totalOrders} (+${stats.ordersToday}) (конверсія ${stats.orderConversionRate}%)
🔥 **Гарячі ліди:** ${stats.hotLeads}

🤖 **ChatGPT:** ${gptStats.successRate}% успішність
⚡ **Ефективність:** повний цикл працює`;

    try {
        await bot.sendMessage(ADMIN_CHAT_ID, statsMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Помилка відправки щоденної статистики:', error);
    }
});

// Обробка помилок
process.on('unhandledRejection', (error) => {
    console.error('Необроблена помилка:', error);
});

process.on('SIGINT', async () => {
    console.log('🛑 Зупинка повного циклу бота...');
    await saveUserData();
    await bot.sendMessage(ADMIN_CHAT_ID, '⏹️ Повний цикл бота зупинено');
    process.exit(0);
});

startBot();
