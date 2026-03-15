import psycopg2
import os

def check():
    try:
        conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/parliascope")
        cur = conn.cursor()
        cur.execute("SELECT title, LEFT(ai_summary, 100), created_at FROM hansards ORDER BY created_at DESC LIMIT 10;")
        rows = cur.fetchall()
        print(f"Total Hansards found: {len(rows)}")
        for r in rows:
            print(f"- Title: {r[0]}")
            print(f"  Summary: {r[1]}...")
            print(f"  Date: {r[2]}")
            print("-" * 30)
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
