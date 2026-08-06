import chromadb

# Create a persistent ChromaDB client
client = chromadb.PersistentClient(path="backend/chroma_db")

# Create or get the collection
collection = client.get_or_create_collection(
    name="course_material"
)


def store_embeddings(chunks, embeddings):
    """
    Store chunks and their embeddings in ChromaDB.
    """

    ids = [str(i) for i in range(len(chunks))]

    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings.tolist()
    )

    print("Embeddings stored successfully!")