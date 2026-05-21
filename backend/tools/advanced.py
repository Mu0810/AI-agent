import os
import json
from datetime import datetime

AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama")

def analyze_image(image_path: str, prompt: str = "Describe this image in detail.") -> str:
    """Analyze an image. Uses Ollama locally, and Groq Vision in cloud."""
    try:
        if not os.path.exists(image_path):
            return f"Error: File not found: {image_path}"

        if AI_PROVIDER == "groq":
            from groq import Groq
            import base64
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                return "Error: GROQ_API_KEY environment variable is not set."
            client = Groq(api_key=api_key)
            
            # Determine image MIME type based on extension
            ext = os.path.splitext(image_path)[1].lower().replace(".", "")
            if ext not in ["png", "jpg", "jpeg", "webp", "gif"]:
                ext = "jpeg"
            if ext == "jpg":
                ext = "jpeg"
            mime_type = f"image/{ext}"
            
            with open(image_path, "rb") as f:
                image_bytes = f.read()
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            response = client.chat.completions.create(
                model="llama-3.2-11b-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1024
            )
            return response.choices[0].message.content

        import ollama
        import base64
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        response = ollama.chat(
            model="llava",
            messages=[{"role": "user", "content": prompt, "images": [base64.b64encode(image_bytes).decode()]}]
        )
        return response["message"]["content"]
    except Exception as e:
        return f"Image analysis failed: {str(e)}"

def read_pdf(file_path: str) -> str:
    try:
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() or ""
                return text[:5000]
        except ImportError:
            import PyPDF2
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""
                return text[:5000]
    except Exception as e:
        return f"PDF read failed: {str(e)}"

def query_document(text: str, question: str) -> str:
    """Query a document. Uses Groq in cloud, Ollama locally."""
    try:
        if AI_PROVIDER == "groq":
            from groq import Groq
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))
            response = client.chat.completions.create(
                model=os.getenv("AI_MODEL", "llama-3.3-70b-versatile"),
                messages=[{
                    "role": "system",
                    "content": f"Answer questions based on this document:\n\n{text[:3000]}"
                }, {"role": "user", "content": question}],
                temperature=0.3,
            )
            return response.choices[0].message.content
        else:
            import ollama
            response = ollama.chat(
                model="qwen2.5:7b",
                messages=[{
                    "role": "system",
                    "content": f"Answer questions based on this document:\n\n{text[:3000]}"
                }, {"role": "user", "content": question}],
                options={"temperature": 0.3},
            )
            return response["message"]["content"]
    except Exception as e:
        return f"Query failed: {str(e)}"
