const express = require('express');
const { check } = require('express-validator');
const { register, login, getMe } = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth.middleware');
const validateRequest = require('../middleware/validate.middleware');

const router = express.Router();

// Validation rules
const registerValidation = [
  check('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  check('email')
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('Please provide a valid email address'),
  check('password')
    .trim()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/\d/).withMessage('Password must contain at least one number')
];

const loginValidation = [
  check('email')
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('Please provide a valid email address'),
  check('password')
    .notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.get('/me', auth, getMe);

module.exports = router;