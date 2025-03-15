// app.js
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Mock database
const users = {};
const transactions = [];

// Verify Telegram WebApp data
function verifyTelegramWebAppData(telegramInitData) {
    const initData = new URLSearchParams(telegramInitData);
    const hash = initData.get('hash');
    initData.delete('hash');
    
    // Sort in alphabetical order
    const dataCheckString = Array.from(initData.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    // Create HMAC-SHA256 hash using your bot token
    const secret = crypto.createHmac('sha256', 'WebAppData')
        .update(process.env.BOT_TOKEN)
        .digest();
    
    const calculatedHash = crypto
        .createHmac('sha256', secret)
        .update(dataCheckString)
        .digest('hex');
    
    return calculatedHash === hash;
}

// API endpoints
// User registration/login
app.post('/api/auth', (req, res) => {
    const { telegramInitData } = req.body;
    
    if (!verifyTelegramWebAppData(telegramInitData)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const initData = new URLSearchParams(telegramInitData);
    const user = JSON.parse(initData.get('user'));
    const userId = user.id.toString();
    
    // Initialize user if not exists
    if (!users[userId]) {
        users[userId] = {
            id: userId,
            name: user.first_name,
            balance: {
                USDT: 0
            },
            walletAddress: generateWalletAddress()
        };
    }
    
    res.json({ 
        user: users[userId],
        message: 'Authentication successful' 
    });
});

// Buy digital service
app.post('/api/buy', (req, res) => {
    const { userId, serviceType, provider, recipient, package, amount } = req.body;
    
    if (!users[userId]) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has enough balance
    if (users[userId].balance.USDT < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Process payment
    users[userId].balance.USDT -= amount;
    
    // Record transaction
    const txn = {
        id: generateTransactionId(),
        userId,
        type: serviceType,
        provider,
        recipient,
        package,
        amount,
        status: 'completed',
        timestamp: new Date()
    };
    
    transactions.push(txn);
    
    // Here you would integrate with the service provider's API
    // For example: callServiceProvider(serviceType, provider, recipient, package);
    
    res.json({
        transaction: txn,
        newBalance: users[userId].balance.USDT,
        message: 'Purchase successful'
    });
});

// Get crypto deposit address
app.get('/api/wallet/:userId', (req, res) => {
    const { userId } = req.params;
    
    if (!users[userId]) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
        walletAddress: users[userId].walletAddress
    });
});

// Helper functions
function generateWalletAddress() {
    // In production, you would integrate with a crypto wallet provider
    return '0x' + crypto.randomBytes(20).toString('hex');
}

function generateTransactionId() {
    return crypto.randomBytes(12).toString('hex');
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
