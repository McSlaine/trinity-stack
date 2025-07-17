#!/usr/bin/env python3
import os
import sys
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

# Set API key directly (no dotenv needed)
api_key = "xai-nGUMI6Vvy20WYen6PRdrQ2y8WmjhEcsCVC5jEKZkB4dfRJMw9LFdJfsvER0S9avEDWoG631gZrG0uuN"

client = OpenAI(
    api_key=api_key,
    base_url="https://api.x.ai/v1"  # xAI endpoint—compatible with OpenAI SDK
)

conversation_history = []  # Stateful chat memory

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def query_grok(prompt):
    try:
        response = client.chat.completions.create(
            model="grok-beta",  # Using correct model name per Gemini's research
            messages=conversation_history + [{"role": "user", "content": prompt}],
            max_tokens=2048,
            temperature=0.7  # Balanced for code analysis
        )
        return response.choices[0].message.content
    except Exception as e:
        raise RuntimeError(f"API error: {str(e)}")

print("🤔 Grok CLI Custom: Type 'exit' to quit. For code checks, paste snippets.")
while True:
    try:
        user_input = input("You: ").strip()
        if user_input.lower() == 'exit':
            break
        conversation_history.append({"role": "user", "content": user_input})
        try:
            response = query_grok(user_input)
            print("Grok:", response)
            conversation_history.append({"role": "assistant", "content": response})
        except Exception as e:
            print(f"Error: {e}. Retrying...")
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
        break