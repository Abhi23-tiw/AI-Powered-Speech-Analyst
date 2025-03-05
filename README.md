# 📢 AI-Powered Speech Analysis

Welcome to **AI-Powered Speech Analysis**! This application harnesses cutting-edge speech recognition technology to transcribe and analyze audio input, providing insightful feedback on key speech parameters such as engagement, clarity, and closing techniques. Built with **React** and integrated with **Firebase** for authentication, this tool is perfect for users looking to refine their speech performance.

---

## ✨ Features
- 🎙 **Real-time Speech Recognition** – Record audio directly in your browser with instant transcription.
- 📂 **Audio File Upload** – Upload audio files (MP3, WAV) for transcription and analysis.
- 📊 **Detailed Speech Analysis** – Evaluate performance based on:
  - Engagement
  - Clarity
  - Product Knowledge
  - Listening Skills
  - Handling Objections
  - Closing Techniques
- 🔐 **Google Authentication** – Secure login via Firebase.
- 💾 **Persistent User Data** – Usernames stored in `localStorage` for session continuity.

---

## 🔧 Prerequisites
Ensure you have the following installed before getting started:
- **Node.js** (v16 or higher) – Required for running the React application.
- **npm** – For managing dependencies.
- **Firebase Account** – Needed for authentication (Google provider enabled).
- **Modern Browser** – Chrome is recommended (supports Web Speech API).

---

## 🚀 Installation
1. **Clone the Repository**
   ```sh
   https://github.com/Abhi23-tiw/AI-Powered-Speech-Analyst.git
   cd ai-speech-analysis
   ```
2. **Install Dependencies**
   ```sh
   npm install
   ```
3. **Run the Application**
   ```sh
   npm start
   ```

---

## 🛠 Usage
- **Login**: Click "Login with Google" to authenticate using your Google account.
- **Record Audio**: Click "Start Recording" (microphone permission required).
- **Upload Audio**: Upload an audio file (MP3, WAV) for analysis.
- **Analyze**: Click "Analyze" to process the transcript and view results.
- **Logout**: Click "Logout" to end your session.

---

## 🎵 Audio Specifications
### Current Implementation (Web Speech API)
- **Channels**: Processes mono audio (single channel).
- **Sample Rate**: Handled automatically by the browser (typically 44.1kHz or device default).
- **Formats**: Supports browser-compatible formats (e.g., MP3, WAV).

### Google Cloud Speech-to-Text API (Future Integration)
#### File Selection Options
- **Inline Audio Content**
  - **Formats**: LINEAR16, MULAW, FLAC, AMR, AMR_WB, OGG_OPUS, SPEEX_WITH_HEADER_BYTE.
  - **Requirements**: Base64-encoded, max 10 MB.
- **Google Cloud Storage URI**
  - **Formats**: Same as above, plus WAV (LINEAR16 or MULAW).
  - **URI Format**: `gs://bucket-name/file-name`.
- **Streaming Audio**
  - **Formats**: Typically LINEAR16 or MULAW.
  - **Method**: gRPC streaming.

#### File Length Requirements
- **Synchronous**: Up to 1 minute (inline content <10 MB).
- **Asynchronous**: Up to 480 minutes (8 hours) via Google Cloud Storage URI.
- **Streaming**: Up to 5 minutes per stream (extendable).
- **Channels**: Mono default; multi-channel supported (billed per channel).
- **Sample Rate**: Recommended 16kHz; supports 8kHz, 22.05kHz, 44.1kHz, etc.

#### Conversion Note
MP3 files must be converted to WAV (LINEAR16 or MULAW) for Google Cloud compatibility. Use tools like FFmpeg:
```sh
ffmpeg -i input.mp3 -acodec pcm_s16le -ar 16000 output.wav
```

---

## 🤝 Contributing
Contributions are welcome! Follow these steps:
1. **Fork** the repository.
2. **Create a new branch**:
   ```sh
   git checkout -b feature/your-feature
   ```
3. **Commit your changes**:
   ```sh
   git commit -m "Add your feature"
   ```
4. **Push to your branch**:
   ```sh
   git push origin feature/your-feature
   ```
5. **Open a Pull Request** 🚀

---

## 💡 Acknowledgments
- Inspired by open-source speech analysis tools.
- Uses Firebase for secure authentication.
- Potential future integration with **Google Cloud Speech-to-Text API**.

---

🚀 Happy Coding & Speech Analyzing! 🎤

