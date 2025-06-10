// chatgpt-integration.js
// ChatGPT інтеграція для MiaxiaLip Tarot бота

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
            email: "miaxialip@gmail.com"
        };
    }

    // Основна функція генерації контенту
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
                        Додай емодзі. Максимум 120 слів.
                        Обов'язково закінчи закликом записатися на консультацію.
                        Бренд: ${this.brandName}`,
                        
            love: `Напиши пост про любов та стосунки з точки зору Таро та духовності.
                   Аудиторія: ${this.targetAudience}.
                   Включи поради для покращення стосунків.
                   Додай емодзі. 100-120 слів.
                   Закінчи пропозицією замовити любовний розклад.`,
                   
            career: `Створи пост про кар'єрний розвиток через призму духовності.
                     Як прислухатися до інтуїції в роботі?
                     Аудиторія: ${this.targetAudience}.
                     Додай емодзі та заклик до консультації. До 120 слів.`,
                     
            astrology: `Напиши цікавий пост про вплив планет на наше життя.
                        Простою мовою, без занадто складних термінів.
                        Аудиторія: ${this.targetAudience}.
                        Додай емодзі та згадку про консультації. 100-120 слів.`,
                        
            daily: `Створи натхненний "пост дня" з духовною мудрістю.
                    Що може надихнути жінку сьогодні?
                    Аудиторія: ${this.targetAudience}.
                    Тепло, позитивно. Додай емодзі. До 100 слів.
                    Закінчи закликом написати в особисті або на консультацію.`,
                    
            special: `Напиши пост про практики самопізнання (медитація, ведення щоденника, тощо).
                      Практичні поради для духовного розвитку.
                      Аудиторія: ${this.targetAudience}.
                      Додай емодзі. 130-150 слів.
                      Додай заклик до дії.`,

            evening: `Створи вечірній пост для рефлексії та підведення підсумків дня.
                      Тема: внутрішній спокій та благодарність.
                      Аудиторія: ${this.targetAudience}.
                      М'який, заспокійливий тон. Емодзі. До 100 слів.`
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
                                 Завжди додаєш заклик до дії. Використовуєш емодзі доречно.
                                 Стиль: духовний, підтримуючий, мотиваційний.`
                    },
                    {
                        role: "user", 
                        content: prompts[type] || prompts.motivation
                    }
                ],
                max_tokens: 200,
                temperature: 0.8, // Для креативності
                presence_penalty: 0.1, // Уникнення повторів
                frequency_penalty: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 секунд таймаут
            });

            const generatedContent = response.data.choices[0].message.content.trim();
            
            // Логування успішної генерації
            console.log(`✅ ChatGPT ${type} контент згенеровано успішно`);
            console.log(`📝 Довжина: ${generatedContent.length} символів`);
            
            return generatedContent;
            
        } catch (error) {
            // Детальне логування помилок
            if (error.response) {
                console.error('❌ OpenAI API помилка:', error.response.status, error.response.data);
            } else if (error.request) {
                console.error('❌ Мережева помилка:', error.message);
            } else {
                console.error('❌ Загальна помилка:', error.message);
            }
            
            // Повертаємо запасний контент
            console.log('🔄 Використовуємо запасний контент');
            return this.getFallbackContent(type);
        }
    }

    // Запасний контент якщо ChatGPT недоступний
    getFallbackContent(type) {
        const fallback = {
            motivation: `✨ Кожен день - це новий шанс стати кращою версією себе. Довіртеся своїй інтуїції та внутрішній мудрості 💫

🌟 Ваша сила - у вас самих. Просто повірте в себе і йдіть вперед!

🔮 Потрібна підтримка? Записуйтесь на консультацію в особисті!`,

            love: `💕 Справжнє кохання починається з любові до себе. Коли ми гармонійні всередині, ми притягуємо правильних людей 🌹

✨ Відкрийте своє серце для нових можливостей у коханні!

💌 Питання про стосунки? Пишіть, розберемо разом в особистій консультації!`,

            career: `🎯 Ваша кар'єра - це відображення вашого внутрішнього призначення. Прислухайтеся до серця при виборі шляху 💼✨

🌟 Інтуїція - ваш найкращий порадник у професійних питаннях!

📞 Консультація з кар'єри? Звертайтесь на сайт або в особисті!`,

            astrology: `🌙 Місяць сьогодні нагадує нам про важливість циклів у нашому житті. Все має свій час ⭐

🔮 Зірки підтримують тих, хто йде за своїм призначенням!

✨ Хочете знати більше про вплив планет? Записуйтесь на астрологічну консультацію!`,

            daily: `🌅 Новий день приносить нові можливості. Будьте відкриті до змін та довіряйте процесу 🙏

💫 Сьогодні особливо важливо прислухатися до свого серця!

✨ Потрібна підтримка? Я тут для вас - пишіть в особисті!`,

            special: `🧘‍♀️ Медитація - це розмова з душею. Приділіть собі 10 хвилин тиші сьогодні 🔮

📝 Ведення щоденника допомагає краще зрозуміти себе
🌸 Практикуйте благодарність кожен день

💎 Хочете більше практик для духовного розвитку? Записуйтесь на консультацію!`,

            evening: `🌙 Час підвести підсумки дня. Подякуйте собі за все, що встигли зробити ✨

🙏 За що ви сьогодні вдячні? Зосередьтеся на позитивних моментах.

💫 Доброї ночі та солодких снів! Завтра на вас чекають нові можливості 🌟`
        };
        
        return fallback[type] || fallback.motivation;
    }

    // Генерація контенту з автоматичним додаванням CTA
    async generateWithCTA(type) {
        const baseContent = await this.generateTarotContent(type);
        
        // Якщо контент вже має CTA, повертаємо як є
        if (baseContent.includes('консультац') || baseContent.includes('записуй') || baseContent.includes('пишіть')) {
            return baseContent;
        }
        
        // Інакше додаємо CTA
        const cta = [
            "\n\n📞 Записатися на консультацію - пишіть в особисті!",
            "\n\n🔮 Хочете персональний розклад? Зв'яжіться зі мною!",
            "\n\n✨ Потрібна індивідуальна консультація? Звертайтесь!",
            "\n\n💌 Питання? Відповіді? Записуйтесь на сеанс!"
        ];
        
        const randomCTA = cta[Math.floor(Math.random() * cta.length)];
        return baseContent + randomCTA;
    }

    // Сезонний контент
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
                        content: `${seasonPrompts[season]} Аудиторія: ${this.targetAudience}. Додай емодзі. До 150 слів. Українська мова.`
                    }
                ],
                max_tokens: 200,
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
    
    console.log('📅 Розклад розумних ChatGPT постів активовано!');
    
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
        const finalContent = seasonalContent + "\n\n🔮 Записатися на консультацію - пишіть в особисті!";
        
        await bot.sendMessage(channelId, finalContent);
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
