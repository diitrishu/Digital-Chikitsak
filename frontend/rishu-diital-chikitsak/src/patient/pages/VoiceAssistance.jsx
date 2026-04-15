import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { Mic, MicOff, Volume2, VolumeX, Send, RotateCcw, Copy, Trash2 } from 'lucide-react';

const VoiceAssistance = () => {
  const { t, currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Mock AI responses for demonstration
  const mockAIResponses = [
    t('voiceAssistance.responses.greeting'),
    t('voiceAssistance.responses.feverAdvice'),
    t('voiceAssistance.responses.coughAdvice'),
    t('voiceAssistance.responses.headacheAdvice'),
    t('voiceAssistance.responses.stomachPainAdvice'),
    t('voiceAssistance.responses.breathingAdvice')
  ];

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = currentLanguage === 'pa' ? 'pa-IN' : currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [currentLanguage]);

  // Initialize speech synthesis
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = synthRef.current.getVoices();
      setVoices(availableVoices);
      
      // Select appropriate voice based on language
      const langCode = currentLanguage === 'pa' ? 'pa' : currentLanguage === 'hi' ? 'hi' : 'en';
      const preferredVoice = availableVoices.find(voice => 
        voice.lang.startsWith(langCode) || voice.name.includes(langCode.toUpperCase())
      );
      
      setSelectedVoice(preferredVoice || availableVoices[0]);
    };
    
    loadVoices();
    
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [currentLanguage]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(t('voiceAssistance.speechNotSupported'));
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.lang = currentLanguage === 'pa' ? 'pa-IN' : currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const toggleSpeaking = () => {
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
    }
  };

  const speakText = (text) => {
    if (!synthRef.current || isMuted) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const handleSend = () => {
    if (!userInput.trim()) return;
    
    // Add user message to conversation
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: userInput,
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);
    
    // Simulate AI response
    setTimeout(() => {
      const randomResponse = mockAIResponses[Math.floor(Math.random() * mockAIResponses.length)];
      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: randomResponse,
        timestamp: new Date()
      };
      
      setConversation(prev => [...prev, aiMessage]);
      
      // Speak the AI response if not muted
      if (!isMuted) {
        speakText(randomResponse);
      }
    }, 1000);
    
    // Clear input
    setUserInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearConversation = () => {
    setConversation([]);
    synthRef.current.cancel();
    setIsSpeaking(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getLanguageName = (langCode) => {
    switch (langCode) {
      case 'en': return 'English';
      case 'hi': return 'हिंदी';
      case 'pa': return 'ਪੰਜਾਬੀ';
      default: return 'English';
    }
  };

  return (
    <AppShell title="Voice Assistant">
      <div className="max-w-4xl mx-auto px-4 py-5">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {t('voiceAssistance.title')}
              </h1>
              <p className="text-gray-600">
                {t('voiceAssistance.subtitle')}
              </p>
            </div>

            {/* Voice Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={toggleListening}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isListening 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    {isListening ? t('voiceAssistance.stopListening') : t('voiceAssistance.startListening')}
                  </button>
                  
                  <button
                    onClick={toggleSpeaking}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isSpeaking 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    {isSpeaking ? t('voiceAssistance.stopSpeaking') : t('voiceAssistance.startSpeaking')}
                  </button>
                  
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isMuted 
                        ? 'bg-gray-600 text-white hover:bg-gray-700' 
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    {isMuted ? t('voiceAssistance.unmute') : t('voiceAssistance.mute')}
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={selectedVoice?.name || ''}
                    onChange={(e) => {
                      const voice = voices.find(v => v.name === e.target.value);
                      setSelectedVoice(voice);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {voices.map(voice => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={clearConversation}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <RotateCcw size={16} />
                    {t('voiceAssistance.clear')}
                  </button>
                </div>
              </div>
              
              {isListening && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-800">{t('voiceAssistance.listening')}...</span>
                </div>
              )}
              
              {isSpeaking && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-800">{t('voiceAssistance.speaking')}...</span>
                </div>
              )}
            </div>

            {/* Chat Interface */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Conversation */}
              <div className="h-96 overflow-y-auto p-4 bg-gray-50">
                {conversation.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <Mic size={48} className="mb-4" />
                    <p className="text-lg mb-2">{t('voiceAssistance.welcome')}</p>
                    <p className="text-sm text-center">
                      {t('voiceAssistance.instructions')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversation.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <p className="flex-1">{message.text}</p>
                            <button
                              onClick={() => copyToClipboard(message.text)}
                              className="opacity-70 hover:opacity-100"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <div className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex gap-2">
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('voiceAssistance.typePlaceholder')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows="2"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleSend}
                      disabled={!userInput.trim()}
                      className={`flex items-center justify-center h-11 w-11 rounded-lg ${
                        userInput.trim()
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Send size={20} />
                    </button>
                    <button
                      onClick={toggleListening}
                      className={`flex items-center justify-center h-11 w-11 rounded-lg ${
                        isListening
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      <Mic size={20} />
                    </button>
                  </div>
                </div>
                
                {/* Quick Phrases */}
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">{t('voiceAssistance.quickPhrases')}:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const phrase = t('voiceAssistance.phrases.fever');
                        setUserInput(phrase);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
                    >
                      {t('voiceAssistance.phrases.fever')}
                    </button>
                    <button
                      onClick={() => {
                        const phrase = t('voiceAssistance.phrases.cough');
                        setUserInput(phrase);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
                    >
                      {t('voiceAssistance.phrases.cough')}
                    </button>
                    <button
                      onClick={() => {
                        const phrase = t('voiceAssistance.phrases.headache');
                        setUserInput(phrase);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
                    >
                      {t('voiceAssistance.phrases.headache')}
                    </button>
                    <button
                      onClick={() => {
                        const phrase = t('voiceAssistance.phrases.stomachPain');
                        setUserInput(phrase);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
                    >
                      {t('voiceAssistance.phrases.stomachPain')}
                    </button>
                    <button
                      onClick={() => {
                        const phrase = t('voiceAssistance.phrases.breathingDifficulty');
                        setUserInput(phrase);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
                    >
                      {t('voiceAssistance.phrases.breathingDifficulty')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">{t('voiceAssistance.howToUse')}</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>{t('voiceAssistance.instruction1')}</li>
                <li>{t('voiceAssistance.instruction2')}</li>
                <li>{t('voiceAssistance.instruction3')}</li>
                <li>{t('voiceAssistance.instruction4')}</li>
                <li>{t('voiceAssistance.instruction5')}</li>
              </ul>
            </div>
          </div>
        </AppShell>
  );
};

export default VoiceAssistance;
