from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
from datetime import datetime
from disease_predictor import predictor, SYMPTOM_LIST

app = Flask(__name__)
CORS(app)

# Configuration
CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", 70.0))
API_KEY = os.getenv("API_KEY", "default-api-key-change-in-production")

@app.route("/health", methods=["GET"])
def health_check():
    """Basic health check endpoint"""
    model_status = predictor.get_model_status()
    return jsonify({
        "service": "healthy",
        "model_loaded": model_status["model_loaded"],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })

@app.route("/api/v1/model/status", methods=["GET"])
def model_status():
    """Get model status information"""
    return jsonify(predictor.get_model_status())

@app.route("/api/v1/predict", methods=["POST"])
def predict_disease():
    """Predict disease based on symptoms"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400
        
        symptoms = data.get("symptoms")
        meta = data.get("meta", {})
        force_rule = data.get("force_rule", False)
        
        # Validate symptoms
        if not symptoms:
            return jsonify({"error": "symptoms field is required"}), 400
        
        if not isinstance(symptoms, dict):
            return jsonify({"error": "symptoms must be an object"}), 400
        
        # Validate symptom keys and values
        for key, value in symptoms.items():
            if key not in SYMPTOM_LIST:
                return jsonify({"error": f"Unknown symptom: {key}. Valid symptoms: {SYMPTOM_LIST}"}), 400
            
            if value not in [0, 1]:
                return jsonify({"error": f"Symptom values must be 0 or 1, got {value} for {key}"}), 400
        
        # Make prediction
        result = predictor.predict(symptoms, force_rule)
        
        # Log the prediction (in production, this would go to a database or file)
        log_entry = {
            "id": str(uuid.uuid4()),
            "timestamp": result["timestamp"],
            "model_version": result["model_version"],
            "source": result["source"],
            "input_symptoms": {k: v for k, v in symptoms.items() if v == 1},  # Only log positive symptoms
            "predicted_disease": result["predicted_disease"],
            "confidence": result["confidence"],
            "advise_doctor": result["advise_doctor"],
            "explanation": result["explanation"]
        }
        
        # In a real implementation, we would save this to a database or file
        print(f"Prediction log: {log_entry}")
        
        return jsonify(result)
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        # Log the error for debugging (in production, use proper logging)
        print(f"Prediction error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/v1/train", methods=["POST"])
def train_model():
    """Train the Decision Tree model (admin only)"""
    # Check API key
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    token = auth_header.split(" ")[1]
    if token != API_KEY:
        return jsonify({"error": "Invalid API key"}), 403
    
    try:
        # In a real implementation, we would:
        # 1. Load training data (from request or file)
        # 2. Validate the dataset schema
        # 3. Train the DecisionTreeClassifier
        # 4. Evaluate metrics
        # 5. Persist the model artifact
        # 6. Update the in-memory model
        
        # For now, we'll return a mock response
        return jsonify({
            "status": "Training not implemented in this mock version",
            "model_version": "1.0.0",
            "metrics": {
                "accuracy": 0.85,
                "precision": 0.83,
                "recall": 0.82,
                "f1": 0.82
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        return jsonify({"error": f"Training failed: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)