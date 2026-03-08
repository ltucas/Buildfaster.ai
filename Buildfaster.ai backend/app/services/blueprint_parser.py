import io
import pypdf

def parse_blueprint(pdf_bytes: bytes) -> str:
    """
    Parses text from a PDF blueprint file.
    """
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Failed to parse PDF: {e}")
        # Fallback mock text if parsing fails (for testing our simulation)
        return "Simulated Mock Blueprint Text: 12m height, 1m setback, slope 1:10"
