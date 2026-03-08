import os
import google.generativeai as genai

# Optionally configure your API key from environment variable
api_key = os.environ.get("GEMINI_API_KEY", "DUMMY_KEY")
genai.configure(api_key=api_key)

# We use gemini-2.5-flash as the default fast reasoning model
model = genai.GenerativeModel('gemini-2.5-flash')

def ask_gemini(prompt: str) -> str:
    """
    Generic wrapper to ask Gemini questions.
    """
    try:
        # Fails gracefully if no valid API key is available
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        # Return fallback for simulation if API fails
        return f"Simulated AI Response due to API Error: {e}"
