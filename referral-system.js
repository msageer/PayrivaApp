// models/User.js - Updated with referral fields
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
    // New referral fields
    referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: String,
        default: null
    },
    referralPoints: {
        type: Number,
        default: 0
    },
    referrals: [{
        userId: String,
        date: Date,
        pointsEarned: Number
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Generate unique referral code before saving
UserSchema.pre('save', async function(next) {
    if (!this.referralCode) {
        // Generate a referral code using first name and random string
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.referralCode = `${this.firstName.substring(0, 3).toUpperCase()}${randomStr}`;
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);

// referral-service.js
class ReferralService {
    // Process new user referral
    async processReferral(newUserId, referralCode) {
        const User = require('./models/User');
        
        try {
            // Find referrer by code
            const referrer = await User.findOne({ referralCode });
            if (!referrer) {
                return { success: false, message: 'Invalid referral code' };
            }
            
            // Find new user
            const newUser = await User.findOne({ telegramId: newUserId });
            if (!newUser) {
                return { success: false, message: 'User not found' };
            }
            
            // Check if already referred
            if (newUser.referredBy) {
                return { success: false, message: 'User already has a referrer' };
            }
            
            // Set referral relationship and award points
            const POINTS_PER_REFERRAL = 100;
            
            newUser.referredBy = referrer.telegramId;
            await newUser.save();
            
            referrer.referralPoints += POINTS_PER_REFERRAL;
            referrer.referrals.push({
                userId: newUserId,
                date: new Date(),
                pointsEarned: POINTS_PER_REFERRAL
            });
            await referrer.save();
            
            return { 
                success: true, 
                message: 'Referral processed successfully',
                pointsAwarded: POINTS_PER_REFERRAL
            };
        } catch (error) {
            console.error('Error processing referral:', error);
            return { success: false, message: 'Failed to process referral' };
        }
    }
    
    // Convert points to tokens/credit
    async convertPoints(userId, pointsToConvert, conversionType) {
        const User = require('./models/User');
        
        try {
            const user = await User.findOne({ telegramId: userId });
            if (!user) {
                return { success: false, message: 'User not found' };
            }
            
            if (user.referralPoints < pointsToConvert) {
                return { success: false, message: 'Insufficient points' };
            }
            
            let conversionRate;
            let currency;
            
            // Set conversion rates
            switch (conversionType) {
                case 'PLATFORM_CREDIT':
                    conversionRate = 1; // 1 point = $1 credit
                    currency = 'CREDIT';
                    break;
                case 'USDT':
                    conversionRate = 0.01; // 100 points = 1 USDT
                    currency = 'USDT';
                    break;
                case 'TON':
                    conversionRate = 0.005; // 200 points = 1 TON
                    currency = 'TON';
                    break;
                case 'PRV':
                    conversionRate = 0.02; // 50 points = 1 PRV
                    currency = 'PRV';
                    break;
                default:
                    return { success: false, message: 'Invalid conversion type' };
            }
            
            const convertedAmount = pointsToConvert * conversionRate;
            
            // Update user's balance
            user.referralPoints -= pointsToConvert;
            
            if (currency === 'CREDIT') {
                // Add to platform credit
                // This would be implemented based on your credit system
                console.log(`Added ${convertedAmount} to platform credit`);
            } else {
                // Add to crypto balance
                if (!user.balance[currency]) {
                    user.balance[currency] = 0;
                }
                user.balance[currency] += convertedAmount;
            }
            
            await user.save();
            
            // Record the conversion in transactions
            const Transaction = require('./models/Transaction');
            await Transaction.create({
                userId: user.telegramId,
                type: 'conversion',
                amount: convertedAmount,
                currency,
                status: 'completed',
                metadata: {
                    pointsConverted: pointsToConvert,
                    conversionRate
                }
            });
            
            return {
                success: true,
                message: `Successfully converted ${pointsToConvert} points to ${convertedAmount} ${currency}`,
                convertedAmount,
                currency,
                remainingPoints: user.referralPoints
            };
        } catch (error) {
            console.error('Error converting points:', error);
            return { success: false, message: 'Failed to convert points' };
        }
    }
}

module.exports = new ReferralService();
