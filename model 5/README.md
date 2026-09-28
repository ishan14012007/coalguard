# Hazard Report Auto-Classification System

## Purpose
This system takes a hazard report as text input and predicts its Category and Severity using a trained Machine Learning model. It serves as the backend ML module that will eventually be connected to a frontend UI.

## Dataset Details
The dataset used for this project is `IHMStefanini_industrial_safety_and_health_database_with_accidents_description.csv`. 
- **Total usable samples**: 425
- **Category labels mapped from**: `Industry Sector` (Metals, Mining, Others)
- **Severity labels mapped from**: `Accident Level` (I, II, III, IV, V)

*Note: The originally requested target categories (Safety, Environment, Labour, Production) and severities (Low, Medium, High) were not present in the dataset. Therefore, the native dataset labels were preserved to ensure models were trained on genuine data without fabrication.*

## Preprocessing & Feature Extraction
- Empty descriptions dropped.
- Text lowercased and stripped of excessive whitespace.
- Features extracted using `TF-IDF Vectorizer` (max_features=5000, unigrams and bigrams, english stop words removed).

## Model Architecture
- Two independent `LogisticRegression` models are trained (one for Category, one for Severity).
- `class_weight='balanced'` is utilized to manage the class imbalance (particularly severe in the Accident Levels).

## Training the Model
To reproduce the training pipeline:
```bash
python src/train.py
```
This script will:
1. Load raw data and clean it.
2. Perform an 80/20 train-test split (stratified on Severity).
3. Train the TF-IDF Vectorizer and both ML models.
4. Evaluate models on the unseen test set (accuracy, F1-score, confusion matrices).
5. Save the models (`.pkl`) and reports/metadata.

## Terminal Prediction
To interactively test the model with unseen text:
```bash
python src/predict.py
```
To test the model with a single string from the terminal:
```bash
python src/predict.py --text "Worker reported exposed electrical wiring near the conveyor."
```

## Integrating with Frontend
The `predict_hazard(text, vectorizer, cat_model, sev_model)` function in `src/predict.py` takes a string and the loaded models, returning a dictionary:
```json
{
    "text": "...",
    "category": "Mining",
    "category_confidence": "87.0%",
    "top_category_words": ["wiring", "electrical"],
    "severity": "II",
    "severity_confidence": "45.1%"
}
```
This function can be easily imported and wrapped in an API endpoint (e.g., FastAPI/Flask) for the frontend to consume.

## Limitations
- **Class Imbalance**: Severity Level V only has 8 samples in the entire dataset. Evaluating it reliably is difficult due to the low sample count.
- **Label Alignment**: The dataset's labels are focused on mining/metals safety events, which did not perfectly align with the requested generic taxonomy.
