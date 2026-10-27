import httpx
import time

c = httpx.Client(base_url="http://127.0.0.1:8000", timeout=60.0)

# 1. Initialize demo portrait
res = c.post("/api/tryon/session-photo", data={"use_demo": "true", "user_consent": "true"})
data = res.json()
session_id = data["session_id"]
print(f"Customer session initialized: {session_id}")

# 2. Trigger automatic try-on for garment 7 (Floral Chiffon Midi Dress)
res2 = c.post("/api/tryon/jobs", data={"session_id": session_id, "garment_id": 7, "user_consent": "true"})
job_data = res2.json()
job_id = job_data["job_id"]
print(f"Try-on job submitted: {job_id}")

# 3. Poll job status
for attempt in range(40):
    time.sleep(3)
    status_res = c.get(f"/api/tryon/jobs/{job_id}")
    status = status_res.json()
    st = status.get("status")
    prog = status.get("progress")
    err = status.get("error_message")
    result_url = status.get("result_url")
    print(f"[{attempt+1}] Status: {st} ({prog}%) | Result: {result_url} | Error: {err}")
    if st in ["completed", "failed"]:
        break
