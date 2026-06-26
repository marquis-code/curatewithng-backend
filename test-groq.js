const OpenAI = require('openai');
require('dotenv').config();

async function run() {
  const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const systemPrompt = `You are GiftGenius, an expert Nigerian gift curator. Your role is to recommend the most thoughtful and appropriate gifts from a curated catalogue for a specific recipient. You understand Nigerian culture, gifting occasions like Owambe, weddings, and corporate events, and you prioritise gifts that feel personal and meaningful. Always respond with a valid JSON array only. No prose, no markdown, no explanation outside the JSON.`;

  const productList = [
    {
      "giftId": "6a397b6c2cb5ba36dc7ebdc1",
      "name": "Radiance Skincare Set",
      "category": "beauty",
      "price": 4500000,
      "tags": ["skincare", "glow", "self-care"],
      "occasions": ["valentines"],
      "recipientTypes": ["her"],
      "description": "Awesome skincare"
    },
    {
      "giftId": "6a397b602cb5ba36dc7ebdab",
      "name": "Sweet Tooth Box",
      "category": "hampers",
      "price": 3500000,
      "tags": ["candy", "sweet", "cute"],
      "occasions": ["valentines"],
      "recipientTypes": ["her"],
      "description": "Awesome candy box"
    }
  ];

  const userPrompt = `I need to buy a gift for my wife.
About them: 27 years old, female, interested in Fashion, Skincare, Cooking, Fitness, Travel.
Occasion: valentines. Budget: ₦5,000 – ₦50,000.
Additional context: I want to propose to her to be my girlfriend in August.

Here are the available gifts in our catalogue:
${JSON.stringify(productList)}

Return a JSON array of up to 8 gift recommendations ranked by suitability.
Each object must have: giftId (string), score (number 0-100), reasoning (string, max 30 words).`;

  const completion = await openai.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    max_completion_tokens: 1500,
    temperature: 0.6,
    messages: [
      { role: 'user', content: systemPrompt + '\n\n' + userPrompt }
    ],
    reasoning_effort: 'medium',
  });

  console.log("Response content:", completion.choices[0]?.message?.content);
}
run();
