from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

Autor = "Andrei"

@app.route("/")
def home():
    return "Backend DIETA_MVP funcionando."

@app.route("/api/autor")
def autor():
    return jsonify({"Autor": Autor})

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=8080)
