import os
import time
import requests
from datetime import datetime

TRINITY_LOG_PATH = '/home/cashflow-trends-ai/trinity.log'
from dotenv import load_dotenv
load_dotenv(dotenv_path="/home/cashflow-trends-ai/core/grok/.env")

# Use this to decide which key to use
API_KEY = os.getenv("XAI_API_KEY") or os.getenv("GROK_API_KEY")
print(f"[GROK DEBUG] Loaded key: {API_KEY[-6:]}")


def review_with_grok(task, cmd_id):
    print(f"[GROK DEBUG] API key loaded: {bool(API_KEY)}")
    print(f"[GROK DEBUG] Sending request for {cmd_id}...")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    payload = {
        "model": "grok-4",
        "messages": [{"role": "user", "content": task}],
        "temperature": 0
    }

    try:
        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        try:
            result = response.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "[No content]")
            print(f"[GROK][{cmd_id}] ✅ Response received: {content}")
        except Exception as e:
            print(f"[GROK][{cmd_id}] ❌ Error parsing response: {e}")
            print(f"[GROK RAW RESPONSE] {response.text}")
            return

        if "choices" in result:
            content = result["choices"][0]["message"]["content"]
            print(f"[GROK][{cmd_id}] ✅ Success: {content}")
        else:
            print(f"[GROK][{cmd_id}] ⚠️ Unexpected response: {result}")

    except requests.exceptions.Timeout:
        print(f"[GROK][{cmd_id}] ❌ Grok API timed out (30s)")
    except Exception as e:
        print(f"[GROK][{cmd_id}] ❌ Error: {str(e)}")

def monitor_trinity_log():
    print("🔁 Grok Parser started. Watching for validated commands...")
    seen = set()
    while True:
        try:
            with open(TRINITY_LOG_PATH, "r") as f:
                lines = f.readlines()
                for line in lines:
                    if "TRINITY_CMD" in line and line not in seen:
                        seen.add(line)
                        parts = line.strip().split("CMD-ID: ")
                        if len(parts) > 1:
                            cmd_id = parts[1].split(" | ")[0].strip()
                            task = line.strip()
                            print(f"[Grok Parser] Detected Grok command: {line.strip()}")
                            review_with_grok(task, cmd_id)
        except Exception as e:
            print(f"[Grok Parser] ❌ Log monitoring error: {str(e)}")
        time.sleep(5)

if __name__ == "__main__":
    print("[Grok Parser] Running...")
    monitor_trinity_log()
