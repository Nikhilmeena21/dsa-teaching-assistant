import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';

// Load environment variables
dotenv.config();

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  
  if (['POST', 'PUT'].includes(req.method)) {
    console.log('Request Body:', req.body);
  }
  
  next();
};
app.use(logger);

// Problem-specific prompt generation function
function createProblemSpecificPrompt(problemUrl, userQuestion) {
    return `
  🧩 Reverse Linked List - Problem Solving Guide
  
  🔍 Strategic Problem Decomposition:
  
  Core Problem Analysis:
  - Understand the fundamental challenge of list reversal
  - Identify key algorithmic and structural considerations
  
  🌟 Problem-Solving Dimensions:
  
  1. Structural Understanding:
     - What defines a linked list node?
     - How are nodes interconnected?
     - What information must be preserved during reversal?
  
  2. Algorithmic Thinking:
     - Explore two primary reversal strategies:
       a) Iterative approach
       b) Recursive method
     - Consider pointer manipulation techniques
     - Analyze memory and time complexity trade-offs
  
  3. Conceptual Challenges:
     - How to redirect node connections?
     - What variables are crucial for transformation?
     - How to maintain list integrity during reversal?
  
  🚀 Progressive Learning Pathway:
  
  Beginner Level:
  - Visualize list transformation
  - Understand node connection mechanics
  - Practice drawing reversal steps
  
  Intermediate Level:
  - Develop iterative reversal logic
  - Master pointer redirection
  - Handle edge cases (empty/single-node lists)
  
  Advanced Level:
  - Optimize space complexity
  - Implement recursive solution
  - Analyze algorithmic efficiency
  
  💡 Reflection Triggers:
  - What makes list reversal conceptually challenging?
  - How would you explain the process to a beginner?
  - Can you identify real-world scenarios requiring list reversal?
  
  🌈 Hint Progression:
  🌱 Basic: Understand node structure
  🌿 Intermediate: Explore reversal strategies
  🌳 Advanced: Optimize and generalize solution
  
  Remember: The goal is not just solving the problem, but developing robust problem-solving skills.
  `;
  }

// Route for generating hints
app.post('/api/generate-hint', async (req, res) => {
  try {
    const { problemUrl, userQuestion, conversationHistory } = req.body;

    // Validate input
    if (!userQuestion) {
      return res.status(400).json({ 
        error: 'Question is required' 
      });
    }

    // Use the last known problem URL if not provided
    const currentProblemUrl = problemUrl || (conversationHistory && conversationHistory.length > 0 
      ? conversationHistory[conversationHistory.length - 1].problemUrl 
      : null);

    if (!currentProblemUrl) {
      return res.status(400).json({ 
        error: 'Problem URL is required' 
      });
    }

    // Prepare conversation context
    const contextMessages = conversationHistory 
      ? conversationHistory.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }))
      : [];

    // Generate hint using Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: createProblemSpecificPrompt(currentProblemUrl, userQuestion)
        },
        ...contextMessages,
        {
          role: "user",
          content: userQuestion
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.5,
      max_tokens: 350
    });

    // Extract the hint from the response
    const hint = chatCompletion.choices[0]?.message?.content || 
      "I'm having trouble generating a specific hint. Could you provide more details about your approach?";

    console.log('Generated Hint:', hint);

    res.json({ 
      hint, 
      problemUrl: currentProblemUrl 
    });
  } catch (error) {
    console.error('Detailed Error:', error);

    res.status(500).json({ 
      error: 'Failed to generate hint', 
      details: error.message,
      fullError: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});