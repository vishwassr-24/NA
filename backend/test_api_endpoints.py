"""
NEXUS AQUA - API Endpoint & RBAC Verification Script
"""

import sys
import os

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

def test_api():
    print("=" * 60)
    print("NEXUS AQUA - Full API & RBAC Test Suite")
    print("=" * 60)

    client = TestClient(app)

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[1/5] Health Check: 200 OK")

    # 2. Login as admin
    res = client.post("/auth/login", json={"identifier": "admin001", "password": "Admin@123456"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_data = res.json()
    token = admin_data["access_token"]
    user = admin_data["user"]
    assert user["role"] == "admin"
    print(f"[2/5] Admin Login: Success | User: {user['name']} | Role: {user['role']}")

    # 3. Access protected admin stats endpoint
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/admin/stats", headers=headers)
    assert res.status_code == 200, f"Admin stats failed: {res.text}"
    stats = res.json()
    print(f"[3/5] Admin Stats: Success | Registered Users: {stats['users']['total']}")

    # 4. Operator login & survey creation
    res_op = client.post("/auth/login", json={"identifier": "operator001", "password": "Operator@123"})
    assert res_op.status_code == 200, f"Operator login failed: {res_op.text}"
    op_token = res_op.json()["access_token"]
    op_headers = {"Authorization": f"Bearer {op_token}"}
    print(f"[4/5] Operator Login: Success")

    # 5. Strict RBAC Verification: Operator cannot access Admin stats
    res_forbidden = client.get("/admin/stats", headers=op_headers)
    assert res_forbidden.status_code == 403, f"Expected 403 Forbidden, got {res_forbidden.status_code}"
    print("[5/5] RBAC Security Guard: Operator forbidden (HTTP 403) from Admin stats endpoint")

    # Seed demo surveys & hotspots
    res_seed = client.post("/admin/seed", headers=headers)
    assert res_seed.status_code in (200, 201), f"Seed failed: {res_seed.text}"
    print(f"[+] Admin Seed Data: {res_seed.json().get('message')}")

    print("\n" + "=" * 60)
    print("ALL 5 CORE API & RBAC TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    test_api()
