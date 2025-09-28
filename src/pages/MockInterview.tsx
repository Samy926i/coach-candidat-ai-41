import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMockSession, simulateAIResponse, mockInterviewQuestions } from '@/services/mockInterviewService';
import { Mic, MicOff, Send, ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: Date;
}

export default function MockInterview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionId) {
      const mockSession = getMockSession(sessionId);
      if (mockSession) {
        setSession(mockSession);
        // Ajouter le message d'accueil
        addAiMessage(mockInterviewQuestions[0]);
        setCurrentQuestionIndex(1);
      } else {
        navigate('/interview');
      }
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (text: string, sender: 'ai' | 'user') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addAiMessage = (text: string) => {
    addMessage(text, 'ai');
  };

  const addUserMessage = (text: string) => {
    addMessage(text, 'user');
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isAiTyping) return;

    const userMessage = currentInput.trim();
    addUserMessage(userMessage);
    setCurrentInput('');
    setIsAiTyping(true);

    try {
      const aiResponse = await simulateAIResponse(userMessage, currentQuestionIndex);
      addAiMessage(aiResponse);
      setCurrentQuestionIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error getting AI response:', error);
      addAiMessage("Je suis désolé, j'ai rencontré un problème. Pouvez-vous répéter ?");
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleRecording = () => {
    // TODO: Implémenter l'enregistrement vocal réel
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simuler la reconnaissance vocale
      setTimeout(() => {
        setCurrentInput("Réponse simulée de la reconnaissance vocale");
        setIsRecording(false);
      }, 3000);
    }
  };

  if (!session) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/interview')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                🤖 Entretien RH avec l'IA
              </CardTitle>
              <p className="text-center text-muted-foreground">
                Session: {session.id}
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Chat Interface */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="h-96 overflow-y-auto space-y-4 mb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p>{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {isAiTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex space-x-2">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                onClick={toggleRecording}
                disabled={isAiTyping}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              
              <Input
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isRecording ? "Enregistrement en cours..." : "Tapez votre réponse..."}
                disabled={isRecording || isAiTyping}
                className="flex-1"
              />
              
              <Button
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isAiTyping}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Panel */}
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Note:</strong> Ceci est une simulation d'entretien en attendant l'intégration complète avec Beyond Presence + LiveKit.</p>
              <p><strong>Prochaine étape:</strong> {currentQuestionIndex < mockInterviewQuestions.length ? `Question ${currentQuestionIndex + 1}/${mockInterviewQuestions.length}` : 'Entretien terminé'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
