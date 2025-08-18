const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const Joi = require('joi');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация
const config = {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    totpIssuer: process.env.TOTP_ISSUER || 'StreamingService',
    sessionSecret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-this-too',
    usersFile: path.join(__dirname, 'users.json'),
    sessionsFile: path.join(__dirname, 'data', 'sessions.json'),
    logsDir: path.join(__dirname, 'logs'),
    dvrDir: process.env.DVR_DIR || '/app/dvr'
};

// Создаем необходимые директории
fs.ensureDirSync(path.dirname(config.sessionsFile));
fs.ensureDirSync(config.logsDir);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://your-domain.com',
    credentials: true
}));

app.use(morgan('combined', {
    stream: fs.createWriteStream(path.join(config.logsDir, 'access.log'), { flags: 'a' })
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

// Validation schemas
const loginSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).max(128).required(),
    totp: Joi.string().length(6).pattern(/^[0-9]+$/).optional()
});

// Утилиты для работы с пользователями
class UserManager {
    constructor(filePath) {
        this.filePath = filePath;
        this.users = this.loadUsers();
    }

    loadUsers() {
        try {
            if (fs.existsSync(this.filePath)) {
                return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            }
            return {};
        } catch (error) {
            console.error('Error loading users:', error);
            return {};
        }
    }

    saveUsers() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.users, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving users:', error);
            return false;
        }
    }

    async verifyUser(username, password, totp = null) {
        const user = this.users[username];
        if (!user) {
            throw new Error('User not found');
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        if (user.totpEnabled && totp) {
            const isValidTotp = speakeasy.totp.verify({
                secret: user.totpSecret,
                encoding: 'base32',
                token: totp,
                window: 2
            });

            if (!isValidTotp) {
                throw new Error('Invalid TOTP code');
            }
        }

        user.lastLogin = new Date().toISOString();
        this.saveUsers();
        return user;
    }

    getUser(username) {
        return this.users[username];
    }
}

const userManager = new UserManager(config.usersFile);

// Middleware для авторизации
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.session.token;
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = userManager.getUser(decoded.username);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        res.set('X-User', user.username);
        res.set('X-User-ID', user.id);
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// API Routes

// Авторизация
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { username, password, totp } = value;
        const user = await userManager.verifyUser(username, password, totp);

        const token = jwt.sign(
            { username: user.username, userId: user.id, role: user.role },
            config.jwtSecret,
            { expiresIn: '24h' }
        );

        req.session.token = token;
        req.session.userId = user.id;

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                totpEnabled: user.totpEnabled
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

// Проверка токена
app.get('/api/auth/check', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.session.token;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = userManager.getUser(decoded.username);
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.set('X-User', user.username);
        res.set('X-User-ID', user.id);
        
        res.json({
            valid: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
});
