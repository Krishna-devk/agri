import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPEN_ROUTER_API_KEY = os.getenv("OPEN_ROUTER_API_KEY", "")

client = OpenAI(
    api_key=OPEN_ROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)

model = "nvidia/llama-nemotron-embed-vl-1b-v2:free"
print(f"Testing vision completion with model: {model}")

try:
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": "Hello! Differentiate between Potato and Tomato leaves in one short sentence."
            }
        ],
        max_tokens=50,
        timeout=20
    )
    if hasattr(response, 'choices') and response.choices:
        print("Success!")
        print("Response:", response.choices[0].message.content)
    else:
        print(f"Response returned no choices: {response}")
except Exception as e:
    print(f"Failed with {model} due to exception: {e}")
