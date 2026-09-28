import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
import pickle
import os

def preprocess_and_vectorize(train_df, test_df, text_col='Description'):
    vectorizer = TfidfVectorizer(max_features=5000, stop_words='english', ngram_range=(1, 2))
    
    # Fit ONLY on training data to prevent data leakage
    X_train = vectorizer.fit_transform(train_df[text_col])
    X_test = vectorizer.transform(test_df[text_col])
    
    # Save vectorizer
    os.makedirs('models', exist_ok=True)
    with open('models/vectorizer.pkl', 'wb') as f:
        pickle.dump(vectorizer, f)
        
    print("TF-IDF Vectorizer trained and saved to models/vectorizer.pkl")
    return X_train, X_test, vectorizer

def load_vectorizer(model_path='models/vectorizer.pkl'):
    with open(model_path, 'rb') as f:
        vectorizer = pickle.load(f)
    return vectorizer
