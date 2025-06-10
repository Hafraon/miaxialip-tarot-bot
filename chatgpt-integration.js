// chatgpt-integration.js
// ChatGPT інтеграція для MiaxiaLip Tarot бота з посиланнями

const axios = require('axios');

// API ключ з змінних середовища Railway (БЕЗПЕЧНО!)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Розумна генерація контенту через ChatGPT
class TarotContentGenerator {
    constructor() {
        this.targetAudience = "жінки 25-45 років, які цікавляться духовністю та саморозвитком";
        this.brandName = "MiaxiaLip";
        this.contactInfo = {
            website: "https://theglamstyle.com.ua",
            instagram: "@miaxialip",
            telegram: "@miaxialip_tarot_bot",
            email: "miaxialip@gmail.com"
        };
    }

    // Основна функція генерації контенту з посиланнями
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
                        "🔮 Записатися на консультацію:
                        🌐 theglamstyle.com.ua
                        📱 Instagram: @miaxialip
                        🤖 Telegram бот: @miaxialip_tarot_bot"`,
                        
            love: `Напиши пост про любов та стосунки з точки зору Таро та духовності.
                   Аудиторія: ${this.targetAudience}.
                   Включи поради для покращення стосунків.
                   Додай емодзі. 80-100 слів.
                   
                   ОБОВ'ЯЗКОВО закінчи постом:
                   "💝 Любовний розклад:
                   🌐 theglamstyle.com.ua
                   📱 @miaxialip
                   🤖 @miaxialip_tarot_bot"`,
                   
            career: `Створи пост про кар'єрний розвиток через призму духовності.
                     Як прислухатися до інтуїції в роботі?
                     Аудиторія: ${this.targetAudience}.
                     Додай емодзі. 80-100 слів.
                     
                     ОБОВ'ЯЗКОВО закінчи постом:
                     "🎯 Консультація з кар'єри:
                     🌐 theglamstyle.com.ua
                     📱 @miaxialip  
                     🤖 @miaxialip_tarot_bot"`,
                     
            astrology: `Напиши цікавий пост про вплив планет на наше життя.
                        Простою мовою, без занадто складних термінів.
                        Аудиторія: ${this.targetAudience}.
                        Додай емодзі. 80-100 слів.
                        
                        ОБОВ'ЯЗКОВО закінчи постом:
                        "⭐ Астрологічна консультація:
                        🌐 theglamstyle.com.ua
                        📱 @miaxialip
                        🤖 @miaxialip_tarot_bot"`,
                        
            daily: `Створи натхненний "пост дня" з духовною мудрістю.
                    Що може надихнути жінку сьогодні?
                    Аудиторія: ${this.targetAudience}.
                    Тепло, позитивно. Додай емодзі. 70-90 слів.
                    
                    ОБОВ'ЯЗКОВО закінчи постом:
                    "✨ Персональна консультація:
                    🌐 theglamstyle.com.ua
                    📱 @miaxialip
                    🤖 @miaxialip_tarot_bot"`,
                    
            special: `Напиши пост про практики самопізнання (медитація, ведення щоденника, тощо).
                      Практичні поради для духовного розвитку.
                      Аудиторія: ${this.targetAudience}.
                      Додай емодзі. 90-110 слів.
                      
                      ОБОВ'ЯЗКОВО закінчи постом:
                      "🧘‍♀️ Духовний розвиток:
                      🌐 theglamstyle.com.ua
                      📱 @miaxialip
                      🤖 @miaxialip_tarot_bot"`,

            evening: `Створи вечірній пост для рефлексії та підведення підсумків дня.
                      Тема: внутрішній спокій та благодарність.
                      Аудиторія: ${this.targetAudience}.
                      М'який, заспокійливий тон. Емодзі. 70-90 слів.
                      
                      ОБОВ'ЯЗКОВО закінчи постом:
                      "🌙 Вечірня консультація:
                      🌐 theglamstyle.com.ua
                      📱 @miaxialip
                      🤖 @miaxialip_tarot_bot"`
        };

        try {
            console.log(`🤖 Генеруємо ${type} контент через ChatGPT...`);

            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system", 
                        content: `Ти - досвідчений копірайтер для таро-консультанта ${this.brandName}. 
                                 Пишеш тепло, жіночно, натхненно. Українською мовою. 
                                 Завжди точно включаєш вказані посилання в кінці поста.
                                 Стиль: духовний, підтримуючий, мотиваційний.`
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
            
            console.log(`✅ ChatGPT ${type} контент згенеровано успішно`);
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
            
            console.log('🔄 Використовуємо запасний контент');
            return this.getFallbackContent(type);
        }
    }

    // Запасний контент з посиланнями
    getFallbackContent(type) {
        const contactInfo = `

🔮 Записатися на консультацію:
🌐 theglamstyle.com.ua
📱 Instagram: @miaxialip  
🤖 Telegram бот: @miaxialip_tarot_bot`;

        const fallback = {
            motivation: `✨ Кожен день - це новий шанс стати кращою версією себе. Довіртеся своїй інтуїції та внутрішній мудрості 💫

🌟 Ваша сила - у вас самих. Просто повірте в себе і йдіть вперед!${contactInfo}`,

            love: `💕 Справжнє кохання починається з любові до себе. Коли ми гармонійні всередині, ми притягуємо правильних людей 🌹

✨ Відкрийте своє серце для нових можливостей у коханні!

💝 Любовний розклад:
🌐 theglamstyle.com.ua
📱 @miaxialip
🤖 @miaxialip_tarot_bot`,

            career: `🎯 Ваша кар'єра - це відображення вашого внутрішнього призначення. Прислухайтеся до серця при виборі шляху 💼✨

🌟 Інтуїція - ваш найкращий порадник у професійних питаннях!

🎯 Консультація з кар'єри:
🌐 theglamstyle.com.ua
📱 @miaxialip
🤖 @miaxialip_tarot_bot`,

            astrology: `🌙 Місяць сьогодні нагадує нам про важливість циклів у нашому житті. Все має свій час ⭐

🔮 Зірки підтримують тих, хто йде за своїм призначенням!

⭐ Астрологічна консультація:
🌐 theglamstyle.com.ua
📱 @miaxialip
🤖 @miaxialip_tarot_bot`,

            daily: `🌅 Новий день приносить нові можливості. Будьте відкриті до змін та довіряйте процесу 🙏

💫 Сьогодні особливо важливо прислухатися до свого серця!${contactInfo}`,

            special: `🧘‍♀️ Медитація - це розмова з душею. Приділіть собі 10 хвилин тиші сьогодні 🔮

📝 Ведення щоденника допомагає краще зрозуміти себе
🌸 Практикуйте благодарність кожен день

🧘‍♀️ Духовний розвиток:
🌐 theglamstyle.com.ua
📱 @miaxialip
🤖 @miaxialip_tarot_bot`,

            evening: `🌙 Час підвести підсумки дня. Подякуйте собі за все, що встигли зробити ✨

🙏 За що ви сьогодні вдячні? Зосередьтеся на позитивних моментах.

🌙 Вечірня консультація:
🌐 theglamstyle.com.ua
📱 @miaxialip
🤖 @miaxialip_tarot_bot`
        };
        
        return fallback[type] || fallback.motivation;
    }

    // Генерація контенту з автоматичним додаванням CTA (не потрібно - вже включено)
    async generateWithCTA(type) {
        // Всі пости вже включають контактну інформацію
        return await this.generateTarotContent(type);
    }

    // Сезонний контент з посиланнями
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
                        content: `Ти пишеш сезонний контент для таро-консультанта ${this.brandName}. Враховуй енергію поточного сезону.`
                    },
                    {
                        role: "user", 
                        content: `${seasonPrompts[season]} 
                                 Аудиторія: ${this.targetAudience}. 
                                 Додай емодзі. До 120 слів. Українська мова.
                                 
                                 ОБОВ'ЯЗКОВО закінчи постом:
                                 "🌿 Сезонна консультація:
                                 🌐 theglamstyle.com.ua
                                 📱 @miaxialip
                                 🤖 @miaxialip_tarot_bot"`
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
}

// Ініціалізація генератора
const contentGenerator = new TarotContentGenerator();

// ФУНКЦІЇ ДЛЯ ІНТЕГРАЦІЇ З ОСНОВНИМ БОТОМ

// Функція для відправки розумного поста
async function sendSmartPost(bot, channelId, type = null) {
    try {
        console.log('🤖 Генеруємо розумний контент...');
        
        // Якщо тип не вказаний, обираємо випадковий
        const types = ['motivation', 'love', 'career', 'astrology', 'daily', 'special'];
        const selectedType = type || types[Math.floor(Math.random() * types.length)];
        
        // Генеруємо контент через ChatGPT
        const content = await contentGenerator.generateWithCTA(selectedType);
        
        console.log(`✅ Згенеровано ${selectedType} пост для каналу`);
        console.log(`📝 Контент: ${content.substring(0, 100)}...`);
        
        // Відправляємо в канал
        await bot.sendMessage(channelId, content, { parse_mode: 'Markdown' });
        
        return { success: true, type: selectedType, content };
        
    } catch (error) {
        console.error('❌ Помилка відправки розумного поста:', error);
        
        // Відправляємо запасний контент
        const fallbackContent = contentGenerator.getFallbackContent('motivation');
        await bot.sendMessage(channelId, fallbackContent);
        
        return { success: false, error: error.message };
    }
}

// Розклад розумних постів (замість старих функцій)
function scheduleSmartPosts(bot, channelId) {
    const cron = require('node-cron');
    
    console.log('📅 Розклад розумних ChatGPT постів з посиланнями активовано!');
    
    // Ранковий мотиваційний пост (9:00)
    cron.schedule('0 9 * * *', async () => {
        console.log('📅 Час ранкового поста!');
        await sendSmartPost(bot, channelId, 'motivation');
    });
    
    // Вечірній пост (19:00) - любов або астрологія
    cron.schedule('0 19 * * *', async () => {
        console.log('📅 Час вечірнього поста!');
        
        const eveningTypes = ['love', 'astrology', 'evening'];
        const randomType = eveningTypes[Math.floor(Math.random() * eveningTypes.length)];
        
        await sendSmartPost(bot, channelId, randomType);
    });
    
    // Середній день - кар'єрний пост (12:00, пн-пт)
    cron.schedule('0 12 * * 1-5', async () => {
        console.log('📅 Денний пост про кар\'єру!');
        await sendSmartPost(bot, channelId, 'career');
    });
    
    // Вихідний пост (субота 14:00) - спеціальні практики
    cron.schedule('0 14 * * 6', async () => {
        console.log('📅 Вихідний пост!');
        await sendSmartPost(bot, channelId, 'special');
    });
    
    // Сезонний пост (неділя 12:00)
    cron.schedule('0 12 * * 0', async () => {
        console.log('📅 Сезонний пост!');
        
        const seasonalContent = await contentGenerator.generateSeasonalContent();
        await bot.sendMessage(channelId, seasonalContent);
    });
}

// Тестова функція для перевірки ChatGPT
async function testChatGPT(bot, chatId) {
    console.log('🧪 Тестуємо ChatGPT генерацію...');
    
    try {
        const testPost = await contentGenerator.generateTarotContent('motivation');
        
        await bot.sendMessage(chatId, `🧪 ТЕСТ ChatGPT:\n\n${testPost}`);
        
        console.log('✅ ChatGPT тест успішний!');
        return true;
        
    } catch (error) {
        console.error('❌ ChatGPT тест не пройшов:', error);
        
        await bot.sendMessage(chatId, '❌ Помилка тестування ChatGPT API. Перевірте налаштування.');
        return false;
    }
}

// Статистика використання ChatGPT
let chatgptStats = {
    totalGenerated: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastUsed: null
};

function updateChatGPTStats(success) {
    chatgptStats.totalGenerated++;
    chatgptStats.lastUsed = new Date();
    
    if (success) {
        chatgptStats.successfulRequests++;
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
