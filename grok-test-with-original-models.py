#!/usr/bin/env python3
import requests
import json

# Using the exact API key and model from test-grok-direct.py
API_KEY = "xai-nGUMI6Vvy20WYen6PRdrQ2y8WmjhEcsCVC5jEKZkB4dfRJMw9LFdJfsvER0S9avEDWoG631gZrG0uuN"
API_URL = "https://api.x.ai/v1/chat/completions"

def test_grok_with_original_models():
    """Test with the exact model names from existing files"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Models from existing files
    models_to_try = ["grok-4-0709", "grok-4", "grok-beta", "grok-1"]
    
    for model in models_to_try:
        print(f"\n🤔 Testing {model}...")
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system", 
                    "content": "You are Grok, a helpful AI assistant."
                },
                {"role": "user", "content": "What is 2+2? Just answer the number."}
            ],
            "max_tokens": 50,
            "temperature": 0.7
        }
        
        try:
            response = requests.post(API_URL, headers=headers, json=payload, timeout=10)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                print(f"✅ {model} works! Response: {content}")
                return model
            else:
                error_text = response.text[:200] + "..." if len(response.text) > 200 else response.text
                print(f"❌ {model} failed: {error_text}")
                
        except Exception as e:
            print(f"❌ {model} error: {e}")
    
    return None

def check_api_key_format():
    """Debug API key format"""
    print("API Key Analysis:")
    print(f"Length: {len(API_KEY)}")
    print(f"Starts with: {API_KEY[:10]}")
    print(f"Ends with: {API_KEY[-10:]}")
    print(f"Contains xai-: {'xai-' in API_KEY}")
    
    # Try without xai- prefix
    raw_key = API_KEY.replace("xai-", "")
    print(f"Raw key length: {len(raw_key)}")
    return raw_key

if __name__ == "__main__":
    print("🔍 Testing Grok API Key Format")
    check_api_key_format()
    
    print("\n" + "="*50)
    working_model = test_grok_with_original_models()
    
    if working_model:
        print(f"\n✅ Found working model: {working_model}")
    else:
        print("\n❌ No working models found.")
        print("The API key might be invalid or expired.") 