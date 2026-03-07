from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.baraza import BarazaQuiz, BarazaQuestion, BarazaBadge
import json

def seed():
    db = SessionLocal()
    try:
        # 1. Add Initial Quiz
        quiz = db.query(BarazaQuiz).filter(BarazaQuiz.title == "Parliamentary Basics").first()
        if not quiz:
            quiz = BarazaQuiz(
                title="Parliamentary Basics",
                description="Learn how the Kenyan Parliament works.",
                icon="brain",
                points_reward=20
            )
            db.add(quiz)
            db.flush() # Get ID

            # Add Questions
            q1 = BarazaQuestion(
                quiz_id=quiz.id,
                question_text="How many houses are in the Kenyan Parliament?",
                options=json.dumps(["One", "Two", "Three", "Four"]),
                correct_option_index=1 # Two
            )
            q2 = BarazaQuestion(
                quiz_id=quiz.id,
                question_text="What is the main role of the National Assembly?",
                options=json.dumps(["Executive", "Judiciary", "Legislation", "Police"]),
                correct_option_index=2 # Legislation
            )
            db.add(q1)
            db.add(q2)

        # 2. Add Initial Badge
        badge = db.query(BarazaBadge).filter(BarazaBadge.name == "First Steps").first()
        if not badge:
            badge = BarazaBadge(
                name="First Steps",
                description="Completed your first quiz with a perfect score!",
                icon_url="trophy",
                requirement_type="quizzes_completed",
                requirement_value=1
            )
            db.add(badge)

        db.commit()
        print("Seeding successful!")
    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
