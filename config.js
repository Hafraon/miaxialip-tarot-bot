// config.js - Конфігурація для гібридної системи лідогенерації + замовлень

module.exports = {
  // ОСНОВНІ НАЛАШТУВАННЯ БОТА
  telegram: {
    botToken: '7853031712:AAHS29d-x7_mWZ1zoNzP8kCbTOxW0vtI18w',
    adminChatId: '603047391',
    channelId: '@MiaxiaLipTarot',
  },

  // ГІБРИДНА СИСТЕМА БОТІВ
  bots: {
    // Цей бот - лідогенерація + контент
    leadGenBot: {
      username: '@miaxialip_tarot_bot',
      role: 'лідогенерація + ChatGPT контент',
      functions: ['безкоштовні розклади', 'збір лідів', 'контент для каналу', 'перенаправлення']
    },
    
    // Основний бот для замовлень (існуючий)
    orderBot: {
      username: '@MiaxiaTaro_bot', 
      role: 'центр замовлень',
      functions: ['прийом замовлень', 'обробка платежів', 'telegram сповіщення']
    }
  },

  // НАЛАШТУВАННЯ CHATGPT (БЕЗПЕЧНО!)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo',
    maxTokens: 250,
    temperature: 0.8,
    dailyLimit: 100, // Збільшено для лідогенерації
    fallbackEnabled: true
  },

  // НАЛАШТУВАННЯ КОНТЕНТУ ДЛЯ ЛІДОГЕНЕРАЦІЇ
  content: {
    brandName: 'MiaxiaLip',
    instagramUsername: 'miaxialip',
    websiteUrl: 'https://theglamstyle.com.ua',
    contactEmail: 'miaxialip@gmail.com',
    targetAudience: 'жінки 25-45 років, які цікавляться духовністю та саморозвитком',
    contentStyle: 'тепло, жіночно, натхненно, духовно, підтримуючи',
    
    // Стратегія лідогенерації
    leadStrategy: {
      primary: 'безкоштовні розклади',
      secondary: 'спеціальні ціни', 
      conversion: 'перенаправлення на основний бот'
    },
    
    welcomeMessage: `🌟 Привіт, {firstName}! 

Ласкаво прошу до світу Таро з MiaxiaLip! 🔮

✨ Що можу для вас зробити:
• 🆓 Безкоштовний розклад Таро
• 💝 Любовний прогноз
• ⭐ Гороскоп за вашим знаком  
• 🎯 Відповідь на особисте питання

🎁 **Спеціальна пропозиція:** перша персональна консультація всього 70 грн!

💫 Оберіть опцію з меню або напишіть ваше питання!`
  },

  // РОЗКЛАД ДЛЯ ЛІДОГЕНЕРАЦІЇ
  schedule: {
    timezone: 'Europe/Kiev',
    
    // Спеціальний розклад для лідогенерації
    leadGenPosts: {
      morning: '0 9 * * *',        // Ранковий мотиваційний (лід-магніт)
      lunch: '0 13 * * *',         // Обідній лід-магніт  
      career: '0 12 * * 1-5',      // Кар'єрний (пн-пт)
      evening: '0 19 * * *',       // Вечірній конверсійний
      weekend: '0 15 * * 6',       // Вихідний лід-магніт (субота)
      seasonal: '0 12 * * 0'       // Сезонний (неділя)
    },
    
    // Адмін звіти
    admin: {
      dailyStats: '0 21 * * *',    // Щоденна статистика лідів
      weeklyReport: '0 9 * * 1'    // Тижневий звіт (понеділок)
    }
  },

  // РЕАЛІСТИЧНІ ЦІНИ (відповідно до прайсу Міа)
  services: {
    // Основні ціни для показу в лідогенераційному боті
    prices: {
      leadMagnet: 70,              // Спеціальна ціна для лідогенерації
      individual: 100,             // Базова ціна за питання
      love: 280,                   // Любовний прогноз
      career: 350,                 // Кар'єра і фінанси  
      full: 450,                   // "Про себе" (6 питань)
      relationship: 390,           // "Стосунки" (6 питань)
      business: 400,               // "Бізнес" (6 питань)
      personal_matrix: 570,        // Персональна матриця
      compatibility: 550,          // Матриця сумісності
      year_arcana: 560,            // Аркан на рік
      self_environment: 300        // "Я та оточення" (3 питання)
    },
    
    // Спеціальні пропозиції для лідогенерації
    leadOffers: {
      firstConsultation: {
        price: 70,
        originalPrice: 100,
        discount: 30,
        description: "Перша консультація зі знижкою 30%"
      },
      freeReading: {
        price: 0,
        description: "Безкоштовний розклад на день",
        conversionGoal: "Перенаправлення на платні послуги"
      }
    },
    
    // Знижки
    discounts: {
      newClient: 30,               // Для нових клієнтів
      fromLeadBot: 15,             // За перехід з лідогенераційного бота
      referral: 20,                // За приведеного друга
      repeat: 10                   // Для постійних клієнтів
    }
  },

  // НАЛАШТУВАННЯ ЛІДОГЕНЕРАЦІЇ
  leadGeneration: {
    // Типи лідів
    leadTypes: {
      cold: { 
        actions: 0, 
        description: "Новий користувач" 
      },
      warm: { 
        actions: 1-2, 
        description: "1-2 безкоштовні розклади" 
      },
      hot: { 
        actions: 3, 
        description: "3+ взаємодій, готовий до замовлення" 
      }
    },
    
    // Дії для збору лідів
    trackingActions: [
      'free_reading',              // Безкоштовний розклад
      'love_reading',              // Любовний прогноз
      'question_asked',            // Задав питання
      'horoscope_viewed',          // Переглянув гороскоп
      'consultation_interest',     // Цікавість до консультації
      'price_check'                // Перевірив ціни
    ],
    
    // Налаштування сповіщень
    notifications: {
      hotLead: true,               // Сповіщати про гарячих лідів
      dailyReport: true,           // Щоденні звіти
      weeklyAnalytics: true        // Тижнева аналітика
    }
  },

  // НАЛАШТУВАННЯ ФУНКЦІЙ
  features: {
    // Лідогенераційні функції
    leadGeneration: true,          // Збір лідів активний
    freeReadings: true,            // Безкоштовні розклади
    leadTracking: true,            // Відстеження активності лідів
    autoRedirect: true,            // Автоперенаправлення на основний бот
    
    // ChatGPT функції  
    smartAutoPosts: true,          // Розумні пости
    leadMagnets: true,             // Лід-магніти в постах
    conversionPosts: true,         // Конверсійні пости
    
    // Загальні функції
    userStats: true,
    adminNotifications: true,
    saveHistory: true,
    dailyFreeLimit: 5,             // 5 безкоштовних розкладів на день
    chatgptLogging: true
  },

  // ІНТЕГРАЦІЯ З ЕКОСИСТЕМОЮ
  integration: {
    // Посилання для перенаправлень
    redirects: {
      orderBot: 'https://t.me/MiaxiaTaro_bot',
      website: 'https://theglamstyle.com.ua', 
      instagram: 'https://instagram.com/miaxialip',
      channel: 'https://t.me/MiaxiaLipTarot'
    },
    
    // Трекінг джерел
    sourceTracking: {
      channel: 'Telegram канал',
      instagram: 'Instagram',
      website: 'Сайт',
      direct: 'Прямий перехід',
      referral: 'Реферал'
    }
  },

  // ТЕКСТИ ДЛЯ ЛІДОГЕНЕРАЦІЇ
  texts: {
    // Лід-магніти
    leadMagnets: {
      freeReading: `🎁 БЕЗКОШТОВНИЙ РОЗКЛАД ТАРО!

🔮 Хочете дізнатися, що вас чекає? Отримайте персональний розклад абсолютно безкоштовно!

✨ Що дізнаєтесь:
• Енергії дня
• На що звернути увагу  
• Які можливості відкриються

🎁 Спробувати зараз: @miaxialip_tarot_bot`,

      specialOffer: `🔥 СПЕЦІАЛЬНА ПРОПОЗИЦІЯ!

💎 Перша консультація всього 70 грн замість 100!

🔮 Що включено:
• Детальна відповідь на питання
• Професійна інтерпретація
• Практичні поради

⏰ Обмежена пропозиція!

📞 Замовити: @MiaxiaTaro_bot`
    },
    
    // Перенаправлення
    redirects: {
      toOrderBot: `📞 **ЗАМОВИТИ КОНСУЛЬТАЦІЮ**

Для оформлення замовлення перейдіть до основного бота:
🤖 @MiaxiaTaro_bot

Або замовте через сайт:
🌐 theglamstyle.com.ua`,

      toWebsite: `🌐 **ЗАМОВЛЕННЯ ЧЕРЕЗ САЙТ**

Перейдіть на сайт для детального вибору послуг:
🔗 theglamstyle.com.ua

Або швидке замовлення в боті:
🤖 @MiaxiaTaro_bot`
    },

    // ChatGPT промпти для лідогенерації
    chatgpt: {
      systemPrompt: `Ти - копірайтер для лідогенерації таро-консультанта MiaxiaLip. 
                     Твоє завдання: привернути увагу і направити на безкоштовний бот для збору лідів.
                     Стиль: тепло, жіночно, натхненно. Українською мовою.`,
      
      leadGenTypes: [
        'motivation',    // Мотиваційні лід-магніти
        'love',         // Любовні лід-магніти
        'career',       // Кар'єрні лід-магніти
        'astrology',    // Астрологічні лід-магніти
        'daily',        // Щоденні лід-магніти
        'special',      // Спеціальні практики
        'conversion'    // Конверсійні пости
      ]
    }
  },

  // АНАЛІТИКА ЛІДОГЕНЕРАЦІЇ
  analytics: {
    // Метрики для відстеження
    metrics: [
      'new_users',           // Нові користувачі
      'free_readings',       // Безкоштовні розклади
      'lead_conversions',    // Конверсія в ліди
      'redirect_clicks',     // Кліки на перенаправлення
      'consultation_orders'  // Замовлення консультацій
    ],
    
    // Цілі конверсії
    conversionGoals: {
      leadConversion: 30,    // 30% користувачів стають лідами
      hotLeadRate: 10,       // 10% стають гарячими лідами
      orderConversion: 5     // 5% робить замовлення
    }
  },

  // ТЕХНІЧНІ НАЛАШТУВАННЯ
  technical: {
    saveInterval: 300000,          // Збереження кожні 5 хв
    maxRetries: 3,
    apiDelay: 100,
    openaiTimeout: 30000,
    
    // Спеціальні налаштування для лідогенерації
    leadGen: {
      sessionTimeout: 1800000,     // 30 хв сесія
      maxFreePerDay: 5,            // Макс безкоштовних розкладів
      hotLeadThreshold: 3          // 3+ дії = гарячий лід
    },
    
    logging: {
      level: 'info',
      saveToFile: true,
      maxFileSize: '10MB',
      chatgptLogs: true,
      leadTracking: true           // Логування активності лідів
    }
  },

  // БЕЗПЕКА
  security: {
    maxMessageLength: 500,
    userDailyLimit: 10,            // Макс дій на день
    blacklist: [],
    dailySpendLimit: 10.0,         // Збільшено для лідогенерації
    
    // Захист від спаму
    antiSpam: {
      maxRequestsPerMinute: 5,
      cooldownPeriod: 60000        // 1 хвилина
    }
  }
};
