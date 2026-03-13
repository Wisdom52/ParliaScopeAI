"""
Seed script for Baraza badges.
Run from the backend directory:
    python scripts/seed_badges.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.baraza import BarazaBadge

BADGES = [
    {
        "name": "First Steps",
        "description": "Completed your very first Civic IQ quiz. Welcome, citizen!",
        "icon_url": "🎓",
        "requirement_type": "quizzes_completed",
        "requirement_value": 1,
    },
    {
        "name": "Civic Novice",
        "description": "Aced a beginner-level civic challenge with a perfect score.",
        "icon_url": "🌱",
        "requirement_type": "beginner_quiz_perfect",
        "requirement_value": 1,
    },
    {
        "name": "Rising Patriot",
        "description": "Crossed 50 Prosperity Points. Your civic engagement is paying off!",
        "icon_url": "⭐",
        "requirement_type": "points_total",
        "requirement_value": 50,
    },
    {
        "name": "Parliament Scholar",
        "description": "Mastered an advanced parliamentary quiz. You know your parliament!",
        "icon_url": "🏛️",
        "requirement_type": "advanced_quiz_perfect",
        "requirement_value": 1,
    },
    {
        "name": "Civic Champion",
        "description": "An exceptional citizen who has earned 200+ Prosperity Points.",
        "icon_url": "🏆",
        "requirement_type": "points_total",
        "requirement_value": 200,
    },
]

def seed():
    db = SessionLocal()
    try:
        existing_names = {b.name for b in db.query(BarazaBadge).all()}
        added = 0
        for badge_data in BADGES:
            if badge_data["name"] not in existing_names:
                db.add(BarazaBadge(**badge_data))
                added += 1
                print(f"  ✅ Added badge: {badge_data['name']}")
            else:
                print(f"  ↩️  Badge already exists: {badge_data['name']}")
        db.commit()
        print(f"\nDone! {added} new badges seeded.")
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding Baraza badges...")
    seed()
