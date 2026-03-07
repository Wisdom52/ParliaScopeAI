import asyncio
from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models.baraza import BarazaMeeting, BarazaPoll, BarazaPollOption, BarazaForumPost, BarazaForumComment
from app.models.user import User

async def seed_baraza():
    db = SessionLocal()
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Get a user for attribution
    user = db.query(User).first()
    if not user:
        print("No user found to attribute Baraza content to. Please sign up first.")
        db.close()
        return

    # 1. Seed Meetings
    if not db.query(BarazaMeeting).first():
        meetings = [
            BarazaMeeting(
                title="Constituency Town Hall: Budget 2026",
                description="Discussing the impact of the new finance bill on local businesses and schools.",
                scheduled_at=datetime.utcnow() + timedelta(days=2),
                meeting_link="https://zoom.us/j/parliascope-townhall",
                host_id=user.id
            ),
            BarazaMeeting(
                title="Infrastructure Project Update",
                description="Updates on the new road construction and water piping projects in the ward.",
                scheduled_at=datetime.utcnow() + timedelta(days=5),
                meeting_link="https://meet.google.com/parliascope-update",
                host_id=user.id
            )
        ]
        db.add_all(meetings)
        print("Seeded meetings.")

    # 2. Seed Polls
    if not db.query(BarazaPoll).first():
        poll = BarazaPoll(question="Which infrastructure project should be prioritized this quarter?")
        db.add(poll)
        db.commit()
        db.refresh(poll)

        options = [
            BarazaPollOption(poll_id=poll.id, text="Road Maintenance"),
            BarazaPollOption(poll_id=poll.id, text="Water Supply Expansion"),
            BarazaPollOption(poll_id=poll.id, text="Street Lighting"),
            BarazaPollOption(poll_id=poll.id, text="Market Renovations")
        ]
        db.add_all(options)
        print("Seeded polls.")

    # 3. Seed Forum
    if not db.query(BarazaForumPost).first():
        post = BarazaForumPost(
            title="Garbage collection delays in the market area",
            content="Has anyone noticed that the garbage trucks haven't been coming regularly for the past two weeks? It's starting to smell and attract pests.",
            author_id=user.id
        )
        db.add(post)
        db.commit()
        db.refresh(post)

        comment = BarazaForumComment(
            post_id=post.id,
            author_id=user.id,
            content="I noticed this too. We should raise this in the next town hall meeting."
        )
        db.add(comment)
        print("Seeded forum posts.")

    db.commit()
    db.close()
    print("Baraza seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed_baraza())
