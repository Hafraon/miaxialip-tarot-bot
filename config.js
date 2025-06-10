// config.js - Файл конфігурації для Tarot бота (РЕАЛІСТИЧНІ ЦІНИ МІА)

module.exports = {
  // ОСНОВНІ НАЛАШТУВАННЯ БОТА
  telegram: {
    botToken: '7853031712:AAHS29d-x7_mWZ1zoNzP8kCbTOxW0vtI18w',
    adminChatId: '603047391',
    channelId: '@MiaxiaLipTarot',
  },

  // НАЛАШТУВАННЯ CHATGPT (БЕЗПЕЧНО!)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo',
    maxTokens: 200,
    temperature: 0.8,
    dailyLimit: 50,
    fallbackEnabled: true
  },

  // НАЛАШТУВАННЯ КОНТЕНТУ
  content: {
    brandName: 'MiaxiaLip',
    instagramUsername: 'miaxialip',
    websiteUrl: 'https://theglamstyle.com.ua',
    contactEmail: 'miaxialip@gmail.com',
    targetAudience: 'жінки 25-45 років, які цікавляться духовністю та саморозвитком',
    contentStyle: 'тепло, жіночно, натхненно, духовно, підтримуючи',
    
    welcomeMessage: `🌟 Привіт, {firstName}! 

Ласкаво прошу до світу Таро з MiaxiaLip! 🔮

✨ Я допоможу вам:
• Отримати розклад на день
• Дізнатися любовний прогноз  
• Побачити загальний розклад
• Отримати гороскоп за знаком зодіаку

🎯 Оберіть опцію з меню нижче або напишіть своє питання!

💫 Пам'ятайте: Таро не передбачає майбутнє, а допомагає краще зрозуміти себе та свій шлях.`
  },

  // НАЛАШТУВАННЯ РОЗКЛАДУ РОЗУМНИХ ПОСТІВ
  schedule: {
    timezone: 'Europe/Kiev',
    
    smartPosts: {
      morning: '0 9 * * *',      // Ранковий мотиваційний пост (9:00)
      evening: '0 19 * * *',     // Вечірній пост (19:00)
      career: '0 12 * * 1-5',    // Денний кар'єрний пост (12:00, пн-пт)
      weekend: '0 14 * * 6',     // Вихідний пост (субота 14:00)
      seasonal: '0 12 * * 0'     // Сезонний пост (неділя 12:00)
    },
    
    posts: {
      adminStats: '0 21 * * *'   // Статистика для адміна (21:00)
    }
  },

  // РЕАЛІСТИЧНІ ЦІНИ НА ПОСЛУГИ (ВІДПОВІДНО ДО ПРАЙСУ МІА)
  services: {
    // Основні ціни (в гривнях) - базові без знижок
    prices: {
      individual: 100,          // 1 питання (базова ціна, зі знижкою 70 грн)
      love: 280,               // Любовний прогноз (2-3 питання)
      career: 350,             // Кар'єра і фінанси (3-4 питання)
      full: 450,               // Повний розклад "Про себе" (6 питань)
      relationship: 390,        // Стосунки (6 питань)
      business: 400,           // Бізнес (6 питань)
      personal_matrix: 570,    // Персональна матриця
      compatibility: 550,      // Матриця сумісності
      year_arcana: 560,        // Аркан на рік
      self_environment: 300,   // "Я та моє оточення" (3 питання)
      vip: 700                 // VIP консультація (розширена)
    },
    
    // Знижки та промокоди
    discounts: {
      newClient: 30,           // Знижка для нових клієнтів (30% = 70 грн з 100)
      referral: 20,            // Знижка за приведеного друга (20%)
      package: 50,             // Знижка на пакетні послуги (грн)
      repeat: 15               // Знижка для постійних клієнтів (15%)
    },
    
    // Спеціальні пакети (як у Міа)
    packages: {
      basic: {
        name: "Базовий пакет",
        price: 350,
        description: "3 питання на вибір",
        questions: 3
      },
      relationships: {
        name: "Стосунки",
        price: 390,
        description: "6 питань про кохання та стосунки",
        questions: 6
      },
      personal: {
        name: "Про себе", 
        price: 450,
        description: "6 питань для самопізнання",
        questions: 6
      },
      business: {
        name: "Бізнес і кар'єра",
        price: 400,
        description: "6 питань про професійний розвиток",
        questions: 6
      },
      matrix: {
        name: "Персональна матриця",
        price: 570,
        description: "Детальний аналіз особистості",
        questions: "матриця"
      }
    }
  },

  // НАЛАШТУВАННЯ ФУНКЦІЙ БОТА
  features: {
    userStats: true,
    smartAutoPosts: true,
    oldAutoPosts: false,
    adminNotifications: true,
    saveHistory: true,
    dailyFreeLimit: 1,        // 1 безкоштовний розклад на день
    referralProgram: true,    // Увімкнути реферальну програму
    chatgptLogging: true
  },

  // НАЛАШТУВАННЯ СОЦІАЛЬНИХ МЕРЕЖ
  social: {
    instagram: {
      username: 'miaxialip',
      autoReply: true,
      hashtagsUa: '#таро #гороскоп #україна #київ #львів #одеса #астрологія #miaxialip',
      hashtagsEn: '#tarot #horoscope #ukraine #astrology #spirituality #miaxialip'
    },
    
    tiktok: {
      username: 'miaxialip',
      contentIdeas: [
        'Швидкі розклади на день',
        'Розвінчування міфів про Таро',
        'День з таро-консультантом',
        'Таро vs реальність',
        'ChatGPT генерує Таро контент'
      ]
    }
  },

  // ТЕХНІЧНІ НАЛАШТУВАННЯ
  technical: {
    saveInterval: 300000,
    maxRetries: 3,
    apiDelay: 100,
    openaiTimeout: 30000,
    
    logging: {
      level: 'info',
      saveToFile: true,
      maxFileSize: '10MB',
      chatgptLogs: true
    }
  },

  // ТЕКСТИ ДЛЯ РІЗНИХ РОЗКЛАДІВ З ОНОВЛЕНИМИ ЦІНАМИ
  texts: {
    titles: {
      daily: '🌅 РОЗКЛАД НА ДЕНЬ',
      love: '💝 ЛЮБОВНИЙ ПРОГНОЗ', 
      general: '🌟 ЗАГАЛЬНИЙ РОЗКЛАД',
      horoscope: '⭐ ГОРОСКОП'
    },
    
    endings: {
      positive: [
        'Нехай цей день принесе вам мудрість та гармонію!',
        'Бажаю натхненного дня!',
        'Довіряйте своєму шляху!',
        'Кожен день - це новий шанс стати кращою версією себе!'
      ],
      consultation: 'Хочете детальний розклад? Замовте персональну консультацію!'
    },
    
    // Оновлені тексти з реальними цінами
    services: {
      priceList: `🔮 **ПОСЛУГИ MIAXIALIP**

💎 **ІНДИВІДУАЛЬНІ РОЗКЛАДИ:**
• 1 питання - 100 грн (зі знижкою 70 грн)
• Любовний прогноз - 280 грн
• Кар'єра і фінанси - 350 грн

🌟 **ТЕМАТИЧНІ ПАКЕТИ:**
• "Про себе" (6 питань) - 450 грн
• "Стосунки" (6 питань) - 390 грн  
• "Бізнес" (6 питань) - 400 грн
• "Я та оточення" (3 питання) - 300 грн

⭐ **СПЕЦІАЛЬНІ ПОСЛУГИ:**
• Персональна матриця - 570 грн
• Матриця сумісності - 550 грн
• Аркан на рік - 560 грн
• VIP консультація - 700 грн

🎁 **ЗНИЖКИ:**
• Новим клієнтам -30% (промокод: NEWCLIENT)
• Постійним клієнтам -15%
• За друга -20%`,

      consultation: `📞 **ЗАМОВЛЕННЯ КОНСУЛЬТАЦІЇ**

🔮 **Популярні послуги:**

💎 **1 питання** - 70 грн (спеціальна ціна!)
Швидка відповідь на конкретне питання

💝 **Любовний прогноз** - 280 грн  
Детальний розклад про стосунки

🌟 **"Про себе"** - 450 грн
6 питань для глибокого самопізнання

🎯 **Персональна матриця** - 570 грн
Повний аналіз особистості та призначення

📱 **Як замовити:**
1. Перейдіть на сайт
2. Оберіть послугу
3. Вкажіть зручний час
4. Отримайте професійну консультацію

✨ Індивідуальний підхід до кожного клієнта!`
    },
    
    chatgpt: {
      systemPrompt: 'Ти - досвідчений копірайтер для таро-консультанта MiaxiaLip. Пишеш тепло, жіночно, натхненно. Українською мовою. Завжди додаєш заклик до дії.',
      
      contentTypes: [
        'motivation', 'love', 'career', 'astrology', 'daily', 'special', 'evening'
      ],
      
      fallbackMessages: {
        apiError: '❌ Помилка ChatGPT API. Використовуємо резервний контент.',
        noApiKey: '🔑 API ключ не знайдено в змінних середовища.',
        quotaExceeded: '💰 Ліміт ChatGPT вичерпано на сьогодні.'
      }
    }
  },

  // НАЛАШТУВАННЯ ПОМИЛОК ТА ВІДЛАДКИ
  debug: {
    verbose: false,
    reportErrors: true,
    testMode: false,
    logChatGPT: true,
    showTimings: true
  },

  // БЕЗПЕКА ТА ЛІМІТИ
  security: {
    maxMessageLength: 500,
    userDailyLimit: 3,        // 3 безкоштовних розкладів на день
    blacklist: [],
    dailySpendLimit: 5.0
  }
};
