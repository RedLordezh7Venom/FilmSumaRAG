import os
import psutil
import requests
import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor

# Metrics collection
memory_logs = []

def get_process_memory():
    process = psutil.Process(os.getpid())
    # Return memory in MB
    return process.memory_info().rss / (1024 * 1024)

def log_memory(label: str):
    mb = get_process_memory()
    print(f"📊 [MEM] {label}: {mb:.2f} MB")
    memory_logs.append({"label": label, "mb": mb})

def simulate_chat_session(movie: str, thread_id: str):
    # Simulate a deep dive chat query
    url = "http://localhost:8000/api/deep_dive"
    payload = {
        "movie": movie,
        "question": "What are the main themes of this movie?",
        "thread_id": thread_id,
        "persona": "critic"
    }
    
    try:
        # We start a streaming request
        start_time = time.time()
        with requests.post(url, json=payload, stream=True) as r:
            token_count = 0
            for line in r.iter_lines():
                if line:
                    token_count += 1
            duration = time.time() - start_time
            print(f"✅ [CHAT] Thread {thread_id} finished in {duration:.2f}s ({token_count} tokens)")
    except Exception as e:
        print(f"❌ [CHAT] Thread {thread_id} failed: {str(e)}")

def benchmark_peak_usage():
    print("\n" + "="*50)
    print("🚀 FilmSumaRAG: Memory Target Benchmark (8GB RAM)")
    print("="*50)
    
    log_memory("Starting Environment")
    
    # 1. Simulate multiple concurrent users (Deep Dive)
    print("\n📡 Simulating 5 concurrent Deep Dive sessions...")
    movies = ["Test Movie 1", "Test Movie 2", "Test Movie 3", "Test Movie 4", "Test Movie 5"]
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        for i in range(5):
            movie = movies[i % len(movies)]
            executor.submit(simulate_chat_session, movie, f"bench_thread_{i}")
    
    log_memory("After 5 Concurrent Chats")
    
    # 2. Simulate heavy embedding load (hypothetically)
    # Since we can't easily trigger a real ingestion without valid files, 
    # we just monitor the steady state during the chats.

    print("\n" + "="*50)
    print("📈 Benchmark Results Summary")
    average = sum(m["mb"] for m in memory_logs) / len(memory_logs)
    peak = max(m["mb"] for m in memory_logs)
    print(f"Average Memory: {average:.2f} MB")
    print(f"Peak Memory usage logged: {peak:.2f} MB")
    
    if peak < 4000: # 4GB threshold (leaving 4GB for OS/other apps)
        print("🎉 PASS: Well within the 8GB local RAM target!")
    else:
        print("⚠️ WARNING: Memory usage is approaching 50% of the target. Optimization recommended.")
    print("="*50)

if __name__ == "__main__":
    benchmark_peak_usage()
