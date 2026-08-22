from app.services.document_processor import process_all_documents


documents = process_all_documents()

print("\n==============================")
print("INSUREMATE DOCUMENT PROCESSOR")
print("==============================")

print(f"\nTotal chunks: {len(documents)}")

for chunk in documents[:5]:

    print("\n------------------------------")
    print("Document:", chunk["document"])
    print("Page:", chunk["page"])
    print("Chunk ID:", chunk["chunk_id"])
    print("Text:")
    print(chunk["text"][:500])