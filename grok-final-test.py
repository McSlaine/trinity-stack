#!/usr/bin/env python3
import requests
import json

# CORRECTED API KEY from user
API_KEY = "xai-nGUMI6vkyy20WYen6PRdrQ2y8WmjhEcsCVC5jEKZkB4dfRJMw9LFdJfsvER0S9avEDWoG631gZrG0uuN"
API_URL = "https://api.x.ai/v1/chat/completions"

def test_corrected_key():
    """Test with the user's corrected API key"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    models_to_try = ["grok-beta", "grok-1", "grok-2"]
    
    for model in models_to_try:
        print(f"\n🤔 Testing {model} with corrected key...")
        
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Hello! Just say 'Grok is working' if you can respond."}],
            "max_tokens": 50,
            "temperature": 0.7
        }
        
        try:
            response = requests.post(API_URL, headers=headers, json=payload, timeout=15)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                print(f"✅ SUCCESS! {model} works! Response: {content}")
                return model
            else:
                print(f"❌ {model} failed: {response.text[:300]}")
                
        except Exception as e:
            print(f"❌ {model} error: {e}")
    
    return None

if __name__ == "__main__":
    print("🔑 Testing with CORRECTED API key")
    print(f"Key preview: {API_KEY[:15]}...{API_KEY[-10:]}")
    
    working_model = test_corrected_key()
    
    if working_model:
        print(f"\n🎉 GROK IS WORKING! Model: {working_model}")
    else:
        print("\n❌ Still having issues - need to research further") 