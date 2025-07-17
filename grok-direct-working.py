#!/usr/bin/env python3
import requests
import json

# API Configuration (direct HTTP approach per Gemini's advice)
API_KEY = "xai-nGUMI6Vvy20WYen6PRdrQ2y8WmjhEcsCVC5jEKZkB4dfRJMw9LFdJfsvER0S9avEDWoG631gZrG0uuN"
API_URL = "https://api.x.ai/v1/chat/completions"

def test_grok_direct():
    """Test Grok API with direct HTTP request"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Test different models
    models_to_try = ["grok-beta", "grok-1", "grok-1.5-lora"]
    
    for model in models_to_try:
        print(f"\n🤔 Testing {model} with direct HTTP...")
        
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "What is 2+2? Just answer the number."}],
            "max_tokens": 50,
            "temperature": 0.7
        }
        
        try:
            response = requests.post(API_URL, headers=headers, json=payload, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                print(f"✅ {model} works! Response: {content}")
                return model
            else:
                print(f"❌ {model} failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ {model} error: {e}")
    
    return None

def chat_with_grok_direct(model):
    """Interactive chat using direct HTTP requests"""
    print(f"\n🚀 Starting chat with {model} (Direct HTTP)")
    print("Type 'exit' to quit\n")
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    conversation = []
    
    while True:
        try:
            user_input = input("You: ").strip()
            if user_input.lower() == 'exit':
                break
            
            # Add user message to conversation
            conversation.append({"role": "user", "content": user_input})
            
            payload = {
                "model": model,
                "messages": conversation,
                "max_tokens": 500,
                "temperature": 0.7
            }
            
            response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                grok_response = result['choices'][0]['message']['content']
                print(f"Grok: {grok_response}\n")
                
                # Add Grok's response to conversation
                conversation.append({"role": "assistant", "content": grok_response})
            else:
                print(f"❌ API Error: {response.status_code} - {response.text}")
                
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    print("🤔 Testing Grok API (Direct HTTP Method)")
    print("Key length:", len(API_KEY))
    
    working_model = test_grok_direct()
    
    if working_model:
        chat_with_grok_direct(working_model)
    else:
        print("\n❌ No working models found. Check API key and connection.")
        print("API Key preview:", API_KEY[:15] + "..." + API_KEY[-10:]) 