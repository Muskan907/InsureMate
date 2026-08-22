from pathlib import Path
from pypdf import PdfReader
import re


DOCUMENTS_DIR = Path(__file__).resolve().parents[3] / "documents"


def extract_text_from_pdf(pdf_path: Path):
    reader = PdfReader(str(pdf_path))

    pages = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""

        pages.append({
            "page": page_number,
            "text": text
        })

    return pages


def clean_text(text):
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def chunk_text(text, chunk_size=600, overlap=100):
    """
    Create reasonably sized sentence-aware chunks.

    Unlike the old implementation, this avoids cutting a sentence
    in the middle whenever possible.
    """

    text = clean_text(text)

    if not text:
        return []

    sentences = re.split(r"(?<=[.!?])\s+", text)

    chunks = []
    current = ""

    for sentence in sentences:
        sentence = sentence.strip()

        if not sentence:
            continue

        if len(current) + len(sentence) + 1 <= chunk_size:
            current = (
                f"{current} {sentence}".strip()
                if current
                else sentence
            )
        else:
            if current:
                chunks.append(current)

            # Keep a small amount of context from the previous chunk.
            if overlap > 0 and current:
                words = current.split()
                overlap_words = []

                char_count = 0

                for word in reversed(words):
                    if char_count + len(word) + 1 > overlap:
                        break

                    overlap_words.insert(0, word)
                    char_count += len(word) + 1

                current = (
                    " ".join(overlap_words) + " " + sentence
                ).strip()
            else:
                current = sentence

    if current:
        chunks.append(current)

    return chunks


def process_pdf(pdf_path: Path):

    pages = extract_text_from_pdf(pdf_path)

    all_chunks = []

    chunk_id = 0

    for page in pages:

        page_chunks = chunk_text(page["text"])

        for chunk in page_chunks:

            all_chunks.append({
                "chunk_id": chunk_id,
                "document": pdf_path.name,
                "page": page["page"],
                "text": chunk
            })

            chunk_id += 1

    return all_chunks


def process_all_documents():

    documents = []

    for pdf in DOCUMENTS_DIR.glob("*.pdf"):

        chunks = process_pdf(pdf)

        documents.extend(chunks)

    return documents
