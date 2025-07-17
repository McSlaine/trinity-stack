#!/usr/bin/env python3
import requests
import json

# WORKING API KEY and MODEL
API_KEY = "xai-nGUMI6vkyy20WYen6PRdrQ2y8WmjhEcsCVC5jEKZkB4dfRJMw9LFdJfsvER0S9avEDWoG631gZrG0uuN"
API_URL = "https://api.x.ai/v1/chat/completions"
MODEL = "grok-2"  # This model works!

def chat_with_grok():
    """Working Grok CLI chat interface"""
    print("🤔 Grok-2 CLI - Type 'exit' to quit")
    print("="*50)
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    conversation = []
    
    while True:
        try:
            user_input = input("\nYou: ").strip()
            if user_input.lower() == 'exit':
                print("👋 Goodbye!")
                break
            
            if not user_input:
                continue
            
            # Add user message to conversation
            conversation.append({"role": "user", "content": user_input})
            
            payload = {
                "model": MODEL,
                "messages": conversation,
                "max_tokens": 1000,
                "temperature": 0.7
            }
            
            print("🤔 Thinking...")
            response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                grok_response = result['choices'][0]['message']['content']
                print(f"Grok: {grok_response}")
                
                # Add Grok's response to conversation
                conversation.append({"role": "assistant", "content": grok_response})
            else:
                print(f"❌ API Error: {response.status_code} - {response.text}")
                
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except EOFError:
            print("\n👋 No more input. Goodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    print("🚀 Starting Working Grok-2 CLI")
    chat_with_grok() 