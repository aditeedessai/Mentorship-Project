from embeddings.vector_store import collection


def retrieve(query_embedding, top_k=3):
    """
    Retrieve the most relevant document chunks.
    """

    results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=top_k
    )

    return results["documents"][0]