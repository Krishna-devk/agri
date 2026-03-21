import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from rag.retriever import analyze_crop_image

def test():
    try:
        with open("image.jpg", "rb") as f:
            bytes_data = f.read()

        res = analyze_crop_image(bytes_data)
        print("Analysis Response:", res)
    except Exception as e:
        print(f"Error during testing: {e}")

test()
