const express = require('express');
const { check, query } = require('express-validator');
const { 
  createRecipe, 
  getAllRecipes, 
  getRecipeById, 
  updateRecipe, 
  deleteRecipe,
  toggleLike
} = require('../controllers/recipe.controller');
const { auth } = require('../middleware/auth.middleware');
const validateRequest = require('../middleware/validate.middleware');

const router = express.Router();

// Validation rules
const recipeValidation = [
  check('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
  check('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20 }).withMessage('Description must be at least 20 characters long'),
  check('ingredients')
    .isArray({ min: 1 }).withMessage('At least one ingredient is required')
    .custom(ingredients => ingredients.every(i => i.trim().length > 0))
    .withMessage('Ingredients cannot be empty'),
  check('instructions')
    .isArray({ min: 1 }).withMessage('At least one instruction step is required')
    .custom(instructions => instructions.every(i => i.trim().length > 0))
    .withMessage('Instructions cannot be empty'),
  check('cookingTime')
    .isInt({ min: 1 }).withMessage('Cooking time must be a positive number'),
  check('servings')
    .isInt({ min: 1 }).withMessage('Number of servings must be a positive number')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive number'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('sort')
    .optional()
    .isIn(['createdAt', 'title', 'cookingTime', 'likes'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sort order')
];

// Routes
router.get('/', paginationValidation, validateRequest, getAllRecipes);
router.get('/:id', getRecipeById);
router.post('/', auth, recipeValidation, validateRequest, createRecipe);
router.put('/:id', auth, recipeValidation, validateRequest, updateRecipe);
router.delete('/:id', auth, deleteRecipe);
router.post('/:id/like', auth, toggleLike);

module.exports = router;