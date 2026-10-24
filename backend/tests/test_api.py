import sys
import os
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from seed_data import seed_database

@pytest.fixture(scope="module")
def client():
    seed_database()
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "UP"
    assert data["database"]["status"] == "HEALTHY"
    assert "components" in data

def test_dashboard_metrics(client):
    res = client.get("/api/dashboard")
    assert res.status_code == 200
    data = res.get_json()
    assert "kpis" in data
    assert data["kpis"]["total_applications"] >= 3
    assert "status_distribution" in data
    assert "recent_activity" in data

def test_list_applications(client):
    res = client.get("/api/applications")
    assert res.status_code == 200
    data = res.get_json()
    assert "items" in data
    assert len(data["items"]) >= 3
    first_app = data["items"][0]
    assert "application_number" in first_app
    assert "institution_name" in first_app

def test_application_detail(client):
    res = client.get("/api/applications/1")
    assert res.status_code == 200
    data = res.get_json()
    assert data["id"] == 1
    assert "documents" in data
    assert len(data["documents"]) >= 1
    assert "findings" in data

def test_rules_list(client):
    res = client.get("/api/rules")
    assert res.status_code == 200
    rules = res.get_json()
    assert len(rules) >= 5
    rule_ids = [r["rule_id"] for r in rules]
    assert "AICTE-REQ-DOC-01" in rule_ids
    assert "AICTE-FIRE-NOC-03" in rule_ids

def test_synthetic_reference_records(client):
    res = client.get("/api/reference-records")
    assert res.status_code == 200
    data = res.get_json()
    assert "items" in data
    assert len(data["items"]) >= 3
    assert "disclaimer" in data

def test_generate_report(client):
    res = client.post("/api/applications/1/reports", json={"generated_by": "Test Reviewer"})
    assert res.status_code == 201
    report = res.get_json()
    assert "report_identifier" in report
    assert report["application_id"] == 1
