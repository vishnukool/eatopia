// App.js – fully updated with enhanced system prompt, automatic date stamp, and richer nutrition template

import { useState, useEffect, useRef, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import './App.css';

// —————————————————————————————————————————————
// Helper: stamp every note with the day it was taken
// —————————————————————————————————————————————
const TODAY = new Date().toLocaleDateString('en-US'); // e.g. 4/30/2025

// —————————————————————————————————————————————
// Canonical nutrition‑consult template (markdown)
// Insert TODAY as default Admit Date; placeholders stay if not in transcript
// —————————————————————————————————————————————
const MEDICAL_NOTES_TEMPLATE = `
**Admit Date**: ${TODAY}

**Reason for consult:** <Extract Reason>

**Patient Summary:** Patient is a \`<Extract Age>\`‑year‑old \`<Extract Gender>\` with past medical history of \`<Extract PMH list>\`

**Patient Goals:** <Extract Goals>

**Past Medical History:**
| Diagnosis | Date | Notes |
|-----|-----|-----|
| <Dx1> | <Dx1 Date> | <Dx1 Notes> |

**Past Surgical History:**
| Procedure | Laterality | Date |
|-----|-----|-----|
| <Proc1> | <Lat> | <Date> |

**Pertinent Social Hx:**
| Item | Detail |
|-----|-----|
| Occupation | <Occupation> |
| Smoking | <Smoking> |
| Drinking | <Drinking> |
| Who cooks at home | <Cook> |
| Eating out | <Eating Out> |
| Grocery budget | <Budget> |
| Daily lifestyle | <Lifestyle> |
| Sleep pattern | <Sleep> |
| Meals per day | <Meals> |

**Pertinent Medications:**
| Medication | Dose & Frequency | Indication |
|-----|-----|-----|
| <Med1 Name> | <Med1 Dose> | <Med1 Indication> |

**Pertinent Labs (if any):**
| Condition | Test(s) | Last Value (date) |
|-----|-----|-----|
| Anemia | <Anemia Tests> | <Anemia Value> |

**Gastrointestinal Symptoms:**
| Symptom | Detail |
|-----|-----|
| Bowel movement | <BM Frequency> |

**Enteral or parenteral access:**
| Access type | Detail |
|-----|-----|
| <Access Type> | <Access Detail> |

**Lifestyle & Behavior Patterns:**
| Domain | Detail |
|-----|-----|
| Physical activity | <Activity> |
| Work/stress schedule | <Work> |
| Sleep quality | <Sleep Quality> |
| Hydration habits | <Hydration> |

**Psychosocial & Readiness:**
| Factor | Detail |
|-----|-----|
| Motivation & goals | <Motivation> |

**Culinary Skills & Kitchen Environment:**
| Skill / Resource | Detail |
|-----|-----|
| Cooking skills | <Cooking Skills> |

**Food Access & Preferences:**
| Item | Detail |
|-----|-----|
| Grocery shopping habits | <Grocery Habits> |

**Nutrition History:** <Nutrition History>

**Food allergies:** <Food Allergies>

**Current diet (24‑hr recall):**
| Meal | Time | Food Items | Occasion | Who prepared | Eaten with |
|-----|-----|-----|-----|-----|-----|
| 1st meal | <Time1> | <Items1> | <Occasion1> | <Who1> | <With1> |

**NFPE:**
| Finding | Detail |
|-----|-----|
| Edema | <Edema> |

**Anthropometrics:**
Height: <Height>  
Admit Weight: <Weight>  
Ideal Body Weight: <IBW>  
BMI: <BMI>

**Estimated Nutrient Needs:**  
Energy: <kcal/day> kcal/day  
Protein: <protein range> g/day  
Fluid: <fluid range> mL/day  

---

**Nutrition Assessment and Diagnosis**  
<Assessment Narrative>

**Malnutrition Status:** <Malnutrition Status>

**Nutrition Intervention:**  
1. <Intervention1>

**Nutrition Monitoring/Evaluation:**  
1. <Monitoring Step1>

---END OF TEMPLATE---
`;

// Initialize the GoogleGenAI client
const genAI = new GoogleGenAI({ apiKey: process.env.REACT_APP_GEMINI_API_KEY });
console.log('Gemini API initialized');

function App() {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const lastSummarizedLengthRef = useRef(0);

  // Debugging helper
  useEffect(() => {
    if (transcript) {
      console.log('Transcript length:', transcript.length);
    }
  }, [transcript]);

  // —————————————————————————————————————————————
  // Calls Gemini when transcript grows by ≥50 characters
  // —————————————————————————————————————————————
  const updateMeetingSummary = useCallback(
    async (text) => {
      if (!text?.trim() || isLoadingSummary) return;
      setIsLoadingSummary(true);
      try {
        const result = await genAI.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text:
                    'Process the following nutrition consultation transcript and extract relevant medical information:\n\n' +
                    text,
                },
              ],
            },
          ],
          systemInstruction: {
            role: 'system',
            parts: [
              {
                text: `You are a clinical documentation specialist for nutrition consultations.\n\nReturn **only** a filled‑out copy of the markdown template between the 🚩 flags—no additional commentary.\n\nExtraction rules\n1. Pull facts verbatim from the transcript; **never invent data**.\n2. If a field is missing, leave its placeholder unchanged.\n3. Preserve markdown tables, headings, and spacing exactly.\n4. Keep sections in **exact** order.\n5. The **Admit Date** is pre‑filled with today's date (${TODAY}); overwrite it **only** if the transcript explicitly provides another admit date.\n\n🚩\n${MEDICAL_NOTES_TEMPLATE}\n🚩`,
              },
            ],
          },
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        });

        const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          setMeetingSummary(content);
        } else {
          setMeetingSummary('No text content found in the API response.');
        }
      } catch (error) {
        console.error('Error generating medical notes:', error);
        setMeetingSummary('Error generating medical notes. Check console.');
      } finally {
        setIsLoadingSummary(false);
      }
    },
    [isLoadingSummary]
  );

  // Trigger summary update
  useEffect(() => {
    if (transcript && transcript.length >= lastSummarizedLengthRef.current + 50) {
      updateMeetingSummary(transcript);
      lastSummarizedLengthRef.current = transcript.length;
    }
  }, [transcript, updateMeetingSummary]);

  // —————————————————————————————————————————————
  // UI states for unsupported browser / no mic
  // —————————————————————————————————————————————
  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Eatopia</h1>
          <p className="error-message">
            Your browser doesn't support speech recognition. Please try Chrome or Edge.
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
            Microphone access is required. Please allow microphone access and reload the page.
          </p>
        </header>
      </div>
    );
  }

  // —————————————————————————————————————————————
  // Recording controls
  // —————————————————————————————————————————————
  const startListening = () => {
    setMeetingSummary('');
    SpeechRecognition.startListening({ continuous: true, language: 'en-US' }).catch((error) => {
      console.error('Error starting speech recognition:', error);
      setShowErrorMessage(true);
    });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  const handleReset = () => {
    resetTranscript();
    setMeetingSummary('');
  };

  // —————————————————————————————————————————————
  // Render
  // —————————————————————————————————————————————
  return (
    <div className="App">
      <header className="App-header">
        <h1 style={{ marginTop: 0 }}>Eatopia</h1>
        <div className="controls">
          <button
            onClick={listening ? stopListening : startListening}
            className={`record-button ${listening ? 'recording' : ''}`}
          >
            {listening ? 'Stop Recording' : 'Start Recording'}
          </button>
          {transcript && (
            <button onClick={handleReset} className="reset-button">
              Clear Notes
            </button>
          )}
        </div>
        <div className="content-container">
          <div className="transcript-container">
            <h2>
              Call Transcript {listening && <span className="live-indicator">• LIVE</span>}
            </h2>
            <div className="transcript">
              {transcript || 'Your nutrition consultation transcript will appear here.'}
            </div>
          </div>
          <div className="summary-container">
            <h2>
              Medical Notes {isLoadingSummary && <span className="loading-indicator">Updating…</span>}
            </h2>
            <div className="summary">
              {meetingSummary ? (
                <ReactMarkdown>{meetingSummary}</ReactMarkdown>
              ) : (
                'Medical notes will appear here as the consultation progresses…'
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
