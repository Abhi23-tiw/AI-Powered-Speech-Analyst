const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const speech = require('@google-cloud/speech');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// Ensure GOOGLE_APPLICATION_CREDENTIALS is set properly
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS is not set in .env file');
  process.exit(1);
}
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, credentialsPath);

app.use(express.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const upload = multer({
  dest: './uploads', // Ensure this directory exists
  limits: { fileSize: 7 * 1024 * 1024 }, // 7MB file limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/wav' || file.originalname.toLowerCase().endsWith('.wav')) {
      cb(null, true);
    } else {
      cb(new Error('Only WAV files are supported'), false);
    }
  },
});

async function transcribeAudio(audioFilePath) {
  const speechClient = new speech.SpeechClient();
  const file = fs.readFileSync(audioFilePath);
  const audioBytes = file.toString('base64');

  let config = {
    encoding: 'LINEAR16',
    languageCode: 'en-US',
    audioChannelCount: 1,
  };

  try {
    const [response] = await speechClient.recognize({ audio: { content: audioBytes }, config });
    const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');
    console.log('Transcription succeeded');
    return transcription || 'No speech detected in the audio file.';
  } catch (error) {
    console.error('Audio transcription failed:', error.message);
    throw new Error('Audio transcription failed. Please ensure the WAV file is valid.');
  } finally {
    // Safely delete the uploaded file
    fs.unlink(audioFilePath, (err) => {
      if (err) console.error(`Failed to delete ${audioFilePath}:`, err);
    });
  }
}

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.post('/receive-text', async (req, res) => {
  try {
    const { text, parameters } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });
    if (!parameters || !Array.isArray(parameters)) return res.status(400).json({ error: 'Parameters must be an array' });

    const prompt = `
      You are an AI designed to analyze text based on specific parameters. Analyze the following text for each of these parameters: ${parameters.join(', ')}.
      Provide a rating (High, Medium, Low) and a brief feedback explanation (1-2 sentences).
      Ensure your response includes an analysis for ALL parameters.
      Return the response in JSON format with the structure:
      {
        "analysis": {
          "<parameter>": { "rating": "<rating>", "feedback": "<feedback>" },
          ...
        }
      }
      Here is the text to analyze:
      "${text}"
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    console.log('Raw Gemini response:', responseText);

    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = responseText.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      console.error('No valid JSON found in response:', responseText);
      return res.status(500).json({ error: 'Invalid JSON response from Gemini' });
    }

    let analysisResult;
    try {
      analysisResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      return res.status(500).json({ error: 'Failed to parse response from Gemini' });
    }

    const analysis = {};
    parameters.forEach((param) => {
      const key = param.toLowerCase().replace(/\s/g, '');
      if (analysisResult.analysis && analysisResult.analysis[key]) {
        analysis[key] = {
          rating: analysisResult.analysis[key].rating || 'N/A',
          feedback: analysisResult.analysis[key].feedback || 'No feedback provided',
        };
      } else {
        analysis[key] = { rating: 'N/A', feedback: 'Parameter not analyzed.' };
      }
    });

    console.log('Processed response:', analysis);
    res.json({ message: 'Text analyzed successfully', analysis });

  } catch (error) {
    console.error('Error processing text:', error);
    res.status(500).json({ error: 'Failed to process text with Gemini' });
  }
});

app.post('/transcribe-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const audioFilePath = req.file.path;
    const transcription = await transcribeAudio(audioFilePath);

    res.json({ message: 'Audio transcribed successfully', transcription });

  } catch (error) {
    res.status(500).json({ error: 'Failed to transcribe audio', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
