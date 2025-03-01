import axios from 'axios';

// Prompt engineering library
const PROMPT_TEMPLATES = {
  initial_guidance: (problem, question) => `
    You are a patient, encouraging DSA teaching assistant. 
    A student is working on a problem from ${problem}. 
    They are struggling with: ${question}

    Your goal is to:
    - Ask guiding questions
    - Provide conceptual insights
    - Encourage independent thinking
    - Break down the problem into smaller steps

    Do NOT give away the solution. 
    Help the student develop problem-solving skills.
  `,

  follow_up_hint: (previousContext) => `
    Based on the previous interaction where the student was struggling with: 
    ${previousContext}

    Provide a subtle hint that:
    - Doesn't reveal the full solution
    - Encourages strategic thinking
    - Highlights a key concept or approach
  `
};

export async function generateProblemHint(problemUrl, userQuestion) {
  // In a real implementation, you'd use an actual LLM API
  // For now, we'll simulate a helpful response
  const hints = [
    "Have you considered what data structure might help solve this efficiently?",
    "Break down the problem into smaller, more manageable steps.",
    "Think about the time and space complexity requirements.",
    "What are the key constraints of the problem?",
    "Can you identify any patterns in the input that might suggest an approach?"
  ];

  // Randomly select a hint
  return hints[Math.floor(Math.random() * hints.length)];
}