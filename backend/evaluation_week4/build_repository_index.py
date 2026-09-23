from app.services.repository_understanding_service import build_index

if __name__ == "__main__":
    data = build_index(force=True)
    meta = data["metadata"]
    print("=" * 72)
    print("INSUREMATE REPOSITORY INDEX BUILT")
    print(f"Source files : {meta['source_file_count']}")
    print(f"Code chunks  : {meta['chunk_count']}")
    print(f"Embeddings   : {meta['embedding_model']}")
    print(f"Index file   : backend/evaluation_week4/repository_understanding_index.json")
    print("=" * 72)
