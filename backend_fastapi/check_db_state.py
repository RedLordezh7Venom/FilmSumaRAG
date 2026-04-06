import os
import chromadb

def check_path(path):
    print(f"\n📂 Checking path: {path}")
    if not os.path.exists(path):
        print("❌ Path does not exist!")
        return
    
    try:
        client = chromadb.PersistentClient(path=path)
        collections = client.list_collections()
        for col in collections:
            count = col.count()
            print(f"📦 Collection: {col.name} | Items: {count}")
    except Exception as e:
        print(f"❌ Error checking {path}: {e}")

if __name__ == "__main__":
    check_path(os.path.join(os.getcwd(), "chroma_db"))
    check_path(os.path.join(os.getcwd(), "data", "chroma_db"))
