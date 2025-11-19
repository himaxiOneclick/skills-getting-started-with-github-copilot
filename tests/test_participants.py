from fastapi.testclient import TestClient
from urllib.parse import quote
from src.app import app

client = TestClient(app)


def ensure_participant(activity, email):
    resp = client.get("/activities")
    data = resp.json()
    if email not in data[activity]["participants"]:
        client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")


def test_unregister_participant_success():
    activity = "Chess Club"
    email = "michael@mergington.edu"

    # Ensure the participant exists before attempting to delete
    ensure_participant(activity, email)

    # Delete the participant
    resp = client.delete(f"/activities/{quote(activity)}/participants?email={quote(email)}")
    assert resp.status_code == 200
    assert "Unregistered" in resp.json().get("message", "")

    # Verify participant removed
    resp = client.get("/activities")
    data = resp.json()
    assert email not in data[activity]["participants"]


def test_unregister_nonexistent_participant():
    activity = "Chess Club"
    email = "not-in-list@mergington.edu"

    resp = client.delete(f"/activities/{quote(activity)}/participants?email={quote(email)}")
    assert resp.status_code == 404
