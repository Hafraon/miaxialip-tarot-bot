// config.js - Файл конфігурації для Tarot бота (БЕЗПЕЧНА ВЕРСІЯ)
// API ключі ТІЛЬКИ в змінних середовища Railway!

module.exports = {
  // ОСНОВНІ НАЛАШТУВАННЯ БОТА
  telegram: {
    // Ваш токен отриманий від @BotFather
    botToken: '7853031712:AAHS29d-x7_mWZ1zoNzP8kCbTOxW0vtI18w',
    
    // Ваш особистий Chat ID (отримайте від @userinfobot)
    adminChatId: '603047391',
    
    // Канал для автоматичних постів 
    channelId: '@MiaxiaLipTarot',
  },

  // НАЛАШТУВАННЯ CHATGPT (БЕЗПЕЧНО!)
  openai: {
    // ⚠️ API ключ НЕ зберігається в коді для безпеки!
    // Він читається з змінних середовища Railway
    apiKey: process.env.OPENAI_API_KEY, // ✅ БЕЗПЕЧНО
    
    // Налаштування генерації
    model: 'gpt-3.5-turbo',
    maxTokens: 200,
    temperature: 0.8,
    
    // Частота використання
    dailyLimit: 50,
    
    // Резервний контент якщо API недоступний
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

  // НАЛАШТУВАННЯ ПОСЛУГ ТА ЦІН
  services: {
    prices: {
      individual: 300,
      love: 250,
      career: 350,
      full: 500,
      vip: 800
    },
    
    discounts: {
      newClient: 20,
      referral: 15,
      package: 100
    }
  },

  // НАЛАШТУВАННЯ ФУНКЦІЙ БОТА
  features: {
    userStats: true,
    smartAutoPosts: true,
    oldAutoPosts: false,
    adminNotifications: true,
    saveHistory: true,
    dailyFreeLimit: 3,
    referralProgram: false,
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

  // ТЕКСТИ ДЛЯ РІЗНИХ РОЗКЛАДІВ
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
    userDailyLimit: 10,
    blacklist: [],
    dailySpendLimit: 5.0
  }
};

// 🔐 ВАЖЛИВО ДЛЯ БЕЗПЕКИ:
/*
❌ НІКОЛИ НЕ ВСТАВЛЯЙТЕ API КЛЮЧІ В КОД!
✅ Використовуйте ТІЛЬКИ змінні середовища Railway:

В Railway Variables додайте:
OPENAI_API_KEY = ваш_новий_ключ_тут

Це забезпечить безпеку і приватність ваших ключів!
*/
