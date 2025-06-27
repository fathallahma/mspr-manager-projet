import sys
import types
from datetime import datetime
import json
from unittest import mock

import pytest

# ---------------------------------------------------------------------------
# Provide stub versions of external libraries if they are absent 
# ---------------------------------------------------------------------------
if "psycopg2" not in sys.modules:
    psyco_stub = types.ModuleType("psycopg2")
    psyco_stub.Error = Exception  # used for broad exception catch in handler
    psyco_stub.connect = lambda *_, **__: None  # dummy connect
    sys.modules["psycopg2"] = psyco_stub

if "qrcode" not in sys.modules:
    qr_stub = types.ModuleType("qrcode")

    def _make(_):
        class _Img:
            def save(self, buf, format="PNG"):
                buf.write(b"")  # write minimal bytes

        return _Img()

    qr_stub.make = _make
    sys.modules["qrcode"] = qr_stub

# ---------------------------------------------------------------------------
# Import the module under test *after* stubbing
# ---------------------------------------------------------------------------
import handler  # noqa: E402 – imported after stubs are in place

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _event(payload: dict):
    """Build a fake API‑Gateway‑like event object."""
    return type("Evt", (), {"body": json.dumps(payload)})


@pytest.fixture
def db():
    """Return (conn, cur) pair of MagicMocks wired together."""
    conn = mock.MagicMock(name="connection")
    cur = mock.MagicMock(name="cursor")
    conn.cursor.return_value = cur
    return conn, cur


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

def test_generate_password_default_length_and_charset():
    pwd = handler.generate_password()
    assert len(pwd) == 24
    assert set(pwd) <= set(ALPHABET)


def test_hash_password_is_sha512():
    raw = "S3cr3t!"
    expected = __import__("hashlib").sha512(raw.encode()).hexdigest()
    assert handler.hash_password(raw) == expected


def test_handle_missing_username():
    response = handler.handle(_event({}), None)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert body["success"] is False
    assert body["error"] == "Username is required"


@mock.patch.object(handler, "qrcode")
@mock.patch.object(handler, "datetime")
@mock.patch.object(handler, "get_db_connection")
def test_handle_happy_path(mock_get_conn, mock_datetime, mock_qrcode, db):
    conn, cur = db
    mock_get_conn.return_value = conn

    # First SELECT – user not found, second fetchone – new id
    cur.fetchone.side_effect = [None, (123,)]

    fixed_now = datetime(2025, 1, 1, 12, 0, 0)
    mock_datetime.now.return_value = fixed_now

    # Stub qrcode result
    img = mock.MagicMock()
    mock_qrcode.make.return_value = img

    username = "alice"
    response = handler.handle(_event({"username": username}), None)
    assert response["statusCode"] == 200

    body = json.loads(response["body"])
    assert body["success"] is True
    assert body["user_id"] == 123
    assert body["username"] == username
    assert datetime.fromisoformat(body["gendate"]) == fixed_now

    pwd = body["password"]
    assert len(pwd) == 24 and set(pwd) <= set(ALPHABET)

    cur.execute.assert_any_call("SELECT 1 FROM users WHERE username=%s", (username,))
    assert conn.commit.called


@mock.patch.object(handler, "get_db_connection")
def test_handle_user_already_exists(mock_get_conn, db):
    conn, cur = db
    mock_get_conn.return_value = conn
    cur.fetchone.return_value = (1,)  # user already present

    response = handler.handle(_event({"username": "bob"}), None)
    assert response["statusCode"] == 409
    body = json.loads(response["body"])
    assert body["success"] is False

