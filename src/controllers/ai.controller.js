const Recipe = require('../models/recipe.model');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const continentalCuisines = {
  indian: 'Indian',
  chinese: 'Chinese',
  monghlai: 'Moghlai',
  european: 'European',
  american: 'American',
  latin: 'Latin American',
  italian: 'Italian',
  french: 'French',
  japanese: 'Japanese'
};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const safeJSONParse = (text) => {
  try {
    // Remove any markdown formatting
    let cleanText = text.replace(/```(?:json)?\n?|\n?```/g, '').trim();
    // Find the first { and last }
    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('No valid JSON object found in response');
    }
    cleanText = cleanText.slice(startIdx, endIdx + 1);
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('JSON Parse Error:', error);
    throw new Error('Failed to parse AI response');
  }
};

const processAIResponse = async (model, prompt, maxRetries = 3) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Remove any markdown formatting and find valid JSON
      const cleanText = text.replace(/```(?:json)?\n?|\n?```/g, '').trim();
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No valid JSON found in response');
      }
      
      const jsonStr = cleanText.slice(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    } catch (error) {
      attempt++;
      if (attempt === maxRetries) {
        throw new Error('Failed to generate valid response after multiple attempts');
      }
      // Wait briefly before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

exports.suggestRecipes = async (req, res) => {
  try {
    const { ingredients } = req.body;
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'Please provide a list of ingredients' });
    }

    const prompt = `As a professional chef, analyze these ingredients: ${ingredients.join(', ')}.
    Suggest exactly 3 possible dishes from these cuisines: ${Object.values(continentalCuisines).join(', ')}.
    Respond ONLY with a JSON object in this exact format:
    {
      "suggestions": [
        {
          "cuisine": "cuisine_name",
          "dishName": "dish_name",
          "possibleWithIngredients": ["ingredients_from_list"],
          "additionalIngredientsNeeded": ["extra_ingredients"],
          "briefDescription": "short_description"
        }
      ]
    }`;

    const suggestions = await processAIResponse(model, prompt);
    
    if (!suggestions.suggestions || !Array.isArray(suggestions.suggestions)) {
      throw new Error('Invalid response structure from AI');
    }

    res.json(suggestions);
  } catch (error) {
    console.error('AI Recipe Suggestion Error:', error);
    res.status(500).json({ 
      message: 'Unable to generate recipe suggestions at this time. Please try again.' 
    });
  }
};

exports.getDetailedRecipe = async (req, res) => {
  try {
    const { dishName, cuisine, ingredients } = req.body;

    const prompt = `As a professional chef, create a detailed recipe for ${dishName} (${cuisine} cuisine).
    Consider using these ingredients: ${ingredients.join(', ')}.
    Respond ONLY with a JSON object in this exact format:
    {
      "title": "${dishName}",
      "cuisine": "${cuisine}",
      "description": "brief_description",
      "ingredients": ["exact_measurements"],
      "instructions": ["step_by_step_instructions"],
      "cookingTime": number_in_minutes,
      "servings": number_of_servings,
      "tips": ["cooking_tips"]
    }`;

    const recipe = await processAIResponse(model, prompt);
    
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Invalid recipe format from AI');
    }

    res.json(recipe);
  } catch (error) {
    console.error('AI Detailed Recipe Error:', error);
    res.status(500).json({ 
      message: 'Unable to generate recipe details at this time. Please try again.' 
    });
  }
};