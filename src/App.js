import { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { GoogleGenAI } from '@google/genai'; // Correct import name
import './App.css';

// Medical notes template
const MEDICAL_NOTES_TEMPLATE = `Reason for consult: <Extract Reason (e.g., weight loss; low FODMAP diet; reduce bloating; improve energy; manage emotional eating)>
Patient Summary: Patient is a \`<Extract Age (e.g., 39)>\`-year-old \`<Extract Gender (e.g., female)>\` with past medical history of \`<Extract PMH list (e.g., anemia, hypertension, type 2 diabetes, bipolar disorder, obesity)>\`
Patient Goals: <Extract Goals (e.g., lose 10 lb; reduce post-meal bloating; maintain energy through afternoon; curb emotional snacking)>
Past Medical History:

Diagnosis
Date
Notes
<Extract Dx1 (e.g., Anemia)>
<Extract Dx1 Date (e.g., 07/28/2016)>
<Extract Dx1 Notes (e.g., treated with oral folate)>
<Extract Dx2 (e.g., Bipolar disorder)>
<Extract Dx2 Date (e.g., 03/15/2018)>
<Extract Dx2 Notes (e.g., stable on lithium)>
<Extract Dx3 (e.g., Hypertension)>
<Extract Dx3 Date (e.g., 11/05/2019)>
<Extract Dx3 Notes (e.g., stage 1, diet-controlled)>
<Extract Dx4 (e.g., Obesity)>
<Extract Dx4 Date (e.g., 02/01/2022)>
<Extract Dx4 Notes (e.g., BMI 30.1; IBW 83%)>

Past Surgical History:

Procedure
Laterality
Date
<Extract Procedure1 (e.g., cholecystectomy)>
<Extract Lat1 (e.g., N/A)>
<Extract Proc1 Date (e.g., 09/12/2015)>

Pertinent Social Hx:
Item
Detail
Occupation
<Extract Occupation (e.g., elementary teacher)>
Smoking
<Extract Smoking (e.g., former, quit 2018; 5 py)>
Drinking
<Extract Drinking (e.g., 1–2 wine/week)>
Who cooks at home
<Extract Cook (e.g., patient alone)>
Eating out
<Extract Eating Out (e.g., 2–3×/month)>
Grocery budget
<Extract Budget (e.g., $120/week)>
Daily lifestyle
<Extract Lifestyle (e.g., sedentary job; dog walk 30 min/day)>
Sleep pattern
<Extract Sleep (e.g., 7 hrs/night; 10 pm–5 am)>
Meals per day
<Extract Meals (e.g., 3 meals + 2 snacks)>

Pertinent Medications:
Medication
Dose & Frequency
Indication
<Extract Med1 Name (e.g., Metformin)>
<Extract Med1 Dose (e.g., 1000 mg BID)>
<Extract Med1 Indication (e.g., T2D)>
<Extract Supplement1 Name (e.g., Centrum Silver Multivitamin)>
<Extract Supplement1 Dose (e.g., 1 tablet daily)>
<Extract Supplement1 Indication (e.g., General Support)>

Pertinent Labs (if any):
Condition
Test(s)
Last Value (date)
Anemia
<Extract Anemia Tests (e.g., CBC, ferritin)>
<Extract Anemia Value (e.g., Hgb 11.2 g/dL 4/15)>
Hypertension
<Extract HTN Tests (e.g., A1C, lipid panel)>
<Extract HTN Value (e.g., A1C 7.1%; LDL 130 mg/dL)>
Diabetes
<Extract DM Tests (e.g., A1C)>
<Extract DM Value (e.g., A1C 7.1%)>
Bipolar disorder
<Extract Bipolar Tests (e.g., Ca, Vit D)>
<Extract Bipolar Value (e.g., Ca 9.4; Vit D 28)>
Obesity
<Extract Obesity Tests (e.g., TSH)>
<Extract Obesity Value (e.g., TSH 2.1)>

Gastrointestinal Symptoms:
Symptom
Detail
Bowel movement
<Extract BM Frequency (e.g., every other day)>
Nausea
<Extract Nausea (e.g., none, Yes)>
Vomiting
<Extract Vomiting (e.g., none)>
Diarrhea
<Extract Diarrhea (e.g., occasional 1×/mo)>
Constipation
<Extract Constipation (e.g., mild; every 2 days)>

Enteral or parenteral access:
Access type
Detail
<Extract Access Type (e.g., none; PEG tube)>
<Extract Access Detail>

Lifestyle & Behavior Patterns:
Domain
Detail
Physical activity
<Extract Activity (e.g., dog walk 30 min/day; yoga 2×/week; House cleaning)>
Work/stress schedule
<Extract Work (e.g., teaching 8–3; grading evenings)>
Sleep quality
<Extract Sleep Quality (e.g., wakes once/night; no daytime sleepiness)>
Hydration habits
<Extract Hydration (e.g., 2 L water/day; 2 coffee)>

Psychosocial & Readiness:
Factor
Detail
Motivation & goals
<Extract Motivation (e.g., lose 10 lb; reduce bloating; confidence 6/10)>
Eating behaviors
<Extract Eating Behaviors (e.g., emotional snacking evenings)>
Social support
<Extract Social Support (e.g., spouse; friend accountability)>
Financial constraints
<Extract Financial (e.g., OK specialty foods within budget)>

Culinary Skills & Kitchen Environment:
Skill / Resource
Detail
Cooking skills
<Extract Cooking Skills (e.g., intermediate; batch cook)>
Kitchen inventory
<Extract Inventory (e.g., stovetop, air fryer, freezer)>
Meal-prep capacity
<Extract Meal-prep (e.g., 2 hrs Sunday batch)>

Food Access & Preferences:
Item
Detail
Grocery shopping habits
<Extract Grocery Habits (e.g., WF weekly; market bi-weekly)>
Cultural practices
<Extract Cultural (e.g., Daniel Fast until May 9)>
Taste/texture notes
<Extract Taste (e.g., prefers savory; avoids spicy)>
Favorite meals
<Extract Favorites (e.g., rice bowls; stir-fries)>

Nutrition History: <Extract Nutrition History (e.g., attempted vegetarian diet 5 yrs; no sustained weight loss)>
Food allergies: <Extract Allergies (e.g., lactose intolerance)>
Current diet: 24-hr diet recall
Meal
Time
Food Items
Occasion
Who prepared
Eaten with
1st meal upon wake up
<Extract Time1 (e.g., 6:30 am)>
<Extract Items1 (e.g., Oatmeal with banana slices; black coffee)>
Breakfast
Patient
Alone
Morning snack
<Extract Time2>
<Extract Items2 (e.g., Carrot sticks + hummus)>
Snack
Patient
Alone
2nd meal
<Extract Time3>
<Extract Items3 (e.g., Brown rice bowl with tofu, spinach, mushrooms)>
Lunch
Patient
Colleague
Afternoon snack
<Extract Time4>
<Extract Items4 (e.g., Plain yogurt (dairy-free) + blueberries)>
Snack
Patient
Alone
3rd meal
<Extract Time5>
<Extract Items5 (e.g., Grilled chicken breast, sweet potato, broccoli)>
Dinner
Patient
Spouse
Evening snack
<Extract Time6>
<Extract Items6 (e.g., Handful of almonds)>
Snack
Patient
Alone
Supplements
<Extract TimeSupp>
<Extract ItemsSupp (e.g., Multivitamin, folic acid)>
—
Patient
Alone
Drinks
<Extract DrinkTiming>
<Extract DrinkItems (e.g., Water (2 L), green tea (1 cup))>
—
—
—`;

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
  const previousTranscriptRef = useRef('');
  const lastSummarizedLengthRef = useRef(0);
  
  // For debugging
  useEffect(() => {
    console.log("Transcript changed:", transcript ? transcript.length : 0, "characters");
  }, [transcript]);

  // When the transcript changes, check if we need to update the summary
  useEffect(() => {
    if (transcript && transcript.length >= lastSummarizedLengthRef.current + 50) {
      console.log(`Transcript reached ${transcript.length} characters, generating new summary`);
      updateMeetingSummary(transcript);
      lastSummarizedLengthRef.current = transcript.length;
    }
  }, [transcript]);

  // When the listening state changes
  useEffect(() => {
    console.log("Listening state changed:", listening);
    // Update once when we stop listening (for the final summary)
    if (!listening && transcript && transcript.trim().length > 0) {
      console.log('Listening stopped, generating final summary for', transcript.length, "characters");
      updateMeetingSummary(transcript);
    }
  }, [listening, transcript]);

  const updateMeetingSummary = async (text) => {
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
  };

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
    // Trigger final summary update when stopping
    if (transcript && transcript.trim().length > 0) {
      updateMeetingSummary(transcript);
    }
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
              {meetingSummary || "Meeting summary will appear here as the consultation progresses..."}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
