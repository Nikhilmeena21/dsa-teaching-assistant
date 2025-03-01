import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { XCircleIcon, SunIcon, MoonIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [problemUrl, setProblemUrl] = useState('');
  const [userQuestion, setUserQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messageEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset copy indicator after 2 seconds
  useEffect(() => {
    if (copiedIndex !== null) {
      const timer = setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedIndex]);

  const handleProblemAnalysis = async () => {
    if (!problemUrl.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Analyze problem
      const analysisResponse = await axios.post('http://localhost:5000/api/analyze-problem', {
        problemUrl
      });

      // Add problem analysis message
      const analysisMessage = {
        sender: 'bot',
        text: analysisResponse.data.analysis,
        type: 'problem-analysis',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, analysisMessage]);
    } catch (error) {
      console.error('Error analyzing problem:', error);
      setError(error.response?.data?.error || 'Failed to analyze the problem');
      
      const errorMessage = {
        sender: 'bot',
        text: error.response?.data?.details || 'Sorry, I couldn\'t analyze the problem. Please check if the URL is a valid LeetCode problem.',
        type: 'error',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userQuestion.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      sender: 'user',
      text: userQuestion,
      problemUrl: problemUrl,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear input fields
    setUserQuestion('');
    setIsLoading(true);
    setError(null);

    try {
      // Call backend to generate hint
      const response = await axios.post('http://localhost:5000/api/generate-hint', {
        problemUrl,
        userQuestion,
        conversationHistory: messages
      });

      // Add bot response
      const botMessage = {
        sender: 'bot',
        text: response.data.hint,
        problemUrl: response.data.problemUrl || problemUrl,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMessage]);

      // Update problem URL if not set
      if (response.data.problemUrl && !problemUrl) {
        setProblemUrl(response.data.problemUrl);
      }
    } catch (error) {
      console.error('Error generating hint:', error);
      setError(error.response?.data?.error || 'Failed to generate hint');
      
      const errorMessage = {
        sender: 'bot',
        text: error.response?.data?.details || 
              'Sorry, I encountered an error. Please check if your question is clear and the LeetCode URL is valid.',
        type: 'error',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetConversation = async () => {
    try {
      await axios.post('http://localhost:5000/api/reset-conversation');
      setMessages([]);
      setProblemUrl('');
      setUserQuestion('');
      setError(null);
    } catch (error) {
      console.error('Error resetting conversation:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
    });
  };

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`${darkMode ? 'bg-blue-900' : 'bg-blue-600'} text-white p-4 shadow-md`}>
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">DSA Problem Solving Assistant</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`${darkMode ? 'bg-blue-800' : 'bg-blue-500'} hover:bg-opacity-80 text-white p-2 rounded-full transition-colors`}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <button 
              onClick={resetConversation}
              className={`${darkMode ? 'bg-blue-800' : 'bg-blue-500'} hover:bg-opacity-80 text-white px-3 py-1 rounded text-sm transition-colors`}
              title="Start a new conversation"
            >
              New Conversation
            </button>
          </div>
        </div>
        <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-100'} mt-1 max-w-6xl mx-auto`}>
          Your teaching assistant for data structures and algorithms problems
        </p>
      </header>

      {error && (
        <div className={`${darkMode ? 'bg-red-900 border-red-700 text-red-100' : 'bg-red-100 border-red-400 text-red-700'} border px-4 py-3 rounded relative mx-auto my-4 max-w-6xl w-full transition-all duration-300 animate-fadeIn`}>
          <span className="block sm:inline">{error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer">
            <XCircleIcon className={`h-5 w-5 ${darkMode ? 'text-red-300' : 'text-red-500'}`} onClick={() => setError(null)} />
          </span>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className={`text-center ${darkMode ? 'text-gray-300 bg-gray-800' : 'text-gray-500 bg-white'} mt-10 p-6 rounded-lg shadow-sm transition-all duration-300 animate-fadeIn`}>
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'} mb-2`}>
                Welcome to the DSA Teaching Assistant!
              </h2>
              <p className="mb-4">Submit a LeetCode problem URL and ask questions to get help with your problem-solving approach.</p>
              <div className={`text-left ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} p-4 rounded-md`}>
                <p className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'} mb-2`}>How to use:</p>
                <ol className={`list-decimal pl-5 space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>Paste a LeetCode problem URL in the field below</li>
                  <li>Click "Analyze Problem" to get an overview of the problem</li>
                  <li>Ask specific questions about your approach or understanding</li>
                  <li>Receive guidance that helps you solve the problem yourself</li>
                </ol>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg shadow-sm transition-all duration-300 animate-slideIn ${
                  message.sender === 'user' 
                    ? `${darkMode ? 'bg-blue-900' : 'bg-blue-100'} ml-auto max-w-md` 
                    : message.type === 'error'
                      ? `${darkMode ? 'bg-red-900 border-l-4 border-red-700' : 'bg-red-50 border-l-4 border-red-500'} mr-auto max-w-md`
                      : message.type === 'problem-analysis'
                        ? `${darkMode ? 'bg-gray-800 border-l-4 border-green-700' : 'bg-white border-l-4 border-green-500'} mr-auto max-w-lg`
                        : `${darkMode ? 'bg-gray-800' : 'bg-white'} mr-auto max-w-md`
                }`}
              >
                {message.problemUrl && (
                  <div className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'} mb-2 underline`}>
                    <a href={message.problemUrl} target="_blank" rel="noopener noreferrer">
                      {message.problemUrl}
                    </a>
                  </div>
                )}
                <div className={`prose ${darkMode ? 'prose-invert max-w-none' : 'max-w-none'}`}>
                  <ReactMarkdown
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <div className="relative">
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                              customStyle={{
                                borderRadius: '0.375rem',
                                marginTop: '0.5rem',
                                marginBottom: '0.5rem',
                              }}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                            <button
                              onClick={() => copyToClipboard(String(children), index)}
                              className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 p-1 rounded text-xs text-white hover:bg-opacity-100 transition-colors"
                              title="Copy code"
                            >
                              {copiedIndex === index ? 
                                <CheckIcon className="h-4 w-4 text-green-400" /> : 
                                <ClipboardIcon className="h-4 w-4" />
                              }
                            </button>
                          </div>
                        ) : (
                          <code className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded px-1 py-0.5`} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>
                {message.timestamp && (
                  <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1 text-right`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg mr-auto max-w-md shadow-sm transition-all duration-300 animate-pulse`}>
              <div className="flex space-x-2 items-center">
                <div className={`w-2 h-2 ${darkMode ? 'bg-blue-500' : 'bg-blue-400'} rounded-full animate-bounce delay-75`}></div>
                <div className={`w-2 h-2 ${darkMode ? 'bg-blue-500' : 'bg-blue-400'} rounded-full animate-bounce delay-150`}></div>
                <div className={`w-2 h-2 ${darkMode ? 'bg-blue-500' : 'bg-blue-400'} rounded-full animate-bounce delay-300`}></div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} ml-2`}>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>
      </div>

      <div className={`border-t p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex mb-2">
            <input
              type="text"
              placeholder="LeetCode Problem URL (e.g., https://leetcode.com/problems/two-sum/)"
              value={problemUrl}
              onChange={(e) => setProblemUrl(e.target.value)}
              className={`flex-1 p-2 border rounded-l ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500' 
                  : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-300'
              } focus:outline-none transition-colors duration-200`}
              disabled={isLoading}
            />
            <button
              onClick={handleProblemAnalysis}
              className={`${
                isLoading 
                  ? darkMode ? 'bg-green-800 cursor-not-allowed' : 'bg-green-400 cursor-not-allowed'
                  : darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'
              } text-white px-4 py-2 rounded-r transition-colors duration-200`}
              disabled={isLoading}
            >
              Analyze Problem
            </button>
          </div>
          <div className="flex">
            <textarea
              placeholder="Ask about the problem... (e.g., How do I approach this? What data structure should I use?)"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              onKeyDown={handleKeyPress}
              className={`flex-1 p-2 border rounded-l ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500' 
                  : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-300'
              } focus:outline-none min-h-[60px] resize-y transition-colors duration-200`}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              className={`${
                isLoading || (!userQuestion.trim())
                  ? darkMode ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-400 cursor-not-allowed'
                  : darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-4 py-2 rounded-r transition-colors duration-200 self-stretch flex items-center`}
              disabled={isLoading || !userQuestion.trim()}
            >
              Send
            </button>
          </div>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            Press Enter to send. Shift+Enter for new line.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;