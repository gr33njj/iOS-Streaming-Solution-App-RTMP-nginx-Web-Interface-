# iOS Streaming Solution (App + RTMP nginx + Web Interface)

## 🎯 Обзор проекта

Данный проект представляет собой **полное решение для профессионального стриминга видео с iPhone 15 Pro Max** на сервер с последующим мониторингом через веб-интерфейс. Система оптимизирована для минимальной задержки и высокого качества видео.

## 🏗️ Архитектура системы

```
iPhone 15 Pro Max → RTMP → SRS Server → HTTP-FLV/DVR → Web Interface
                              ↓
                         Nginx (Proxy/Auth)
                              ↓
                         Auth Service (2FA)
                              ↓
                         DVR Cleaner
```

## 📱 Компоненты решения

### 1. iOS-приложение (StreamingApp)

**Местоположение**: `ios-app/StreamingApp/`

**Основные возможности**:
- ✅ **Захват видео**: AVFoundation с поддержкой всех камер iPhone 15 Pro Max
  - Wide 1x (основная)
  - UltraWide 0.5x (сверхширокоугольная)
  - Telephoto 2x/3x (телеобъектив)
  - Front (фронтальная камера)

- ✅ **Кодирование H.264**: VideoToolbox с оптимизацией для стриминга
  - High Profile, без B-frames
  - zerolatency настройки
  - CBR битрейт 1-20 Mbps
  - GOP 2 секунды

- ✅ **RTMP стриминг**: Собственная реализация с поддержкой фоновой работы
  - Работа в фоне через аудио сессию
  - Автоматическое переподключение
  - Мониторинг качества соединения

- ✅ **Ручные настройки камеры**:
  - Выдержка, ISO, баланс белого
  - Ручная фокусировка
  - Экспокоррекция

- ✅ **CoreImage фильтры**:
  - Яркость, контрастность
  - Насыщенность, резкость

**Ключевые файлы**:
- `CameraManager.swift` - Управление камерами и настройками
- `VideoEncoder.swift` - H.264 кодирование через VideoToolbox
- `RTMPStreamer.swift` - RTMP стриминг
- `ViewController.swift` - Основной интерфейс
- `SettingsViewController.swift` - Настройки камеры

### 2. Серверная инфраструктура

**Местоположение**: `server/`

#### SRS Media Server
- ✅ **RTMP ingest**: Прием потоков от iPhone
- ✅ **HTTP-FLV live**: Низкая задержка 2-4 секунды
- ✅ **DVR запись**: CMAF/fMP4 сегменты по 1 секунде
- ✅ **Оптимизация**: TCP nodelay, min latency режим

#### Nginx Reverse Proxy
- ✅ **TLS/HTTPS**: SSL терминация с современными cipher suites
- ✅ **Авторизация**: Интеграция с auth service
- ✅ **Rate limiting**: Защита от DDoS
- ✅ **Статический контент**: Веб-интерфейс и DVR файлы

#### Auth Service (Node.js)
- ✅ **JWT токены**: 24-часовый TTL
- ✅ **2FA (TOTP)**: Google Authenticator совместимость
- ✅ **Безопасность**: bcrypt хеширование, rate limiting
- ✅ **Session management**: Secure cookies

#### DVR Cleaner
- ✅ **Автоматическая очистка**: 15-минутное окно записи
- ✅ **Мониторинг**: Health checks и логирование
- ✅ **Эффективность**: Минимальное использование ресурсов

### 3. Веб-интерфейс (React)

**Местоположение**: `web-interface/`

**Технологии**: React 18, Vite, Tailwind CSS, flv.js, WebCodecs

**Основные возможности**:
- ✅ **Двойной плеер**:
  - Live плеер (HTTP-FLV через flv.js)
  - DVR плеер (MSE + WebCodecs)

- ✅ **Timeline навигация**:
  - 15-минутный таймлайн
  - Покадровая навигация (←/→)
  - Точное позиционирование

- ✅ **Горячие клавиши**:
  - `Space` - Воспроизведение/пауза DVR
  - `←/→` - Покадровая навигация
  - `L` - Переход к live
  - `Ctrl+F` - Полноэкранный режим

- ✅ **Локальные фильтры**: WebGL/Canvas обработка
  - Яркость, контрастность
  - Насыщенность, резкость
  - Не влияют на исходный поток

- ✅ **Безопасная авторизация**:
  - Форма входа с 2FA
  - Secure cookies
  - Auto-logout при истечении токена

**Ключевые компоненты**:
- `LivePlayer.jsx` - HTTP-FLV плеер
- `DVRPlayer.jsx` - DVR с покадровой навигацией
- `Timeline.jsx` - 15-минутный таймлайн
- `VideoFilters.jsx` - Локальные WebGL фильтры

### 4. Документация

**Местоположение**: `docs/`

- ✅ **deployment-guide.md**: Подробное руководство по развертыванию
- ✅ **api-documentation.md**: Документация API
- ✅ **ios-app-guide.md**: Руководство по iOS разработке

## 🚀 Быстрый старт

### 1. Автоматическое развертывание

```bash
# Development
./deploy.sh development

# Production
./deploy.sh production your-domain.com
```

### 2. Ручное развертывание

```bash
# Сборка веб-интерфейса
cd web-interface
npm install && npm run build
cp -r dist/* ../server/web/

# Запуск сервисов
cd ../server
docker-compose up -d
```

### 3. Настройка iOS приложения

1. Откройте `ios-app/StreamingApp.xcodeproj` в Xcode
2. Настройте Bundle Identifier и подписание
3. Соберите и установите на iPhone 15 Pro Max
4. Введите RTMP URL: `rtmp://your-domain.com/live/streamkey`

## 📊 Технические характеристики

### Видео параметры
- **Кодек**: H.264 High Profile
- **Разрешения**: 720p (1280×720), 1080p (1920×1080)
- **FPS**: 30, 60, 120, 240 (зависит от камеры)
- **Битрейт**: 1-20 Mbps (CBR)
- **GOP**: 2 секунды
- **B-frames**: Отключены (zerolatency)

### Аудио параметры
- **Кодек**: AAC LC
- **Частота**: 48 kHz
- **Каналы**: Стерео

### Задержка
- **RTMP → SRS**: ~500ms
- **SRS → HTTP-FLV**: 2-4 секунды
- **Общая задержка**: 2.5-4.5 секунды

### DVR характеристики
- **Формат**: CMAF/fMP4
- **Сегменты**: 1 секунда
- **Retention**: 15 минут (настраивается)
- **Автоочистка**: Каждые 30 секунд

## 🔐 Безопасность

### Аутентификация
- ✅ **JWT токены** с 24-часовым TTL
- ✅ **2FA (TOTP)** через Google Authenticator
- ✅ **Secure cookies** с httpOnly флагом
- ✅ **Rate limiting** на критичных endpoints

### Шифрование
- ✅ **TLS 1.2/1.3** для всех соединений
- ✅ **HSTS заголовки** для принудительного HTTPS
- ✅ **CSP политики** против XSS атак

### Учетные данные по умолчанию
```
Username: admin
Password: admin123
```
⚠️ **ВАЖНО**: Смените пароль после первого входа!

## 📈 Мониторинг и статистика

### Метрики в реальном времени
- Битрейт потока
- FPS (кадры в секунду)
- Разрешение видео
- Длительность стрима
- Количество зрителей

### Логирование
- SRS: `/server/logs/srs.log`
- Nginx: `/server/logs/access.log`, `/server/logs/error.log`
- Auth Service: `/server/logs/auth.log`
- DVR Cleaner: `/server/logs/dvr-cleaner.log`

## 🛠️ Кастомизация

### Изменение retention времени DVR
```env
# server/.env
RETENTION_MINUTES=30  # Изменить на 30 минут
```

### Настройка битрейта по умолчанию
```swift
// ios-app/StreamingApp/VideoEncoder.swift
var bitrate: Int = 8_000_000 // 8 Mbps вместо 5 Mbps
```

### Добавление новых пользователей
```json
// server/auth-service/users.json
{
  "newuser": {
    "id": "user-002",
    "username": "newuser",
    "password": "$2a$12$...",
    "role": "user",
    "totpEnabled": false
  }
}
```

## 🔧 Устранение неполадок

### Частые проблемы

1. **iPhone не может подключиться к RTMP**
   - Проверьте порт 1935 в брандмауэре
   - Убедитесь, что SRS запущен: `docker-compose logs srs`

2. **Веб-интерфейс не загружается**
   - Проверьте SSL сертификаты
   - Проверьте Nginx: `docker-compose logs nginx`

3. **DVR не записывает**
   - Проверьте место на диске: `df -h`
   - Проверьте права доступа: `ls -la server/dvr/`

### Диагностические команды
```bash
# Статус всех сервисов
docker-compose ps

# Просмотр логов в реальном времени
docker-compose logs -f

# Проверка портов
ss -tlnp | grep -E "(1935|80|443|3000|8000|8080)"

# Тест RTMP соединения
ffmpeg -re -i test.mp4 -c copy -f flv rtmp://localhost/live/test
```

## 📦 Структура проекта

```
streaming-solution/
├── README.md                    # Основное описание
├── PROJECT_SUMMARY.md           # Данная сводка
├── deploy.sh                    # Скрипт автоматического развертывания
│
├── ios-app/                     # iOS приложение
│   └── StreamingApp/
│       ├── StreamingApp.xcodeproj/
│       ├── AppDelegate.swift
│       ├── CameraManager.swift
│       ├── VideoEncoder.swift
│       ├── RTMPStreamer.swift
│       ├── ViewController.swift
│       ├── SettingsViewController.swift
│       └── Info.plist
│
├── server/                      # Серверные компоненты
│   ├── docker-compose.yml
│   ├── srs.conf
│   ├── nginx.conf
│   ├── auth-service/
│   │   ├── package.json
│   │   ├── index.js
│   │   ├── users.json
│   │   └── Dockerfile
│   └── dvr-cleaner/
│       ├── package.json
│       ├── index.js
│       └── Dockerfile
│
├── web-interface/               # React веб-интерфейс
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── contexts/
│       │   ├── AuthContext.jsx
│       │   └── StreamContext.jsx
│       └── components/
│           ├── LoginPage.jsx
│           ├── StreamingInterface.jsx
│           ├── LivePlayer.jsx
│           ├── DVRPlayer.jsx
│           ├── Timeline.jsx
│           └── Header.jsx
│
└── docs/                        # Документация
    ├── deployment-guide.md
    ├── api-documentation.md
    └── ios-app-guide.md
```

## 🎉 Заключение

Данное решение представляет собой **готовую к production** систему для профессионального стриминга с iPhone 15 Pro Max. Все компоненты оптимизированы для:

- ✅ **Минимальной задержки** (2.5-4.5 секунды end-to-end)
- ✅ **Высокого качества** видео (до 1080p60)
- ✅ **Надежности** и отказоустойчивости
- ✅ **Безопасности** с современными стандартами
- ✅ **Удобства использования** с интуитивным интерфейсом

Система готова к использованию в профессиональных сценариях: онлайн трансляции, мониторинг, видеонаблюдение, и других задачах требующих качественного стриминга с мобильных устройств.

---

**Версия**: 1.0  
**Дата**: 2025-08-18  
**Совместимость**: iPhone 15 Pro Max, iOS 17+, Docker, современные браузеры
