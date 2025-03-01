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

// Check if the API key is properly configured
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}

// Initialize Gemini AI with the correct model name
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use the updated model name format (gemini-1.5-pro or gemini-1.0-pro)
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro", // Updated model name
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 2048,
  }
});

// More robust JSON extraction function
const extractJSONFromText = (text) => {
  try {
    // Remove any markdown formatting
    let cleanText = text.replace(/```(?:json)?\n?|\n?```/g, '').trim();
    
    // Try different approaches to find valid JSON
    // Approach 1: Find text between { and last }
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonStr = cleanText.slice(jsonStart, jsonEnd + 1);
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        // If this approach fails, we'll try another approach
        console.log("Approach 1 failed, trying approach 2");
      }
    }
    
    // Approach 2: Try to parse the entire text as JSON
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      // If this also fails, one more approach
      console.log("Approach 2 failed, trying approach 3");
    }
    
    // Approach 3: Handle potential trailing commas and other common issues
    const fixedJson = cleanText
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/'/g, '"') // Replace single quotes with double quotes
      .replace(/(\w+):/g, '"$1":') // Ensure property names are quoted
      .replace(/:\s*"?(\d+)"?/g, ': $1'); // Remove quotes around numeric values
    
    return JSON.parse(fixedJson);
  } catch (error) {
    console.error('JSON Extraction Error:', error);
    throw new Error('Could not extract valid JSON from AI response');
  }
};

const processAIResponse = async (model, prompt, maxRetries = 3) => {
  let attempt = 0;
  let lastError = null;
  
  while (attempt < maxRetries) {
    try {
      console.log(`AI Request Attempt ${attempt + 1}, Prompt: ${prompt.substring(0, 50)}...`);
      console.log('Using API key:', process.env.GEMINI_API_KEY ? 'API key is set' : 'API key is missing');
      
      // Generate content with enhanced prompt
      const enhancedPrompt = `${prompt}\n\nIMPORTANT: Your response MUST be a valid JSON object with NO additional text or explanation before or after the JSON.`;
      const result = await model.generateContent(enhancedPrompt);
      const text = result.response.text();
      
      console.log(`AI Raw Response: ${text.substring(0, 100)}...`);
      
      // Try to extract and parse JSON
      return extractJSONFromText(text);
    } catch (error) {
      lastError = error;
      attempt++;
      console.error(`AI Processing Attempt ${attempt} failed:`, error.message);
      
      // If we've hit max retries, throw the last error
      if (attempt === maxRetries) {
        console.error('All retry attempts failed');
        throw new Error(`Failed to generate valid response after ${maxRetries} attempts: ${lastError.message}`);
      }
      
      // Wait before retrying with increasing delay
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

exports.suggestRecipes = async (req, res) => {
  try {
    const { ingredients } = req.body;
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'Please provide a list of ingredients' });
    }

    console.log(`Generating recipe suggestions for ingredients: ${ingredients.join(', ')}`);

    const prompt = `As a professional chef, analyze these ingredients: ${ingredients.join(', ')}.
    Suggest exactly 3 possible dishes from these cuisines: ${Object.values(continentalCuisines).join(', ')}.
    
    Respond ONLY with a valid JSON object in this exact format, with no text before or after:
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
    
    // Validate the response structure
    if (!suggestions || !suggestions.suggestions || !Array.isArray(suggestions.suggestions)) {
      throw new Error('Invalid response structure from AI');
    }

    console.log('Successfully generated recipe suggestions');
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

    if (!dishName || !cuisine) {
      return res.status(400).json({ message: 'Please provide dish name and cuisine' });
    }

    console.log(`Generating detailed recipe for ${dishName} (${cuisine})`);

    const prompt = `As a professional chef, create a detailed recipe for ${dishName} (${cuisine} cuisine).
    Consider using these ingredients: ${ingredients ? ingredients.join(', ') : 'standard ingredients for this dish'}.
    
    Respond ONLY with a valid JSON object in this exact format, with no text before or after:
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
    
    // Validate the response structure
    if (!recipe || !recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Invalid recipe format from AI');
    }

    console.log('Successfully generated detailed recipe');
    res.json(recipe);
  } catch (error) {
    console.error('AI Detailed Recipe Error:', error);
    res.status(500).json({ 
      message: 'Unable to generate recipe details at this time. Please try again.' 
    });
  }
};