import numpy as np
import json
import uuid
from datetime import datetime
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import os

# Canonical symptom list (order matters)
SYMPTOM_LIST = [
    "fever",
    "headache",
    "fatigue",
    "dizziness",
    "cough",
    "shortness_breath",
    "sore_throat",
    "runny_nose",
    "nausea",
    "vomiting",
    "stomach_pain",
    "diarrhea",
    "joint_pain",
    "muscle_pain",
    "back_pain",
    "swelling",
    "rash",
    "itching",
    "dry_skin",
    "wounds"
]

# Disease rules for rule-based engine (fallback)
DISEASE_RULES = {
    "Flu": {"symptoms": ["fever", "cough", "sore_throat", "runny_nose"], "weight": 1.0},
    "Food Poisoning": {"symptoms": ["nausea", "vomiting", "stomach_pain", "diarrhea"], "weight": 1.0},
    "Dengue": {"symptoms": ["fever", "headache", "fatigue", "joint_pain", "muscle_pain"], "weight": 1.0},
    "Skin Allergy": {"symptoms": ["rash", "itching", "dry_skin"], "weight": 1.0},
    "Arthritis": {"symptoms": ["joint_pain", "back_pain", "swelling"], "weight": 1.0},
    "Asthma": {"symptoms": ["cough", "shortness_breath", "fatigue"], "weight": 0.9},
    "Malaria": {"symptoms": ["fever", "headache", "stomach_pain", "fatigue"], "weight": 1.0},
    "Typhoid": {"symptoms": ["fever", "headache", "stomach_pain", "fatigue"], "weight": 1.0},
    "COVID-19": {"symptoms": ["fever", "cough", "shortness_breath", "fatigue"], "weight": 1.0}
}

# Remedies mapping
REMEDIES = {
    "Flu": "Rest, drink warm fluids, steam inhalation, paracetamol as directed; if high fever, severe breathlessness or deterioration, consult a physician immediately.",
    "Food Poisoning": "Stay hydrated, eat bland foods like toast and rice, avoid dairy and spicy foods; if severe dehydration or blood in stool, consult a physician immediately.",
    "Dengue": "Get plenty of rest, drink fluids to prevent dehydration, avoid aspirin and ibuprofen; if severe abdominal pain or bleeding, seek immediate medical attention.",
    "Skin Allergy": "Avoid scratching, apply cool compresses, use mild soap and moisturizer; if swelling or difficulty breathing occurs, seek immediate medical attention.",
    "Arthritis": "Apply hot or cold packs, gentle exercises, maintain healthy weight; if severe pain or joint deformity, consult a physician.",
    "Asthma": "Use prescribed inhaler, avoid triggers, sit upright during attack; if severe breathing difficulty, seek emergency care.",
    "Malaria": "Complete prescribed antimalarial treatment, rest, stay hydrated; if high fever or seizures, seek immediate medical attention.",
    "Typhoid": "Complete antibiotic course, rest, eat easily digestible foods; if severe abdominal pain or persistent fever, consult a physician.",
    "COVID-19": "Isolate, rest, stay hydrated, monitor oxygen levels; if difficulty breathing or persistent chest pain, seek immediate medical care.",
    "Unknown": "Monitor symptoms and consult a healthcare professional for proper diagnosis and treatment."
}

# Default confidence threshold
CONF_THRESHOLD = 60.0  # Lowered from 70 to be less strict

# Model version
MODEL_VERSION = "1.0.0"

class DiseasePredictor:
    def __init__(self):
        self.model = None
        self.label_encoder = None
        self.model_loaded = False
        self.last_trained = None
        self.symptom_idf = self._compute_symptom_idf()
        self.load_model()
    
    def _compute_symptom_idf(self):
        """Compute IDF-like specificity for each symptom"""
        disease_count = len(DISEASE_RULES)
        counts = {s: 0 for s in SYMPTOM_LIST}
        for rule in DISEASE_RULES.values():
            for s in rule["symptoms"]:
                counts[s] += 1
        idf = {}
        for s, df in counts.items():
            idf[s] = float(np.log((disease_count + 1) / (1 + df)) + 1.0)
        return idf
    
    def load_model(self):
        try:
            model_path = os.getenv("MODEL_PATH", "models/disease_model.joblib")
            if os.path.exists(model_path):
                model_data = joblib.load(model_path)
                self.model = model_data["model"]
                self.label_encoder = model_data["label_encoder"]
                # validate feature length
                if hasattr(self.model, "n_features_in_") and self.model.n_features_in_ != len(SYMPTOM_LIST):
                    print("Model features mismatch. Using rule-based engine instead.")
                    self.model = None
                    self.model_loaded = False
                    return
                self.model_loaded = True
                self.last_trained = model_data.get("timestamp", datetime.utcnow().isoformat())
                print(f"Model loaded successfully. Last trained: {self.last_trained}")
            else:
                print("No trained model found. Using rule-based engine as fallback.")
        except Exception as e:
            print(f"Error loading model: {e}. Using rule-based engine as fallback.")
            self.model_loaded = False
    
    def build_feature_vector(self, symptoms_dict):
        invalid_keys = set(symptoms_dict.keys()) - set(SYMPTOM_LIST)
        if invalid_keys:
            raise ValueError(f"Invalid symptom keys: {invalid_keys}")
        feature_vector = []
        for symptom in SYMPTOM_LIST:
            value = symptoms_dict.get(symptom, 0)
            if value not in [0, 1]:
                raise ValueError(f"Symptom values must be 0 or 1, got {value} for {symptom}")
            feature_vector.append(value)
        return np.array(feature_vector).reshape(1, -1)
    
    def rule_predict(self, feature_vector):
        symptoms_dict = {s: int(feature_vector[0][i]) for i, s in enumerate(SYMPTOM_LIST)}
        candidates = []
        single_symptom_specificity_threshold = 2.0
        
        for disease, rule in DISEASE_RULES.items():
            rule_syms = rule["symptoms"]
            total_weight = sum(self.symptom_idf.get(s, 1.0) for s in rule_syms)
            matched_syms = [s for s in rule_syms if symptoms_dict.get(s, 0) == 1]
            matched_weight = sum(self.symptom_idf.get(s, 1.0) for s in matched_syms)
            match_fraction = matched_weight / total_weight if total_weight > 0 else 0
            
            qualifies = False
            if len(matched_syms) >= 2:
                qualifies = True
            elif len(matched_syms) == 1:
                if self.symptom_idf.get(matched_syms[0], 1.0) >= single_symptom_specificity_threshold:
                    qualifies = True
            
            if qualifies:
                score = match_fraction * rule.get("weight", 1.0)
                candidates.append((disease, score, matched_syms, match_fraction, total_weight, matched_weight))
        
        if not candidates:
            return "Unknown", 0.0, ["Insufficient specific symptoms to match known diseases"], "No confident rule match"
        
        best = max(candidates, key=lambda x: (x[1], x[5], len(x[2])))
        disease, score, matched, fraction, total_w, matched_w = best
        
        # Improved confidence calculation
        base_confidence = min(99.0, fraction * 100)
        
        # Bonus for matching more symptoms
        symptom_bonus = min(10, len(matched) * 3)
        
        # Bonus for highly specific symptoms
        specificity_bonus = 0
        for symptom in matched:
            if self.symptom_idf.get(symptom, 1.0) > 2.0:
                specificity_bonus += 5
        
        # Final confidence with bonuses
        confidence = min(99.0, base_confidence + symptom_bonus + specificity_bonus)
        unmatched = [s for s in DISEASE_RULES[disease]["symptoms"] if s not in matched]
        explanation = []
        if matched: explanation.append(f"Matched symptoms: {', '.join(matched)}")
        if unmatched: explanation.append(f"Missing symptoms: {', '.join(unmatched)}")
        explanation.append(f"Specificity score: {round(matched_w,3)}/{round(total_w,3)}")
        return disease, confidence, explanation, f"Rule-based prediction for {disease}"
    
    def model_predict(self, feature_vector):
        if not self.model_loaded or self.model is None:
            return None, None, None, "Model not loaded"
        try:
            probabilities = self.model.predict_proba(feature_vector)[0]
            predicted_class_idx = int(np.argmax(probabilities))
            confidence = round(probabilities[predicted_class_idx] * 100, 2)
            predicted_disease = "Unknown"
            try:
                predicted_disease = self.label_encoder.inverse_transform([predicted_class_idx])[0]
            except Exception:
                if hasattr(self.model, "classes_"):
                    predicted_disease = self.model.classes_[predicted_class_idx]
            return predicted_disease, confidence, [], f"ML model prediction (v{MODEL_VERSION})"
        except Exception as e:
            return None, None, None, f"Model prediction error: {str(e)}"
    
    def predict(self, symptoms_dict, force_rule=False):
        feature_vector = self.build_feature_vector(symptoms_dict)
        
        # Always compute rule result
        rule_disease, rule_conf, rule_expl, rule_info = self.rule_predict(feature_vector)
        
        final_disease, final_conf, final_expl, source = rule_disease, rule_conf, rule_expl, "rule"
        
        if self.model_loaded and not force_rule:
            model_disease, model_conf, model_expl, _ = self.model_predict(feature_vector)
            if model_disease and model_conf and model_conf > rule_conf + 10:  # only trust ML if clearly better
                final_disease, final_conf, final_expl, source = model_disease, model_conf, model_expl, "ml_model"
        
        # Determine if doctor consultation is needed based on confidence and specific conditions
        advise_doctor = final_conf < CONF_THRESHOLD
        
        # Additional rules for doctor consultation
        if final_disease == "Unknown":
            advise_doctor = True
        elif final_conf > 80 and final_disease in ["Flu", "Food Poisoning", "Skin Allergy"]:
            # High confidence for common, manageable conditions - no need for immediate doctor visit
            advise_doctor = False
        elif final_disease in ["Dengue", "Malaria", "Typhoid", "COVID-19"] and final_conf > 70:
            # Serious conditions with good confidence - recommend doctor
            advise_doctor = True
        remedy = REMEDIES.get(final_disease, REMEDIES["Unknown"])
        
        return {
            "predicted_disease": final_disease,
            "confidence": final_conf,
            "remedy": remedy,
            "advise_doctor": advise_doctor,
            "explanation": final_expl[:3] if final_expl else [],
            "source": source,
            "model_version": MODEL_VERSION if source == "ml_model" else "none",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    def get_model_status(self):
        return {
            "model_loaded": self.model_loaded,
            "model_version": MODEL_VERSION if self.model_loaded else "none",
            "last_trained": self.last_trained,
            "health": "healthy" if self.model_loaded else "unhealthy"
        }

# Initialize predictor
predictor = DiseasePredictor()
