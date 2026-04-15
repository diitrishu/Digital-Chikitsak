"""
Script to train the Decision Tree model for disease prediction
"""

import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
from datetime import datetime
from disease_predictor import SYMPTOM_LIST

def generate_sample_data():
    """Generate sample training data"""
    # In a real scenario, this would load from a CSV file or database
    np.random.seed(42)
    
    # Sample diseases and their typical symptoms
    disease_patterns = {
        "Flu": ["fever", "cough", "sore_throat", "runny_nose"],
        "Food Poisoning": ["nausea", "vomiting", "stomach_pain", "diarrhea"],
        "Dengue": ["fever", "headache", "fatigue", "joint_pain", "muscle_pain"],
        "Skin Allergy": ["rash", "itching", "dry_skin"],
        "Arthritis": ["joint_pain", "back_pain", "swelling"],
        "Asthma": ["cough", "shortness_breath", "fatigue"],
        "Malaria": ["fever", "headache", "fatigue", "vomiting"],
        "Typhoid": ["fever", "headache", "stomach_pain", "fatigue"],
        "COVID-19": ["fever", "cough", "shortness_breath", "fatigue"]
    }
    
    # Generate synthetic data
    data = []
    for disease, symptoms in disease_patterns.items():
        # Generate 100 samples per disease
        for _ in range(100):
            # Start with all symptoms as 0
            row = {symptom: 0 for symptom in SYMPTOM_LIST}
            
            # Set primary symptoms to 1 (with some noise)
            for symptom in symptoms:
                row[symptom] = 1 if np.random.random() > 0.1 else 0  # 90% chance of having the symptom
            
            # Add some random additional symptoms (noise)
            for symptom in SYMPTOM_LIST:
                if symptom not in symptoms and np.random.random() < 0.1:  # 10% chance of random symptom
                    row[symptom] = 1
            
            row["disease"] = disease
            data.append(row)
    
    # Create DataFrame
    df = pd.DataFrame(data)
    return df

def train_decision_tree(df):
    """Train Decision Tree classifier"""
    # Separate features and target
    X = df[SYMPTOM_LIST]
    y = df["disease"]
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    # Train Decision Tree
    clf = DecisionTreeClassifier(
        criterion="entropy",
        max_depth=6,
        min_samples_leaf=5,
        random_state=42
    )
    
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"Model accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
    
    return clf, label_encoder, accuracy

def save_model(model, label_encoder, accuracy):
    """Save trained model to disk"""
    # Create models directory if it doesn't exist
    os.makedirs("models", exist_ok=True)
    
    model_data = {
        "model": model,
        "label_encoder": label_encoder,
        "accuracy": accuracy,
        "feature_list": SYMPTOM_LIST,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }
    
    model_path = "models/disease_model.joblib"
    joblib.dump(model_data, model_path)
    print(f"Model saved to {model_path}")

def main():
    """Main training function"""
    print("Generating sample training data...")
    df = generate_sample_data()
    print(f"Generated {len(df)} samples")
    print(f"Disease distribution:\n{df['disease'].value_counts()}")
    
    print("\nTraining Decision Tree model...")
    model, label_encoder, accuracy = train_decision_tree(df)
    
    print("\nSaving model...")
    save_model(model, label_encoder, accuracy)
    
    print("\nTraining completed successfully!")

if __name__ == "__main__":
    main()