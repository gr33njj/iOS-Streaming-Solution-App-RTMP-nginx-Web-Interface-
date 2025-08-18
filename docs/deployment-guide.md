# Руководство по развертыванию iOS Streaming Solution (App + RTMP nginx + Web Interface)

## Обзор

Данное руководство описывает процесс развертывания полного решения для потокового видео с iPhone 15 Pro Max, включающего:

- SRS медиа-сервер для RTMP и HTTP-FLV
- Nginx reverse proxy с SSL/TLS
- Сервис авторизации с JWT + 2FA
- Веб-интерфейс на React
- DVR с автоматической очисткой

## Системные требования

### Минимальные требования

- **CPU**: 2 vCPU (рекомендуется 4 vCPU)
- **RAM**: 4 GB (рекомендуется 8 GB)
- **Диск**: 20 GB SSD (рекомендуется 50 GB)
- **Сеть**: 100 Mbps (рекомендуется 1 Gbps)
- **ОС**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+

### Рекомендуемые требования

- **CPU**: 4+ vCPU
- **RAM**: 8+ GB
- **Диск**: 100+ GB NVMe SSD
- **Сеть**: 1+ Gbps с низкой задержкой
- **ОС**: Ubuntu 22.04 LTS

## Предварительная подготовка

### 1. Обновление системы

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Установка Docker и Docker Compose

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker --version
docker-compose --version
```

### 3. Настройка брандмауэра

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 1935/tcp
sudo ufw enable

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=1935/tcp
sudo firewall-cmd --reload
```

## Развертывание

### 1. Подготовка проекта

```bash
# Создание директории проекта
mkdir -p /opt/streaming-solution
cd /opt/streaming-solution

# Клонирование или копирование файлов проекта
# (предполагается, что файлы уже скопированы)

# Создание необходимых директорий
mkdir -p ssl logs dvr web auth nginx/conf.d
```

### 2. Настройка SSL сертификатов

#### Вариант A: Let's Encrypt (рекомендуется)

```bash
# Установка Certbot
sudo apt install certbot -y

# Получение сертификата
sudo certbot certonly --standalone -d your-domain.com

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem
```

#### Вариант B: Самоподписанный сертификат (для тестирования)

```bash
# Создание самоподписанного сертификата
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=NL/ST=Netherlands/L=Amsterdam/O=StreamingService/CN=your-domain.com"
```

### 3. Конфигурация переменных окружения

```bash
# Копирование примера конфигурации
cp server/.env.example server/.env

# Редактирование конфигурации
nano server/.env
```

Основные параметры для изменения:

```env
# Безопасность (ОБЯЗАТЕЛЬНО ИЗМЕНИТЬ)
JWT_SECRET=your-very-long-random-secret-key-here
SESSION_SECRET=another-very-long-random-secret-key-here

# Домен
DOMAIN=your-domain.com
CORS_ORIGIN=https://your-domain.com

# DVR настройки
RETENTION_MINUTES=15
CHECK_INTERVAL_SECONDS=30
```

### 4. Настройка Nginx конфигурации

```bash
# Редактирование nginx.conf
nano server/nginx.conf

# Замена your-domain.com на ваш домен
sed -i 's/your-domain.com/actual-domain.com/g' server/nginx.conf
```

### 5. Сборка веб-интерфейса

```bash
cd web-interface

# Установка зависимостей
npm install

# Сборка для production
npm run build

# Копирование собранных файлов
cp -r dist/* ../server/web/
cd ..
```

### 6. Запуск сервисов

```bash
cd server

# Запуск в production режиме
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

## Проверка развертывания

### 1. Проверка сервисов

```bash
# Проверка всех контейнеров
docker-compose ps

# Проверка логов отдельных сервисов
docker-compose logs srs
docker-compose logs nginx
docker-compose logs auth_service
docker-compose logs dvr_cleaner
```

### 2. Проверка доступности

```bash
# Проверка HTTPS
curl -I https://your-domain.com

# Проверка API авторизации
curl https://your-domain.com/api/auth/check

# Проверка RTMP (с локальной машины)
telnet your-domain.com 1935
```

### 3. Тестирование потока

1. Откройте веб-интерфейс: `https://your-domain.com`
2. Войдите с учетными данными: `admin` / `admin123`
3. Настройте iOS приложение с RTMP URL: `rtmp://your-domain.com/live/test`
4. Начните стриминг с iPhone 15 Pro Max

## Мониторинг и обслуживание

### 1. Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Использование диска
df -h
du -sh dvr/

# Сетевая активность
netstat -tulpn | grep -E "(1935|80|443|3000|8000|8080)"
```

### 2. Логи

```bash
# Просмотр логов в реальном времени
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f srs
docker-compose logs -f nginx

# Архивирование старых логов
find logs/ -name "*.log" -mtime +7 -exec gzip {} \;
```

### 3. Резервное копирование

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/streaming-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

# Конфигурации
cp -r server/ $BACKUP_DIR/
cp -r ssl/ $BACKUP_DIR/

# Пользователи
cp server/auth-service/users.json $BACKUP_DIR/

# Сжатие
tar -czf $BACKUP_DIR.tar.gz -C /backup $(basename $BACKUP_DIR)
rm -rf $BACKUP_DIR

echo "Backup created: $BACKUP_DIR.tar.gz"
```

### 4. Автоматическое обновление SSL

```bash
# Добавление в crontab
crontab -e

# Обновление сертификата каждые 2 месяца
0 3 1 */2 * /usr/bin/certbot renew --quiet && docker-compose restart nginx
```

## Оптимизация производительности

### 1. Настройки системы

```bash
# Увеличение лимитов файлов
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Оптимизация сети
echo 'net.core.rmem_default = 262144' >> /etc/sysctl.conf
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_default = 262144' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf

sysctl -p
```

### 2. Настройки Docker

```bash
# Ограничение логов Docker
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker
```

## Устранение неполадок

### Общие проблемы

1. **Контейнер не запускается**
   ```bash
   docker-compose logs [service_name]
   docker-compose up [service_name]
   ```

2. **Нет доступа к веб-интерфейсу**
   - Проверьте SSL сертификаты
   - Проверьте настройки DNS
   - Проверьте брандмауэр

3. **RTMP не работает**
   - Проверьте порт 1935
   - Проверьте логи SRS
   - Проверьте настройки сети

4. **DVR не записывает**
   - Проверьте права доступа к папке dvr/
   - Проверьте место на диске
   - Проверьте логи dvr-cleaner

### Команды диагностики

```bash
# Проверка портов
ss -tulpn | grep -E "(1935|80|443|3000|8000|8080)"

# Проверка DNS
nslookup your-domain.com

# Тест RTMP соединения
ffmpeg -re -i test.mp4 -c copy -f flv rtmp://your-domain.com/live/test

# Проверка HTTP-FLV
curl -I http://localhost:8000/live/live/test.flv
```

## Масштабирование

### Горизонтальное масштабирование

Для высоких нагрузок рассмотрите:

1. **Load Balancer** перед Nginx
2. **CDN** для доставки контента
3. **Кластер SRS** для множественных потоков
4. **Отдельный DVR сервер** с сетевым хранилищем

### Вертикальное масштабирование

1. Увеличьте ресурсы сервера
2. Оптимизируйте настройки SRS
3. Используйте SSD для DVR
4. Увеличьте пропускную способность сети

## Безопасность

### Рекомендации

1. **Регулярно обновляйте** Docker образы
2. **Используйте сильные пароли** и 2FA
3. **Ограничьте доступ** по IP если возможно
4. **Мониторьте логи** на подозрительную активность
5. **Настройте автоматические резервные копии**

### Мониторинг безопасности

```bash
# Установка fail2ban
sudo apt install fail2ban -y

# Конфигурация для Nginx
cat > /etc/fail2ban/jail.local << EOF
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
EOF

sudo systemctl restart fail2ban
```

Это завершает руководство по развертыванию. Следуйте инструкциям последовательно для успешной установки системы.
