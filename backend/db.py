import json
import os
from datetime import datetime
from pathlib import Path

# ===== Database Configuration =====
# Heroku sets DATABASE_URL for Postgres. If present, use Postgres. Otherwise SQLite.
DATABASE_URL = os.getenv("DATABASE_URL", "")
USE_POSTGRES = DATABASE_URL.startswith("postgres")

if USE_POSTGRES:
    # Heroku uses postgres:// but psycopg2 needs postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    import psycopg2
    import psycopg2.extras
else:
    import sqlite3
    DB_PATH = Path(os.getenv("DATABASE_PATH", str(Path(__file__).parent / "nexus.db")))


def _get_conn():
    """Get a database connection for the configured backend."""
    if USE_POSTGRES:
        return psycopg2.connect(DATABASE_URL)
    else:
        return sqlite3.connect(str(DB_PATH))


def _ph(index=None):
    """Return the correct placeholder for the DB backend. Postgres uses %s, SQLite uses ?"""
    return "%s" if USE_POSTGRES else "?"


P = "%s" if USE_POSTGRES else "?"


class NexusDB:
    def __init__(self):
        if not USE_POSTGRES:
            DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            if USE_POSTGRES:
                cur.execute("""CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY, name TEXT, preferences TEXT DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
                cur.execute("""CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY, user_id TEXT, title TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id))""")
                cur.execute("""CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY, conversation_id TEXT,
                    role TEXT, content TEXT, tool_used TEXT, tokens_used INTEGER DEFAULT 0,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id))""")
                cur.execute("""CREATE TABLE IF NOT EXISTS knowledge (
                    id SERIAL PRIMARY KEY, user_id TEXT,
                    key TEXT, value TEXT, category TEXT DEFAULT 'general',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id))""")
                cur.execute("""CREATE TABLE IF NOT EXISTS preferences (
                    user_id TEXT, key TEXT, value TEXT,
                    PRIMARY KEY (user_id, key),
                    FOREIGN KEY (user_id) REFERENCES users(id))""")
                cur.execute("""CREATE TABLE IF NOT EXISTS analytics (
                    id SERIAL PRIMARY KEY, user_id TEXT,
                    event_type TEXT, data TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
                cur.execute("""CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY, user_id TEXT, title TEXT,
                    description TEXT, status TEXT DEFAULT 'pending',
                    scheduled_for TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id))""")
            else:
                cur.execute("""CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY, name TEXT, preferences TEXT DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
                cur.execute("""CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY, user_id TEXT, title TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id))""")
                cur.execute("""CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT,
                    role TEXT, content TEXT, tool_used TEXT, tokens_used INTEGER DEFAULT 0,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id))""")
                cur.execute("""CREATE TABLE IF NOT EXISTS knowledge (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT,
                    key TEXT, value TEXT, category TEXT DEFAULT 'general',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id))""")
                cur.execute("""CREATE TABLE IF NOT EXISTS preferences (
                    user_id TEXT, key TEXT, value TEXT,
                    PRIMARY KEY (user_id, key),
                    FOREIGN KEY (user_id) REFERENCES users(id))""")
                cur.execute("""CREATE TABLE IF NOT EXISTS analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT,
                    event_type TEXT, data TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
                cur.execute("""CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY, user_id TEXT, title TEXT,
                    description TEXT, status TEXT DEFAULT 'pending',
                    scheduled_for TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id))""")
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def create_user(self, user_id, name="User"):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            if USE_POSTGRES:
                cur.execute("INSERT INTO users (id, name) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING", (user_id, name))
            else:
                cur.execute("INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)", (user_id, name))
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def create_conversation(self, conv_id, user_id, title="New Chat"):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            if USE_POSTGRES:
                cur.execute("INSERT INTO conversations (id, user_id, title) VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING", (conv_id, user_id, title))
            else:
                cur.execute("INSERT OR IGNORE INTO conversations (id, user_id, title) VALUES (?, ?, ?)", (conv_id, user_id, title))
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def add_message(self, conv_id, role, content, tool_used=None, tokens=0):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                f"INSERT INTO messages (conversation_id, role, content, tool_used, tokens_used) VALUES ({P}, {P}, {P}, {P}, {P})",
                (conv_id, role, content, tool_used, tokens)
            )
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def get_history(self, conv_id, limit=20):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                f"SELECT role, content, tool_used, tokens_used, timestamp FROM messages WHERE conversation_id = {P} ORDER BY timestamp DESC LIMIT {P}",
                (conv_id, limit)
            )
            rows = cur.fetchall()
            return [{"role": r, "content": c, "tool_used": t, "tokens": tk, "timestamp": str(ts) if ts else None} for r, c, t, tk, ts in rows[::-1]]
        finally:
            cur.close()
            conn.close()

    def save_knowledge(self, user_id, key, value, category="general"):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            if USE_POSTGRES:
                cur.execute(
                    "INSERT INTO knowledge (user_id, key, value, category) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
                    (user_id, key, json.dumps(value), category)
                )
            else:
                cur.execute(
                    "INSERT OR REPLACE INTO knowledge (user_id, key, value, category) VALUES (?, ?, ?, ?)",
                    (user_id, key, json.dumps(value), category)
                )
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def search_knowledge(self, user_id, query):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                f"SELECT id, key, value, category FROM knowledge WHERE user_id = {P} AND (key LIKE {P} OR value LIKE {P})",
                (user_id, f"%{query}%", f"%{query}%")
            )
            results = []
            for row_id, k, v, cat in cur.fetchall():
                try:
                    val = json.loads(v)
                except (json.JSONDecodeError, TypeError):
                    val = v
                results.append({"id": row_id, "key": k, "value": val, "category": cat})
            return results
        finally:
            cur.close()
            conn.close()

    def delete_knowledge(self, knowledge_id, user_id):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f"DELETE FROM knowledge WHERE id = {P} AND user_id = {P}", (knowledge_id, user_id))
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def update_conversation_title(self, conv_id, title):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f"UPDATE conversations SET title = {P} WHERE id = {P}", (title, conv_id))
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def list_conversations(self, user_id):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f"SELECT id, title, created_at FROM conversations WHERE user_id = {P} ORDER BY created_at DESC", (user_id,))
            return [{"id": i, "title": t, "created": str(c)} for i, t, c in cur.fetchall()]
        finally:
            cur.close()
            conn.close()

    def log_event(self, user_id, event_type, data):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                f"INSERT INTO analytics (user_id, event_type, data) VALUES ({P}, {P}, {P})",
                (user_id, event_type, json.dumps(data))
            )
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def get_analytics(self, user_id, days=30):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f"SELECT event_type, COUNT(*) FROM analytics WHERE user_id = {P} GROUP BY event_type", (user_id,))
            return {row[0]: row[1] for row in cur.fetchall()}
        finally:
            cur.close()
            conn.close()

    def get_usage_stats(self, user_id):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f"SELECT COUNT(*) FROM conversations WHERE user_id = {P}", (user_id,))
            total_conversations = cur.fetchone()[0] or 0

            cur.execute(f"SELECT COUNT(*) FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = {P})", (user_id,))
            total_messages = cur.fetchone()[0] or 0

            cur.execute(f"SELECT COALESCE(SUM(tokens_used), 0) FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = {P})", (user_id,))
            total_tokens = cur.fetchone()[0] or 0

            cur.execute(f"SELECT COUNT(*) FROM knowledge WHERE user_id = {P}", (user_id,))
            knowledge_entries = cur.fetchone()[0] or 0

            return {
                "total_conversations": total_conversations,
                "total_messages": total_messages,
                "total_tokens": total_tokens,
                "knowledge_entries": knowledge_entries,
            }
        finally:
            cur.close()
            conn.close()

    def save_preference(self, user_id, key, value):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            if USE_POSTGRES:
                cur.execute(
                    "INSERT INTO preferences (user_id, key, value) VALUES (%s, %s, %s) ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value",
                    (user_id, key, json.dumps(value))
                )
            else:
                cur.execute("INSERT OR REPLACE INTO preferences (user_id, key, value) VALUES (?, ?, ?)", (user_id, key, json.dumps(value)))
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def get_preference(self, user_id, key):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f"SELECT value FROM preferences WHERE user_id = {P} AND key = {P}", (user_id, key))
            row = cur.fetchone()
            return json.loads(row[0]) if row else None
        finally:
            cur.close()
            conn.close()

    def delete_conversation(self, conv_id, user_id):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f"DELETE FROM messages WHERE conversation_id = {P}", (conv_id,))
            cur.execute(f"DELETE FROM conversations WHERE id = {P} AND user_id = {P}", (conv_id, user_id))
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def delete_last_assistant_message(self, conv_id):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            if USE_POSTGRES:
                cur.execute("""
                    DELETE FROM messages WHERE id = (
                        SELECT id FROM messages
                        WHERE conversation_id = %s AND role = 'assistant'
                        ORDER BY timestamp DESC LIMIT 1
                    )
                """, (conv_id,))
            else:
                cur.execute("""
                    DELETE FROM messages WHERE id = (
                        SELECT id FROM messages
                        WHERE conversation_id = ? AND role = 'assistant'
                        ORDER BY timestamp DESC LIMIT 1
                    )
                """, (conv_id,))
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def get_all_conversations_with_preview(self, user_id):
        conn = _get_conn()
        cur = conn.cursor()
        try:
            if USE_POSTGRES:
                cur.execute("""
                    SELECT c.id, c.title, c.created_at,
                           (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as msg_count,
                           (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user' ORDER BY timestamp DESC LIMIT 1) as last_message
                    FROM conversations c WHERE c.user_id = %s ORDER BY c.created_at DESC
                """, (user_id,))
            else:
                cur.execute("""
                    SELECT c.id, c.title, c.created_at,
                           (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as msg_count,
                           (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user' ORDER BY timestamp DESC LIMIT 1) as last_message
                    FROM conversations c WHERE c.user_id = %s ORDER BY c.created_at DESC
                """.replace("%s", "?"), (user_id,))
            return [{"id": i, "title": t, "created": str(c), "message_count": mc, "last_message": (lm or "")[:80]} for i, t, c, mc, lm in cur.fetchall()]
        finally:
            cur.close()
            conn.close()
