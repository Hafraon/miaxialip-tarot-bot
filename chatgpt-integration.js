// chatgpt-integration.js
// ChatGPT інтеграція для лідогенерації з перенаправленням на основний бот замовлень

const axios = require('axios');

// API ключ з змінних середовища Railway (БЕЗПЕЧНО!)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Розумна генерація контенту через ChatGPT для лідогенерації
class TarotContentGenerator {
    constructor() {
        this.targetAudience = "жінки 25-45 років, які цікавляться духовністю та саморозвитком";
        this.brandName = "MiaxiaLip";
        this.contactInfo = {
            website: "https://theglamstyle.com.ua",
            instagram: "@miaxialip",
            orderBot: "@MiaxiaTaro_bot",  // Основний бот для замовлень
            leadBot: "@miaxialip_tarot_bot", // Цей бот для лідогенерації
            email: "miaxialip@gmail.com"
        };
    }

    // Основна функція генерації контенту для каналу з фокусом на лідогенерацію
    async generateTarotContent(type = 'motivation') {
        // Перевірка наявності API ключа
        if (!OPENAI_API_KEY) {
            console.error('❌ OPENAI_API_KEY не знайдено в змінних середовища Railway!');
            console.log('💡 Додайте API ключ в Railway Variables');
            return this.getFallbackContent(type);
        }

        const prompts = {
            motivation: `Створи мотиваційний пост для Telegram каналу про внутрішню силу та віру в себе. 
                        Аудиторія: ${this.targetAudience}. 
                        Стиль: тепло, підтримка, духовність, жіночність. 
                        Додай емодзі. Максимум 100 слів.
                        
                        ОБОВ'ЯЗКОВО закінчи постом:
                        "🎁 Безкоштовний розклад: ${this.contactInfo.leadBot}
                        📞 Замовити консультацію: ${this.contactInfo.orderBot}
                        🌐 Сайт: ${this.contactInfo.website}"`,
                        
            love: `Напиши пост про любов та стосунки з точки зору Таро та духовності.
                   Аудиторія: ${this.targetAudience}.
                   Включи поради для покращення стосунків.
                   Додай емодзі. 80-100 слів.
                   
                   ОБОВ'ЯЗКОВО закінчи постом:
                   "💝 Любовний прогноз: ${this.contactInfo.leadBot}
                   📞 Замовити розклад: ${this.contactInfo.orderBot}
                   🌐 ${this.contactInfo.website}"`,
                   
            career: `Створи пост про кар'єрний розвиток через призму духовності.
                     Як прислухатися до інтуїції в роботі?
                     Аудиторія: ${this.targetAudience}.
                     Додай емодзі. 80-100 слів.
                     
                     ОБОВ'ЯЗКОВО закінчи постом:
                     "🎯 Безкоштовне питання: ${this.contactInfo.leadBot}
                     📞 Консультація з кар'єри: ${this.contactInfo.orderBot}
                     🌐 ${this.contactInfo.website}"`,
                     
            astrology: `Напиши цікавий пост про вплив планет на наше життя.
                        Простою мовою, без занадто складних термінів.
                        Аудиторія: ${this.targetAudience}.
                        Додай емодзі. 80-100 слів.
                        
                        ОБОВ'ЯЗКОВО закінчи постом:
                        "⭐ Гороскоп безкоштовно: ${this.contactInfo.leadBot}
                        📞 Астрологічна консультація: ${this.contactInfo.orderBot}
                        🌐 ${this.contactInfo.website}"`,
                        
            daily: `Створи натхненний "пост дня" з духовною мудрістю.
                    Що може надихнути жінку сьогодні?
                    Аудиторія: ${this.targetAudience}.
                    Тепло, позитивно. Додай емодзі. 70-90 слів.
                    
                    ОБОВ'ЯЗКОВО закінчи постом:
                    "✨ Розклад на день: ${this.contactInfo.leadBot}
                    📞 Персональна консультація: ${this.contactInfo.orderBot}
                    🌐 ${this.contactInfo.website}"`,
                    
            special: `Напиши пост про практики самопізнання (медитація, ведення щоденника, тощо).
                      Практичні поради для духовного розвитку.
                      Аудиторія: ${this.targetAudience}.
                      Додай емодзі. 90-110 слів.
                      
                      ОБОВ'ЯЗКОВО закінчи постом:
                      "🧘‍♀️ Безкоштовні розклади: ${this.contactInfo.leadBot}
                      📞 Духовне консультування: ${this.contactInfo.orderBot}
                      🌐 ${this.contactInfo.website}"`,

            evening: `Створи вечірній пост для рефлексії та підведення підсумків дня.
                      Тема: внутрішній спокій та благодарність.
                      Аудиторія: ${this.targetAudience}.
                      М'який, заспокійливий тон. Емодзі. 70-90 слів.
                      
                      ОБОВ'ЯЗКОВО закінчи постом:
                      "🌙 Нічний розклад: ${this.contactInfo.leadBot}
                      📞 Вечірня консультація: ${this.contactInfo.orderBot}
                      🌐 ${this.contactInfo.website}"`
        };

        try {
            console.log(`🤖 Генеруємо ${type} контент для лідогенерації...`);

            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system", 
                        content: `Ти - досвідчений копірайтер для таро-консультанта ${this.brandName}. 
                                 Пишеш для лідогенерації: завданя привернути увагу та направити на безкоштовний бот.
                                 Стиль: тепло, жіночно, натхненно. Українською мовою. 
                                 Завжди точно включаєш вказані посилання.`
                    },
                    {
                        role: "user", 
                        content: prompts[type] || prompts.motivation
                    }
                ],
                max_tokens: 250,
                temperature: 0.8,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            const generatedContent = response.data.choices[0].message.content.trim();
            
            console.log(`✅ ChatGPT ${type} контент для лідогенерації згенеровано`);
            console.log(`📝 Довжина: ${generatedContent.length} символів`);
            
            return generatedContent;
            
        } catch (error) {
            if (error.response) {
                console.error('❌ OpenAI API помилка:', error.response.status, error.response.data);
            } else if (error.request) {
                console.error('❌ Мережева помилка:', error.message);
            } else {
                console.error('❌ Загальна помилка:', error.message);
            }
            
            console.log('🔄 Використовуємо запасний контент для лідогенерації');
            return this.getFallbackContent(type);
        }
    }

    // Запасний контент з фокусом на лідогенерацію
    getFallbackContent(type) {
        const leadGenContacts = `

🎁 Безкоштовний розклад: ${this.contactInfo.leadBot}
📞 Замовити консультацію: ${this.contactInfo.orderBot}
🌐 Сайт: ${this.contactInfo.website}`;

        const fallback = {
            motivation: `✨ Кожен день - це новий шанс стати кращою версією себе. Довіртеся своїй інтуїції та внутрішній мудрості 💫

🌟 Ваша сила - у вас самих. Просто повірте в себе і йдіть вперед!${leadGenContacts}`,

            love: `💕 Справжнє кохання починається з любові до себе. Коли ми гармонійні всередині, ми притягуємо правильних людей 🌹

✨ Відкрийте своє серце для нових можливостей у коханні!

💝 Любовний прогноз: ${this.contactInfo.leadBot}
📞 Замовити розклад: ${this.contactInfo.orderBot}
🌐 ${this.contactInfo.website}`,

            career: `🎯 Ваша кар'єра - це відображення вашого внутрішнього призначення. Прислухайтеся до серця при виборі шляху 💼✨

🌟 Інтуїція - ваш найкращий порадник у професійних питаннях!

🎯 Безкоштовне питання: ${this.contactInfo.leadBot}
📞 Консультація з кар'єри: ${this.contactInfo.orderBot}
🌐 ${this.contactInfo.website}`,

            astrology: `🌙 Місяць сьогодні нагадує нам про важливість циклів у нашому житті. Все має свій час ⭐

🔮 Зірки підтримують тих, хто йде за своїм призначенням!

⭐ Гороскоп безкоштовно: ${this.contactInfo.leadBot}
📞 Астрологічна консультація: ${this.contactInfo.orderBot}
🌐 ${this.contactInfo.website}`,

            daily: `🌅 Новий день приносить нові можливості. Будьте відкриті до змін та довіряйте процесу 🙏

💫 Сьогодні особливо важливо прислухатися до свого серця!${leadGenContacts}`,

            special: `🧘‍♀️ Медитація - це розмова з душею. Приділіть собі 10 хвилин тиші сьогодні 🔮

📝 Ведення щоденника допомагає краще зрозуміти себе
🌸 Практикуйте благодарність кожен день

🧘‍♀️ Безкоштовні розклади: ${this.contactInfo.leadBot}
📞 Духовне консультування: ${this.contactInfo.orderBot}
🌐 ${this.contactInfo.website}`,

            evening: `🌙 Час підвести підсумки дня. Подякуйте собі за все, що встигли зробити ✨

🙏 За що ви сьогодні вдячні? Зосередьтеся на позитивних моментах.

🌙 Нічний розклад: ${this.contactInfo.leadBot}
📞 Вечірня консультація: ${this.contactInfo.orderBot}
🌐 ${this.contactInfo.website}`
        };
        
        return fallback[type] || fallback.motivation;
    }

    // Контент вже включає заклики до дії
    async generateWithCTA(type) {
        return await this.generateTarotContent(type);
    }

    // Сезонний контент з лідогенерацією
    async generateSeasonalContent() {
        const month = new Date().getMonth();
        const seasons = {
            winter: [11, 0, 1], // грудень, січень, лютий
            spring: [2, 3, 4],  // березень, квітень, травень  
            summer: [5, 6, 7],  // червень, липень, серпень
            autumn: [8, 9, 10]  // вересень, жовтень, листопад
        };
        
        let season = 'spring';
        for (const [seasonName, months] of Object.entries(seasons)) {
            if (months.includes(month)) {
                season = seasonName;
                break;
            }
        }
        
        const seasonPrompts = {
            winter: "Створи пост про внутрішню трансформацію взимку, час заглиблення в себе та самопізнання",
            spring: "Напиши про оновлення та нові починання навесні, пробудження природи і душі",
            summer: "Створи пост про енергію та активність влітку, час реалізації планів", 
            autumn: "Напиши про час збору урожаю та підведення підсумків восени, мудрість зрілості"
        };
        
        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `Ти пишеш сезонний контент для таро-консультанта ${this.brandName} з фокусом на лідогенерацію.`
                    },
                    {
                        role: "user", 
                        content: `${seasonPrompts[season]} 
                                 Аудиторія: ${this.targetAudience}. 
                                 Додай емодзі. До 120 слів. Українська мова.
                                 
                                 ОБОВ'ЯЗКОВО закінчи постом:
                                 "🌿 Сезонний розклад: ${this.contactInfo.leadBot}
                                 📞 Консультація: ${this.contactInfo.orderBot}
                                 🌐 ${this.contactInfo.website}"`
                    }
                ],
                max_tokens: 250,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return response.data.choices[0].message.content.trim();
            
        } catch (error) {
            console.error('❌ Помилка генерації сезонного контенту:', error.message);
            return this.getFallbackContent('daily');
        }
    }

    // Спеціальний контент для залучення лідів
    async generateLeadMagnetContent() {
        const leadMagnets = [
            {
                type: "free_reading",
                content: `🎁 БЕЗКОШТОВНИЙ РОЗКЛАД ТАРО!

🔮 Хочете дізнатися, що вас чекає сьогодні? Отримайте персональний розклад на день абсолютно безкоштовно!

✨ Що ви дізнаєтесь:
• Енергії ранку, дня і вечора
• На що звернути увагу
• Які можливості відкриються

🎁 Безкоштовний розклад: ${this.contactInfo.leadBot}
📞 Детальна консультація: ${this.contactInfo.orderBot}`
            },
            {
                type: "special_offer", 
                content: `🔥 СПЕЦІАЛЬНА ПРОПОЗИЦІЯ!

💎 Перша консультація всього 70 грн замість 100!

🔮 Що включено:
• Детальна відповідь на ваше питання
• Професійна інтерпретація карт
• Практичні поради

⏰ Акція обмежена в часі!

🎁 Спробувати безкоштовно: ${this.contactInfo.leadBot}
📞 Замовити зі знижкою: ${this.contactInfo.orderBot}`
            }
        ];

        const randomMagnet = leadMagnets[Math.floor(Math.random() * leadMagnets.length)];
        return randomMagnet.content;
    }
}

// Ініціалізація генератора
const contentGenerator = new TarotContentGenerator();

// ФУНКЦІЇ ДЛЯ ІНТЕГРАЦІЇ З БОТОМ ЛІДОГЕНЕРАЦІЇ

// Функція для відправки контенту в канал з фокусом на лідогенерацію
async function sendSmartPost(bot, channelId, type = null) {
    try {
        console.log('🎯 Генеруємо контент для лідогенерації...');
        
        // Якщо тип не вказаний, обираємо випадковий
        const types = ['motivation', 'love', 'career', 'astrology', 'daily', 'special'];
        const selectedType = type || types[Math.floor(Math.random() * types.length)];
        
        // Генеруємо контент через ChatGPT
        const content = await contentGenerator.generateWithCTA(selectedType);
        
        console.log(`✅ Згенеровано ${selectedType} пост для лідогенерації`);
        console.log(`📝 Контент: ${content.substring(0, 100)}...`);
        
        // Відправляємо в канал
        await bot.sendMessage(channelId, content, { parse_mode: 'Markdown' });
        
        return { success: true, type: selectedType, content };
        
    } catch (error) {
        console.error('❌ Помилка відправки лідогенераційного поста:', error);
        
        // Відправляємо запасний контент
        const fallbackContent = contentGenerator.getFallbackContent('motivation');
        await bot.sendMessage(channelId, fallbackContent);
        
        return { success: false, error: error.message };
    }
}

// Розклад постів для лідогенерації
function scheduleSmartPosts(bot, channelId) {
    const cron = require('node-cron');
    
    console.log('📅 Розклад лідогенераційних ChatGPT постів активовано!');
    
    // Ранковий пост з акцентом на безкоштовний розклад (9:00)
    cron.schedule('0 9 * * *', async () => {
        console.log('📅 Ранковий лідогенераційний пост!');
        await sendSmartPost(bot, channelId, 'motivation');
    });
    
    // Обідній пост - лід-магніт (13:00)
    cron.schedule('0 13 * * *', async () => {
        console.log('📅 Обідній лід-магніт!');
        
        const leadMagnetContent = await contentGenerator.generateLeadMagnetContent();
        await bot.sendMessage(channelId, leadMagnetContent);
    });
    
    // Вечірній пост з перенаправленням на замовлення (19:00)
    cron.schedule('0 19 * * *', async () => {
        console.log('📅 Вечірній конверсійний пост!');
        
        const eveningTypes = ['love', 'astrology', 'evening'];
        const randomType = eveningTypes[Math.floor(Math.random() * eveningTypes.length)];
        
        await sendSmartPost(bot, channelId, randomType);
    });
    
    // Кар'єрний пост (12:00, пн-пт)
    cron.schedule('0 12 * * 1-5', async () => {
        console.log('📅 Кар\'єрний лідогенераційний пост!');
        await sendSmartPost(bot, channelId, 'career');
    });
    
    // Вихідний спеціальний пост (субота 15:00)
    cron.schedule('0 15 * * 6', async () => {
        console.log('📅 Вихідний лід-магніт!');
        
        const specialContent = await contentGenerator.generateLeadMagnetContent();
        await bot.sendMessage(channelId, specialContent);
    });
    
    // Сезонний пост (неділя 12:00)
    cron.schedule('0 12 * * 0', async () => {
        console.log('📅 Сезонний лідогенераційний пост!');
        
        const seasonalContent = await contentGenerator.generateSeasonalContent();
        await bot.sendMessage(channelId, seasonalContent);
    });
}

// Тестова функція для перевірки ChatGPT
async function testChatGPT(bot, chatId) {
    console.log('🧪 Тестуємо ChatGPT лідогенерацію...');
    
    try {
        const testPost = await contentGenerator.generateTarotContent('motivation');
        
        await bot.sendMessage(chatId, `🧪 ТЕСТ ЛІДОГЕНЕРАЦІЇ:\n\n${testPost}`);
        
        console.log('✅ ChatGPT лідогенерація успішна!');
        return true;
        
    } catch (error) {
        console.error('❌ ChatGPT лідогенерація не працює:', error);
        
        await bot.sendMessage(chatId, '❌ Помилка тестування ChatGPT лідогенерації. Перевірте налаштування.');
        return false;
    }
}

// Статистика використання ChatGPT для лідогенерації
let chatgptStats = {
    totalGenerated: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastUsed: null,
    leadMagnetsGenerated: 0
};

function updateChatGPTStats(success, type = 'regular') {
    chatgptStats.totalGenerated++;
    chatgptStats.lastUsed = new Date();
    
    if (success) {
        chatgptStats.successfulRequests++;
        if (type === 'lead_magnet') {
            chatgptStats.leadMagnetsGenerated++;
        }
    } else {
        chatgptStats.failedRequests++;
    }
}

function getChatGPTStats() {
    return {
        ...chatgptStats,
        successRate: chatgptStats.totalGenerated > 0 
            ? ((chatgptStats.successfulRequests / chatgptStats.totalGenerated) * 100).toFixed(1)
            : 0
    };
}

// Експорт всіх функцій
module.exports = {
    TarotContentGenerator,
    contentGenerator,
    sendSmartPost,
    scheduleSmartPosts,
    testChatGPT,
    getChatGPTStats,
    updateChatGPTStats
};
