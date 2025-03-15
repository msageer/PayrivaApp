// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: String,
    username: String,
    walletAddress: {
        USDT: String
    },
    balance: {
        USDT: {
            type: Number,
            default: 0
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);

// models/Transaction.js
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'purchase', 'refund'],
        required: true
    },
    serviceType: {
        type: String,
        enum: ['data', 'airtime', 'electricity', 'tv', 'transfer'],
        required: function() {
            return this.type === 'purchase';
        }
    },
    provider: String,
    recipient: String,
    package: String,
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USDT'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    transactionHash: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
