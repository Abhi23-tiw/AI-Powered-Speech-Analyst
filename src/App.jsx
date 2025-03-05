import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcxRxzmlSHGXJpArI6BofYLHX9e4sDW0U",
  authDomain: "speechanalyst.firebaseapp.com",
  projectId: "speechanalyst",
  storageBucket: "speechanalyst.firebasestorage.app",
  messagingSenderId: "333784505089",
  appId: "1:333784505089:web:190f8d540f4e76a83f9900",
  measurementId: "G-FHKKCF9SWJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const App = () => {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('userName') || null;
  });
  const textAreaRef = useRef(null);
  const recognitionRef = useRef(null);

  const parameters = [
    'Engagement',
    'Clarity',
    'Product Knowledge',
    'Listening Skills',
    'Handling Objections',
    'Closing Techniques',
  ];

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setIsLoggedIn(!!currentUser);
      if (currentUser) {
        const name = currentUser.displayName;
        setUserName(name);
        localStorage.setItem('userName', name);
      } else {
        setUserName(null);
        localStorage.removeItem('userName');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcriptText = event.results[0][0].transcript;
        setTranscript(transcriptText);
        textAreaRef.current.value = transcriptText;
      };

      recognitionRef.current.onend = () => setIsRecording(false);

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        alert('Speech recognition error: ' + event.error);
      };
    } else {
      setSpeechSupported(false);
    }
  }, []);

  const startSpeechRecognition = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsRecording(false);
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setAudioFile(file);
      setLoading(true);

      // Send audio file to backend for transcription
      const formData = new FormData();
      formData.append('audio', file);

      try {
        const response = await axios.post('https://ai-powered-speech-analyst.onrender.com/transcribe-audio', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const { transcription } = response.data;
        setTranscript(transcription);
        textAreaRef.current.value = transcription;
      } catch (error) {
        console.error('Error uploading audio:', error);
        alert('Failed to transcribe audio: ' + (error.response?.data?.error || error.message));
        // Fallback to mock transcript if transcription fails
        const mockTranscript = "Hi, I'm excited to introduce our new app! It helps you stay organized with features like reminders and calendars. I understand you might be concerned about the price, but we offer a free trial to ensure it meets your needs. What do you think—would you like to try it out today?";
        setTranscript(mockTranscript);
        textAreaRef.current.value = mockTranscript;
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const name = result.user.displayName;
      setUserName(name);
      localStorage.setItem('userName', name);
      setIsLoggedIn(true);
      setShowLoginPopup(false);
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to login: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserName(null);
      localStorage.removeItem('userName');
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout: ' + error.message);
    }
  };

  const analyzeText = async () => {
    if (!isLoggedIn) {
      setShowLoginPopup(true);
      return;
    }

    const text = textAreaRef.current.value;
    if (!text) {
      alert('Please enter or upload a transcript first.');
      return;
    }
    try {
      setLoading(true);
      const apiParameters = parameters.map((param) => param.toLowerCase().replace(' ', ''));
      const response = await axios.post('https://ai-powered-speech-analyst.onrender.com/receive-text', {
        text,
        parameters: apiParameters,
      });

      console.log('Raw backend response:', response.data);
      const backendAnalysis = response.data.analysis;
      const formattedResult = {};

      parameters.forEach((param) => {
        const key = param.toLowerCase().replace(' ', '');
        const resultString = backendAnalysis[key] || 'N/A - Not analyzed.';
        const [rating, ...feedbackParts] = resultString.split(' - ');
        formattedResult[param] = {
          rating: rating || 'N/A',
          feedback: feedbackParts.join(' - ') || 'Not analyzed.',
        };
      });

      console.log('Formatted result:', formattedResult);
      setAnalysisResult(formattedResult);
    } catch (error) {
      console.error('Error:', error);
      setAnalysisResult(null);
      alert('Failed to analyze text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 via-blue-900 to-black p-6 font-poppins">
      {/* Login/Logout Section */}
      <div className="flex justify-end mb-4 items-center">
        {isLoggedIn && userName && (
          <span className="text-white mr-4">Welcome, {userName}</span>
        )}
        <button
          onClick={isLoggedIn ? handleLogout : handleGoogleLogin}
          className="bg-gradient-to-r from-purple-500 to-purple-700 text-white py-2 px-6 rounded-full hover:from-purple-600 hover:to-purple-800 transition font-medium shadow-lg"
        >
          {isLoggedIn ? 'Logout' : 'Login with Google'}
        </button>
      </div>

      <h1 className="text-5xl text-white mb-8 tracking-wide transition-opacity duration-300 ease-in-out text-center">
        AI-Powered Speech Analysis
      </h1>

      <div className="w-full max-w-5xl mx-auto bg-gray-800 bg-opacity-80 backdrop-blur-md shadow-2xl rounded-2xl p-8 flex flex-col md:flex-row gap-8">
        {/* Left Section */}
        <div className="md:w-1/3 flex flex-col space-y-6">
          <textarea
            ref={textAreaRef}
            className="w-full h-40 p-4 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            placeholder="Transcribed text will appear here..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={loading}
          />
          {audioFile && <p className="text-sm text-gray-300">Uploaded: {audioFile.name}</p>}
          <div className="flex space-x-4">
            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" id="fileUpload" disabled={loading} />
            <label
              htmlFor="fileUpload"
              className={`bg-gradient-to-r from-blue-500 to-blue-700 text-white text-center py-3 px-6 rounded-full cursor-pointer hover:from-blue-600 hover:to-blue-800 transition flex-1 font-medium shadow-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : 'Upload Audio'}
            </label>
            {speechSupported && (
              <button
                onClick={startSpeechRecognition}
                className={`py-3 px-6 rounded-full transition flex-1 font-medium text-white shadow-lg ${isRecording
                  ? 'bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800'
                  : 'bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={loading}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            )}
          </div>
          <button
            onClick={analyzeText}
            className={`bg-gradient-to-r from-green-500 to-green-700 text-white py-3 px-6 rounded-full hover:from-green-600 hover:to-green-800 transition font-medium shadow-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Right Section */}
        <div className="md:w-2/3 grid grid-cols-2 md:grid-cols-3 gap-6">
          {parameters.map((param) => (
            <div
              key={param}
              className="p-4 bg-gray-700 bg-opacity-90 border border-gray-600 rounded-xl shadow-md"
            >
              <h3 className="font-medium text-white">{param}</h3>
              {analysisResult && analysisResult[param] ? (
                <div>
                  <p className="text-blue-300 font-medium">{analysisResult[param].rating}</p>
                  <p className="text-gray-300 text-sm">{analysisResult[param].feedback}</p>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Awaiting...</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Login Popup */}
      {showLoginPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-white text-xl mb-4">Login Required</h2>
            <p className="text-gray-300 mb-6">Please login with Google to use the analysis feature.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowLoginPopup(false)}
                className="bg-gray-600 text-white py-2 px-4 rounded-full hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGoogleLogin}
                className="bg-gradient-to-r from-purple-500 to-purple-700 text-white py-2 px-4 rounded-full hover:from-purple-600 hover:to-purple-800 transition"
              >
                Login with Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
export { analytics };