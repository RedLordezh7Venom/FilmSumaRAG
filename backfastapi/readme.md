# FilmSumaRAG API

This is a FastAPI RAG based application that generates a summary and narrates a  movie by downloading its subtitles, processing them, and using the Gemini AI model to create a coherent narration.

---

## How it works

- **Download Subtitles:** Automatically downloads subtitles for a given movie name with subliminal.
- **Process Subtitles:** Convert subtitles into a text format for processing.
- **Generate Summary:** Uses the Gemini AI model to generate a summary of the movie in chunks.
- **Parallel File Deletion:** Deletes temporary files in parallel with summary generation for faster processing.
- **Safety Settings:** Configurable safety settings for the Gemini API to handle sensitive content in movies.

---

## Prerequisites

Before running the application, ensure you have the following:

1. **Python 3.8+**: Install Python from [python.org](https://www.python.org/).
2. **Git**: Install Git from [git-scm.com](https://git-scm.com/).
3. **GEMINI_API_KEY**: Obtain an API key from [Google Gemini](https://ai.google.dev/).
4. **Postman** (Optional): For testing the API endpoints.

---

## Deployment

   - The public API is available at:
     ```
     https://https://filmsumarag-fastapi.onrender.com//summarize
     ```

## Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/movie-summary-api.git
   cd movie-summary-api
   ```

2. **Create a Virtual Environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set Environment Variables:**
   Create a `.env` file in the root directory and add your Gemini API key:
   ```plaintext
   GEMINI_API_KEY=your_api_key_here
   ```

---

## Running the Application

1. **Start the FastAPI Server:**
   ```bash
   uvicorn main:app --reload
   ```

2. **Access the API:**
   - The API will be available at:
     ```
     http://127.0.0.1:8000
     ```
   - Open your browser and go to:
     ```
     http://127.0.0.1:8000/docs
     ```
     to access the Swagger UI for interactive API documentation.

---


## API Endpoints

### **POST /summarize**
Generates a summary for a given movie.

#### **Request:**
- **URL:** `http://127.0.0.1:8000/summarize`
- **Method:** `POST`
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
      "moviename": "joker"
  }
  ```

#### **Response:**
- **Status:** `200 OK`
- **Body (JSON):**
  ```json
  {
      "summary": "The movie follows Arthur Fleck, a mentally troubled man who descends into madness and becomes the Joker..."
  }
  ```

---

## Testing with Postman

1. Open Postman.
2. Create a new request:
   - **Method:** `POST`
   - **URL:** `http://127.0.0.1:8000/summarize`
   - `https://filmsumarag-fastapi.onrender.com/summarize` for public API
   - **Headers:**
     ```
     Content-Type: application/json
     ```
   - **Body (JSON):**
     ```json
     {
         "moviename": "interstellar"
     }
     ```
3. Click **Send** and check the response.

---

## Project Structure

```
movie-summary-api/
├── main.py                  # FastAPI application
├── requirements.txt         # Dependencies
├── .env                     # Environment variables
├── README.md                # Documentation
├── subliminsubs.py          # Subtitle download logic
├── subtitlepreprocess.py    # Subtitle processing logic
└── start.sh                 # Script to start the app
```

---

## Contributing

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a pull request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) for the web framework.
- [Google Gemini](https://ai.google.dev/) for the AI model.
- [Render](https://render.com/) for deployment hosting.

---

## Contact

For questions or feedback, please contact:
- **Your Name**
- **Email:** your.email@example.com
- **GitHub:** [your-username](https://github.com/your-username)

 