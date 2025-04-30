import { useState, useEffect, useRef, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { GoogleGenAI } from '@google/genai'; // Correct import name
import ReactMarkdown from 'react-markdown';
import './App.css';

// Medical notes template
const MEDICAL_NOTES_TEMPLATE = `

Reason for consult: <Reason for consult goes here>
Patient Summary: <Patient summary goes here>
Patient Goals: <Patient goals go here>

Past Medical History:
<Past medical history goes here>

Past Surgical History:
<Past surgical history goes here>

Current Medications:
<Current medications go here>

Pertinent Medications:
<Pertinent medications go here>

Current Medications:
<Current medications go here>

Nutrition History:
<Nutrition history goes here>

Food allergies:
<Food allergies go here> 

Current Diet:
<Current diet goes here>

Current Medications:
<Current medications go here>

BODY MEASUREMENTS:
<Body measurements go here>



`;

// Initialize the GoogleGenAI client
const genAI = new GoogleGenAI({ apiKey: process.env.REACT_APP_GEMINI_API_KEY });
console.log("Gemini API initialized");

function App() {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();

  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const lastSummarizedLengthRef = useRef(0);
  
  // For debugging
  useEffect(() => {
    console.log("Transcript changed:", transcript ? transcript.length : 0, "characters");
  }, [transcript]);

  const updateMeetingSummary = useCallback(async (text) => {
    console.log("updateMeetingSummary called with", text.length, "characters");
    
    if (!text || text.trim().length === 0) {
      console.log("Text is empty, not updating summary");
      return;
    }
    
    // Don't update if we're already loading a summary
    if (isLoadingSummary) {
      console.log('Summary already loading, skipping update');
      return;
    }
    
    console.log("Actually calling Gemini API now");
    setIsLoadingSummary(true);
    try {
      // Use gemini-1.5-pro or gemini-1.5-flash instead of gemini-pro
      const result = await genAI.models.generateContent({
        model: "gemini-1.5-pro",
        contents: [
          {
            role: "user",
            parts: [{ text: "Process the following nutrition consultation transcript and extract relevant medical information: " + text }]
          }
        ],
        // Set system instructions properly - this is a separate field at the top level
        systemInstruction: {
          role: "system", // Explicit role is important
          parts: [
            { 
              text: `You are a medical notes generator for nutrition consultations. Your task is to extract relevant medical and nutritional information from consultation transcripts and format them according to a specific template.

Follow these guidelines:
1. Extract specific information from the transcript including patient demographics, medical history, diet patterns, and nutritional goals
2. Format the information using the exact template provided below
3. If the transcript doesn't contain information for a particular field, leave it empty or with the placeholder text
4. Do not add information that isn't in the transcript
5. Maintain the exact formatting of the template including headers, tables, and spacing
6. Do not respond to the content directly - only provide the formatted medical notes

ALWAYS OUTPUT ALL SECTIONS IN THIS TEMPLATE. NOTES SHOULD ALWAYS BE IN THIS FORMAT.
IF NO DATA IS PRESENT, LEAVE THE FIELD EMPTY. BUT STILL INCLUDE THE TEMPLATE AS A PLACE HOLDER.

Here is the template to use:

---START OF TEMPLATE---

${MEDICAL_NOTES_TEMPLATE}

---END OF TEMPLATE---

ALWAYS OUTPUT ALL SECTIONS IN THIS TEMPLATE. NOTES SHOULD ALWAYS BE IN THIS FORMAT.
IF NO DATA IS PRESENT, LEAVE THE FIELD EMPTY. BUT STILL INCLUDE THE TEMPLATE AS A PLACE HOLDER.
              `
            }
          ]
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048
        }
      });
      
      console.log("Gemini API responded:", result);
      
      // Extract text from the response
      if (result.candidates && result.candidates.length > 0) {
        // Access the text from the first candidate
        const candidate = result.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const textContent = candidate.content.parts[0].text;
          if (textContent) {
            console.log("Setting medical notes with content from API");
            setMeetingSummary(textContent);
          } else {
            console.error('No text content in response parts');
            setMeetingSummary("No text content found in the API response.");
          }
        } else {
          console.error('No content parts in candidate', candidate);
          setMeetingSummary("Error: Could not find content in API response.");
        }
      } else {
        console.error('Unexpected response structure:', result);
        setMeetingSummary("Error: Could not extract medical notes from API response.");
      }

    } catch (error) {
      console.error('Error generating medical notes with @google/genai:', error);
      // Attempt to parse potential block reason from the error
      let errorMessage = "Error generating medical notes. Check console.";
      if (error.message && error.message.includes('SAFETY')) { 
          errorMessage = "Error: Medical notes generation blocked due to safety settings.";
      }
      setMeetingSummary(errorMessage);
    } finally {
      console.log("Setting isLoadingSummary to false");
      setIsLoadingSummary(false);
    }
  }, [isLoadingSummary]);

  // When the transcript changes, check if we need to update the summary
  useEffect(() => {
    if (transcript && transcript.length >= lastSummarizedLengthRef.current + 50) {
      console.log(`Transcript reached ${transcript.length} characters, generating new summary`);
      updateMeetingSummary(transcript);
      lastSummarizedLengthRef.current = transcript.length;
    }
  }, [transcript, updateMeetingSummary]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Eatopia</h1>
          <p className="error-message">
            Your browser doesn't support speech recognition.
            Please try Chrome or Edge.
          </p>
        </header>
      </div>
    );
  }

  if (!isMicrophoneAvailable && showErrorMessage) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Eatopia</h1>
          <p className="error-message">
            Microphone access is required for recording nutrition consultations.
            Please allow microphone access and reload the page.
          </p>
        </header>
      </div>
    );
  }

  const startListening = () => {
    // Reset summary when starting a new recording
    setMeetingSummary('');
    SpeechRecognition.startListening({ continuous: true, language: 'en-US' })
      .catch(error => {
        console.error('Error starting speech recognition:', error);
        setShowErrorMessage(true);
      });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  const handleReset = () => {
    resetTranscript();
    setMeetingSummary(''); // Also clear the summary
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 style={{marginTop: '0'}}>Eatopia</h1>
        <div className="controls">
          <button
            onClick={listening ? stopListening : startListening}
            className={`record-button ${listening ? 'recording' : ''}`}
          >
            {listening ? 'Stop Recording' : 'Start Recording'}
          </button>
          {transcript && (
            <button
              onClick={handleReset} // Use updated reset handler
              className="reset-button"
            >
              Clear Notes
            </button>
          )}
        </div>
        <div className="content-container">
          <div className="transcript-container">
            <h2>Call Transcript {listening && <span className="live-indicator">• LIVE</span>}</h2>
            <div className="transcript">
              {transcript || "Your nutrition consultation notes will appear here..."}
            </div>
          </div>
          <div className="summary-container">
            <h2>Medical Notes {isLoadingSummary && <span className="loading-indicator">Updating...</span>}</h2>
            <div className="summary">
              {meetingSummary ? (
                <ReactMarkdown>
                  {meetingSummary}
                </ReactMarkdown>
              ) : (
                "Meeting summary will appear here as the consultation progresses..."
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
