#!/usr/bin/env python3
import os
from openai import OpenAI

# API key with proper format (Gemini confirmed this format)
api_key = "xai-nGUMI6Vvy20WYen6PRdrQ2y8WmjhEcsCVC5jEKZkB4dfRJMw9LFdJfsvER0S9avEDWoG631gZrG0uuN"

# Initialize OpenAI client for xAI endpoint (per Gemini's guidance)
client = OpenAI(
    api_key=api_key,
    base_url="https://api.x.ai/v1"  # Gemini confirmed this endpoint
)

def test_grok_models():
    """Test different model names that Gemini mentioned"""
    models_to_try = ["grok-beta", "grok-1", "grok-1.5-lora"]
    
    for model in models_to_try:
        print(f"\n🤔 Testing {model}...")
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "What is 2+2? Just answer the number."}],
                max_tokens=50,
                timeout=10
            )
            print(f"✅ {model} works! Response: {response.choices[0].message.content}")
            return model  # Return first working model
        except Exception as e:
            print(f"❌ {model} failed: {e}")
    
    return None

def chat_with_grok(model):
    """Interactive chat with working Grok model"""
    print(f"\n🚀 Starting chat with {model}")
    print("Type 'exit' to quit\n")
    
    while True:
        try:
            user_input = input("You: ").strip()
            if user_input.lower() == 'exit':
                break
                
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": user_input}],
                max_tokens=500,
                timeout=30
            )
            print(f"Grok: {response.choices[0].message.content}\n")
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    print("🤔 Testing Grok CLI Connection...")
    working_model = test_grok_models()
    
    if working_model:
        chat_with_grok(working_model)
    else:
        print("❌ No working Grok models found. Check API key and connection.") 