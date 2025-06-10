import cohere
from flask import Flask, request, jsonify
from flask_cors import CORS

# Cohere API key (trial)
COHERE_API_KEY = "MxABl5slwJzoiiHOGbO4fAVUw0Kte455V1T7jOYs"
co = cohere.Client(COHERE_API_KEY)

# Flask setup
app = Flask(__name__)
CORS(app, resources={r"/chat": {"origins": "*"}})

# Chatbot Memory
chatbot_memory = {
    "name": "ChaturBot",
    "purpose": "Hi ! I am a chatbot that helps with hackathon-related queries."
}

# Function to handle chatbot responses
import re

def chat_with_assistant(prompt):
    user_input = prompt.lower().strip()
    # Regex patterns for name questions
    name_patterns = [
        r"\bwhat\s+is\s+your\s+name\b",
        r"\byour\s+name\b",
        r"\bwho\s+are\s+you\b",
        r"\bname\s+is\s+chaturbot\b",
        r"\bintroduce\s+yourself\b"
    ]
    if any(re.search(pattern, user_input) for pattern in name_patterns):
        print("DEBUG: Name check triggered, responding with ChaturBot.")
        # Use strong preamble for name-related questions
        response = co.chat(
            model='command-r-plus',
            message=prompt,
            preamble=(
                "You are ChaturBot, not Coral. "
                "Your name is ChaturBot. "
                "Never say your name is Coral or anything else. "
                "Always introduce yourself as ChaturBot, a hackathon assistant chatbot. "
                "If anyone asks your name, always say 'My name is ChaturBot.'"
            )
        )
        return response.text.strip() if response.text else "😎 Hi! My name is ChaturBot."
    if "what do you do" in user_input or "your purpose" in user_input:
        return chatbot_memory["purpose"]
    # All other queries go to Cohere with a neutral preamble
    try:
        response = co.chat(
            model='command-r-plus',
            message=prompt,
            preamble="You are ChaturBot, a helpful hackathon assistant chatbot."
        )
        return response.text.strip() if response.text else "⚠️ No response from AI."
    except Exception as e:
        return f"❌ Error: {str(e)}"

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    user_message = data.get("message", "")
    if not user_message:
        return jsonify({"response": "⚠️ Please enter a message."})
    bot_response = chat_with_assistant(user_message)
    return jsonify({"response": bot_response})

if __name__ == "__main__":
    print("🚀 Chatbot API is running at: http://127.0.0.1:5002")
    app.run(debug=True, host="127.0.0.1", port=5002)
