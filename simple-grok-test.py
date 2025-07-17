#!/usr/bin/env python3
import os
import sys
from openai import OpenAI

# Set API key directly - trying without xai- prefix
api_key = "nGUMI6Vvy20WYen6PRdrQ2y8WmjhEcsCVC5jEKZkB4dfRJMw9LFdJfsvER0S9avEDWoG631gZrG0uuN"

client = OpenAI(
    api_key=api_key,
    base_url="https://api.x.ai/v1"
)

def test_grok():
    try:
        response = client.chat.completions.create(
            model="grok-beta",
            messages=[{"role": "user", "content": "What is 2+2? Just answer the number."}],
            max_tokens=50
        )
        print("Grok Response:", response.choices[0].message.content)
        return True
    except Exception as e:
        print(f"Grok Error: {e}")
        return False

if __name__ == "__main__":
    test_grok() 