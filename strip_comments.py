import re
import os

def strip_python_comments(text):
    # Remove lines starting with # or comments after code
    lines = text.splitlines()
    new_lines = []
    for line in lines:
        if line.strip().startswith('#'):
            continue
        # Only stripping trailing comments if they follow a space
        new_lines.append(re.sub(r'\s+#.*', '', line))
    return "\n".join(new_lines)

def strip_js_css_comments(text):
    # Remove multi-line /* ... */
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    # Remove single-line // ... but avoid http:// or https://
    # We use a negative lookbehind for common URL schemes
    text = re.sub(r'(?<!http:)(?<!https:)(?<!\w:)\/\/.*', '', text)
    return text

files_to_clean = [
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\DiseaseResultPage.jsx',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\HomePage.jsx',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\DiseasePage.jsx',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\YieldPage.jsx',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\MarketPage.jsx',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\WeatherPage.jsx',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\TreatmentPage.jsx',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\SchemePage.jsx',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\components\Navbar.jsx',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\components\Navbar.css',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\HomePage.css',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\DiseasePage.css',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\DiseaseResultPage.css',
    r'c:\Users\hp\work\crop_prediction_ui\crop_ui\src\pages\WeatherPage.css',
    r'c:\Users\hp\work\crop_prediction_ui\rag\main.py',
    r'c:\Users\hp\work\crop_prediction_ui\rag\api\routes.py',
    r'c:\Users\hp\work\crop_prediction_ui\rag\yield_predictor.py',
]

for file_path in files_to_clean:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path}")
        continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if file_path.endswith('.py'):
        new_content = strip_python_comments(content)
    else:
        new_content = strip_js_css_comments(content)
    
    # Clean up excessive blank lines
    new_content = re.sub(r'\n\s*\n\s*\n', '\n\n', new_content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Cleaned {file_path}")
