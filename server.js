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
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS);

app.use(express.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const upload = multer({
  dest: './speechToText/backend/uploads', // Ensure this directory exists
  limits: { fileSize: 7 * 1024 * 1024 }, // 7MB to account for base64 overhead
  fileFilter: (req, file, cb) => {
    // Only accept WAV files
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
  const audio = { content: audioBytes };

  let config = {
    encoding: 'LINEAR16',
    languageCode: 'en-US',
    audioChannelCount: 1,
  };

  try {
    const [response] = await speechClient.recognize({ audio, config });
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    console.log('Transcription succeeded with 1 channel');
    return transcription;
  } catch (error) {
    console.log('Failed with 1 channel:', error.message);

    if (error.code === 3 && error.message.includes('INVALID_ARGUMENT')) {
      config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 44100,
        languageCode: 'en-US',
        audioChannelCount: 2,
        enableSeparateRecognitionPerChannel: true,
      };

      try {
        const [response] = await speechClient.recognize({ audio, config });
        const transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');
        console.log('Transcription succeeded with 2 channels');
        return transcription;
      } catch (secondError) {
        console.error('Failed with 2 channels:', secondError.message);
        throw new Error('Audio transcription failed with both 1 and 2 channels. Please ensure the WAV file is valid.');
      }
    } else {
      throw error;
    }
  } finally {
    if (fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }
  }
}

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.post('/receive-text', async (req, res) => {
  try {
    const { text, parameters } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    if (!parameters || !Array.isArray(parameters)) {
      return res.status(400).json({ error: 'Parameters must be an array' });
    }

    const prompt = `
      You are an AI designed to analyze text based on specific parameters. Analyze the following text for each of these parameters: ${parameters.join(', ')}.
      For EVERY parameter listed, provide a rating (High, Medium, Low) and a brief feedback explanation (1-2 sentences).
      Ensure your response includes an analysis for ALL parameters provided.
      Return the response in JSON format with the structure:
      {
        "analysis": {
          "<parameter>": { "rating": "<rating>", "feedback supp": "<feedback>" },
          ...
        }
      }
      Do not skip any parameters. Here is the text to analyze:
      "${text}"
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    console.log('Raw Gemini response:', responseText);

    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = responseText.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      console.error('No valid JSON found in response:', responseText);
      return res.status(500).json({ error: 'No valid JSON found in Gemini response' });
    }
    const cleanedJson = jsonMatch[0];

    let analysisResult;
    try {
      analysisResult = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error('Failed to parse cleaned Gemini response:', parseError);
      console.error('Cleaned response text:', cleanedJson);
      return res.status(500).json({ error: 'Failed to parse analysis response' });
    }

    console.log('Parsed Gemini analysis:', analysisResult);

    const analysis = {};
    parameters.forEach((param) => {
      const key = param.toLowerCase().replace(' ', '');
      if (analysisResult.analysis && analysisResult.analysis[key]) {
        const rating = analysisResult.analysis[key].rating || 'N/A';
        const feedback = analysisResult.analysis[key]['feedback supp'] || 'Not analyzed.';
        analysis[key] = `${rating} - ${feedback}`;
      } else {
        analysis[key] = 'N/A - Gemini did not provide analysis for this parameter.';
      }
    });

    console.log('Response sent to frontend:', { message: 'Text analyzed successfully', analysis });

    res.json({
      message: 'Text analyzed successfully',
      analysis,
    });
  } catch (error) {
    console.error('Error processing text with Gemini:', error);
    res.status(500).json({ error: 'Failed to process text with Gemini' });
  }
});

app.post('/transcribe-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioFilePath = req.file.path;
    const transcription = await transcribeAudio(audioFilePath);

    res.json({
      message: 'Audio transcribed successfully',
      transcription,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to transcribe audio', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});