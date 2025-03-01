const express = require('express');
const rateLimit = require('express-rate-limit');
const { suggestRecipes, getDetailedRecipe } = require('../controllers/ai.controller');
const { auth } = require('../middleware/auth.middleware');

const router = express.Router();

// Create a limiter for AI endpoints - 10 requests per 1 minute
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: { message: 'Too many requests, please try again later.' },
    // Add these options for proper IP handling with the updated trust proxy config
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to AI routes
router.use(aiLimiter);

router.post('/suggest', auth, async (req, res, next) => {
    try {
        await suggestRecipes(req, res);
    } catch (error) {
        next(error);
    }
});

router.post('/detail', auth, async (req, res, next) => {
    try {
        await getDetailedRecipe(req, res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;