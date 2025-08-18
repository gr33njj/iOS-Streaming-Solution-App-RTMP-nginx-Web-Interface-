#!/bin/bash

# iPhone 15 Pro Max Streaming Solution - Deployment Script
# Автоматический скрипт развертывания

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "  iPhone 15 Pro Max Streaming Solution"
    echo "  Deployment Script v1.0"
    echo "=================================================="
    echo -e "${NC}"
}

# Проверка аргументов
if [ $# -eq 0 ]; then
    print_header
    echo "Usage: $0 [development|production] [domain]"
    echo ""
    echo "Examples:"
    echo "  $0 development                    # Local development"
    echo "  $0 production your-domain.com     # Production deployment"
    echo ""
    exit 1
fi

MODE=$1
DOMAIN=${2:-"localhost"}

print_header
print_info "Deploying in $MODE mode for domain: $DOMAIN"

# Проверка системы
check_system() {
    print_info "Checking system requirements..."
    
    # Проверка Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Проверка Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Проверка прав Docker
    if ! docker ps &> /dev/null; then
        print_error "Cannot access Docker. Please add your user to docker group or run as root."
        exit 1
    fi
    
    print_success "System requirements met"
}

# Создание директорий
create_directories() {
    print_info "Creating directories..."
    
    mkdir -p server/ssl
    mkdir -p server/logs
    mkdir -p server/dvr
    mkdir -p server/web
    mkdir -p server/auth
    mkdir -p server/nginx/conf.d
    
    print_success "Directories created"
}

# Настройка SSL сертификатов
setup_ssl() {
    print_info "Setting up SSL certificates..."
    
    if [ "$MODE" = "development" ]; then
        # Самоподписанный сертификат для разработки
        if [ ! -f "server/ssl/cert.pem" ] || [ ! -f "server/ssl/key.pem" ]; then
            print_info "Generating self-signed certificate for development..."
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout server/ssl/key.pem \
                -out server/ssl/cert.pem \
                -subj "/C=NL/ST=Netherlands/L=Amsterdam/O=StreamingService/CN=$DOMAIN" \
                2>/dev/null
            print_success "Self-signed certificate generated"
        else
            print_info "SSL certificates already exist"
        fi
    else
        # Production - проверка существующих сертификатов
        if [ ! -f "server/ssl/cert.pem" ] || [ ! -f "server/ssl/key.pem" ]; then
            print_warning "SSL certificates not found!"
            print_info "For production, please:"
            print_info "1. Obtain SSL certificates (Let's Encrypt recommended)"
            print_info "2. Copy fullchain.pem to server/ssl/cert.pem"
            print_info "3. Copy privkey.pem to server/ssl/key.pem"
            print_info ""
            print_info "Let's Encrypt example:"
            print_info "  sudo certbot certonly --standalone -d $DOMAIN"
            print_info "  sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem server/ssl/cert.pem"
            print_info "  sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem server/ssl/key.pem"
            print_info "  sudo chown \$USER:\$USER server/ssl/*.pem"
            exit 1
        fi
    fi
}

# Настройка конфигурации
setup_config() {
    print_info "Setting up configuration..."
    
    # Создание .env файла если не существует
    if [ ! -f "server/.env" ]; then
        cp server/.env.example server/.env
        print_info "Created .env file from template"
    fi
    
    # Обновление домена в конфигурации
    if [ "$DOMAIN" != "localhost" ]; then
        print_info "Updating domain configuration..."
        sed -i.bak "s/your-domain.com/$DOMAIN/g" server/nginx.conf
        sed -i.bak "s/your-domain.com/$DOMAIN/g" server/.env
        print_success "Domain updated to $DOMAIN"
    fi
    
    # Генерация секретных ключей для production
    if [ "$MODE" = "production" ]; then
        print_info "Generating secure secrets for production..."
        
        JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        
        sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" server/.env
        sed -i.bak "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" server/.env
        
        print_success "Secure secrets generated"
    fi
}

# Сборка веб-интерфейса
build_web() {
    print_info "Building web interface..."
    
    if [ -d "web-interface" ]; then
        cd web-interface
        
        # Проверка Node.js
        if ! command -v npm &> /dev/null; then
            print_error "npm is not installed. Please install Node.js and npm first."
            exit 1
        fi
        
        # Установка зависимостей
        print_info "Installing dependencies..."
        npm ci --silent
        
        # Сборка
        print_info "Building for $MODE..."
        if [ "$MODE" = "production" ]; then
            npm run build
        else
            npm run build
        fi
        
        # Копирование файлов
        if [ -d "dist" ]; then
            rm -rf ../server/web/*
            cp -r dist/* ../server/web/
            print_success "Web interface built and copied"
        else
            print_error "Build failed - dist directory not found"
            exit 1
        fi
        
        cd ..
    else
        print_warning "Web interface directory not found, skipping build"
    fi
}

# Запуск сервисов
start_services() {
    print_info "Starting services..."
    
    cd server
    
    # Остановка существующих контейнеров
    if docker-compose ps -q | grep -q .; then
        print_info "Stopping existing containers..."
        docker-compose down
    fi
    
    # Запуск в зависимости от режима
    if [ "$MODE" = "production" ]; then
        print_info "Starting in production mode..."
        docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
    else
        print_info "Starting in development mode..."
        docker-compose up -d
    fi
    
    cd ..
    
    # Ожидание запуска сервисов
    print_info "Waiting for services to start..."
    sleep 10
    
    # Проверка статуса
    cd server
    if docker-compose ps | grep -q "Up"; then
        print_success "Services started successfully"
    else
        print_error "Some services failed to start"
        docker-compose ps
        docker-compose logs
        exit 1
    fi
    cd ..
}

# Проверка развертывания
verify_deployment() {
    print_info "Verifying deployment..."
    
    # Проверка портов
    local ports=(80 443 1935 3000 8000 8080)
    for port in "${ports[@]}"; do
        if ss -tlnp | grep -q ":$port "; then
            print_success "Port $port is listening"
        else
            print_warning "Port $port is not listening"
        fi
    done
    
    # Проверка HTTPS (если не localhost)
    if [ "$DOMAIN" != "localhost" ]; then
        if curl -s -k "https://$DOMAIN" > /dev/null; then
            print_success "HTTPS endpoint is accessible"
        else
            print_warning "HTTPS endpoint is not accessible"
        fi
    fi
    
    # Проверка API
    if curl -s "http://localhost:3000/health" | grep -q "healthy"; then
        print_success "Auth service is healthy"
    else
        print_warning "Auth service health check failed"
    fi
}

# Вывод информации о развертывании
show_deployment_info() {
    print_success "Deployment completed!"
    echo ""
    echo -e "${GREEN}=== Deployment Information ===${NC}"
    echo ""
    echo "Mode: $MODE"
    echo "Domain: $DOMAIN"
    echo ""
    echo "Web Interface:"
    if [ "$MODE" = "production" ]; then
        echo "  https://$DOMAIN"
    else
        echo "  https://localhost (with SSL warning)"
        echo "  http://localhost"
    fi
    echo ""
    echo "Default Credentials:"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo ""
    echo "RTMP URL for iPhone app:"
    echo "  rtmp://$DOMAIN/live/your-stream-key"
    echo ""
    echo "Service URLs:"
    echo "  SRS API: http://localhost:8080"
    echo "  Auth API: http://localhost:3000"
    echo "  HTTP-FLV: http://localhost:8000"
    echo ""
    echo "Useful Commands:"
    echo "  View logs: docker-compose -f server/docker-compose.yml logs -f"
    echo "  Stop services: docker-compose -f server/docker-compose.yml down"
    echo "  Restart services: docker-compose -f server/docker-compose.yml restart"
    echo ""
    
    if [ "$MODE" = "production" ]; then
        echo -e "${YELLOW}Production Notes:${NC}"
        echo "- Change default password after first login"
        echo "- Set up SSL certificate auto-renewal"
        echo "- Configure monitoring and backups"
        echo "- Review security settings"
        echo ""
    fi
    
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Open web interface and login"
    echo "2. Configure iPhone 15 Pro Max app with RTMP URL"
    echo "3. Start streaming and test functionality"
    echo "4. Set up monitoring and alerts"
    echo ""
}

# Основная функция
main() {
    check_system
    create_directories
    setup_ssl
    setup_config
    build_web
    start_services
    verify_deployment
    show_deployment_info
}

# Обработка ошибок
trap 'print_error "Deployment failed! Check the logs above."; exit 1' ERR

# Запуск
main

print_success "Deployment script completed successfully!"
