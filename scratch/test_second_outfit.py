import httpx
import time

c = httpx.Client(base_url="http://127.0.0.1:8000", timeout=60.0)

# Use the existing customer session from previous try-on: 4966cb29d4d24e1fb8746c0f3219d209
session_id = "4966cb29d4d24e1fb8746c0f3219d209"
print(f"Triggering second try-on using existing customer session: {session_id}")

# Garment 1: Traditional Crimson Banarasi Silk Saree
res = c.post("/api/tryon/jobs", data={"session_id": session_id, "garment_id": 1, "user_consent": "true"})
job_data = res.json()
job_id = job_data["job_id"]
print(f"Second Try-on job submitted: {job_id}")

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
