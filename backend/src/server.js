import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';
import rateLimit from 'express-rate-limit';

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

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

// Validate LeetCode URL
const isValidLeetCodeUrl = (url) => {
  const leetCodePattern = /^https?:\/\/(www\.)?leetcode\.com\/problems\/[a-zA-Z0-9-]+\/?/;
  return leetCodePattern.test(url);
};

// Problem-specific prompt generation function
function createProblemSpecificPrompt(problemUrl, userQuestion) {
  // Extract problem name from URL for more specific prompting
  const problemName = problemUrl.match(/problems\/([a-zA-Z0-9-]+)/)?.[1]?.replace(/-/g, ' ') || 'DSA problem';
  
  return `
As a DSA teaching assistant, you're helping a student with the "${problemName}" problem from ${problemUrl}.

Your role is to guide without revealing complete solutions:
- Ask thought-provoking questions to deepen understanding
- Provide conceptual insights and smaller hints
- Explain relevant algorithms and data structures
- Break down the problem into manageable steps
- Connect this problem to similar patterns the student might recognize

IMPORTANT GUIDELINES:
- DO NOT provide complete solutions or working code
- DO give algorithmic insights and approaches
- DO encourage the student to think step-by-step
- DO refer to relevant CS concepts that apply to this problem
- DO adjust your hints based on the student's questions and understanding level

The student's current question is: ${userQuestion}

Begin your response with thoughtful analysis of what the student is asking, then provide guidance that helps them reach their own solution.
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

    // Validate LeetCode URL format
    if (!isValidLeetCodeUrl(currentProblemUrl)) {
      return res.status(400).json({
        error: 'Invalid LeetCode URL. Please provide a URL in the format: https://leetcode.com/problems/problem-name/'
      });
    }

    // Prepare conversation context - limit to last 5 exchanges for efficiency
    const recentMessages = conversationHistory 
      ? conversationHistory.slice(-10).map(msg => ({
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
        ...recentMessages,
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

    console.log('Generated Hint:', hint.substring(0, 100) + '...');

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

// Problem Analysis Route
app.post('/api/analyze-problem', async (req, res) => {
  try {
    const { problemUrl } = req.body;

    // Validate input
    if (!problemUrl) {
      return res.status(400).json({ 
        error: 'Problem URL is required' 
      });
    }

    // Validate LeetCode URL format
    if (!isValidLeetCodeUrl(problemUrl)) {
      return res.status(400).json({
        error: 'Invalid LeetCode URL. Please provide a URL in the format: https://leetcode.com/problems/problem-name/'
      });
    }

    // Extract problem name for better prompting
    const problemName = problemUrl.match(/problems\/([a-zA-Z0-9-]+)/)?.[1]?.replace(/-/g, ' ') || 'the problem';

    // Analyze problem structure
    const analysisCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Provide a concise educational analysis of the LeetCode problem "${problemName}" at ${problemUrl}.
          
          Include:
          1. Problem type and category (e.g., array manipulation, graph traversal)
          2. Key data structures and algorithms relevant to this problem
          3. Conceptual approaches to solving it (without full solutions)
          4. Common challenges students face with this problem type
          5. How this problem connects to fundamental CS concepts
          
          Format your response in markdown with clear sections. Remember, your goal is to help the student understand the problem framework, not solve it for them.`
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.4,
      max_tokens: 400
    });

    const analysis = analysisCompletion.choices[0]?.message?.content || 
      "Unable to provide a detailed analysis of the problem.";

    res.json({ analysis });
  } catch (error) {
    console.error('Error analyzing problem:', error);
    res.status(500).json({ 
      error: 'Failed to analyze problem', 
      details: error.message 
    });
  }
});

// Reset conversation route
app.post('/api/reset-conversation', (req, res) => {
  // This is a simple endpoint that doesn't need to do anything on the backend
  // It just allows the frontend to have a clear API for resetting
  res.json({ success: true, message: 'Conversation reset' });
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
  console.log(`API endpoints available at http://localhost:${PORT}/api/`);
});