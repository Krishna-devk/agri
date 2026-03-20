# AgriSense AI

Krishi Sahayak is a comprehensive digital platform designed to empower farmers with AI-driven insights. It features government scheme matchmaking, crop disease detection, yield prediction, and a RAG (Retrieval-Augmented Generation) based chat assistant.

## 🚀 Project Structure

The project is divided into two main components:

- **`crop_ui/`**: A modern React frontend built with Vite, React Router, and Recharts for a seamless user experience.
- **`rag/`**: A robust FastAPI backend that leverages Gemini AI for RAG-based matching, disease analysis, and yield prediction.

---

## 🛠️ Features

- **Government Scheme Matchmaking**: Matches farmers to relevant government schemes based on their profile, location, and land size.
- **Crop Disease Detection**: Analyze leaf photos to identify diseases and provide detailed treatment plans.
- **Yield Prediction**: Predict crop yields using climate, soil, and fertilizer data, integrated with NDVI scores.
- **AI Chat Assistant**: A dedicated assistant for farming-related queries, MSP information, and agricultural subsidies.
- **Market & Weather**: Real-time market prices and weather updates for better decision-making.

---

## 📦 Getting Started

### Backend (rag)

1. **Navigate to the directory**:
   ```bash
   cd rag
   ```

2. **Set up virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**:
   Create a `.env` file in the `rag` directory and add your API keys:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key
   ```

5. **Run the server**:
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`.

### Frontend (crop_ui)

1. **Navigate to the directory**:
   ```bash
   cd crop_ui
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, React Router, Axios, Recharts, Lucide Icons, Vanilla CSS.
- **Backend**: FastAPI, Google Gemini AI, LangChain (for RAG), ChromaDB/FAISS (for vector storage), Scikit-learn (for yield models).
- **Deployment**: Can be deployed using Docker or traditional VPS services.

---

## 📄 License

This project is licensed under the MIT License.
