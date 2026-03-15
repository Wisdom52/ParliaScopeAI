import sys, os
from datetime import datetime, timezone

sys.path.append(r'c:\Users\Admin\Documents\ParliaScopeAI\backend')
from app.database import SessionLocal
from app.models.user import User
from app.models.baraza import BarazaLiveChat

db = SessionLocal()

def get_or_create_user(email, name):
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(
            email=email,
            full_name=name,
            role='USER',
            is_active=True,
            is_verified=True,
            county_id=47,
            constituency_id=288
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    return u

c1 = get_or_create_user('mombasa.citizen1@parliascope.go.ke', 'Hassan Ali')
c2 = get_or_create_user('mombasa.citizen2@parliascope.go.ke', 'Fatuma Said')

messages = [
    (c1, 'The new bill on port operations is crucial for our local economy.'),
    (c2, 'We need more clarity on the proposed tax changes affecting small businesses.'),
    (c1, 'I hope the representative addresses the housing situation today.'),
    (c2, 'Security in our area needs to be prioritized in the supplementary budget.'),
]

added = 0
for u, m in messages:
    existing = db.query(BarazaLiveChat).filter(BarazaLiveChat.message == m).first()
    if not existing:
        chat = BarazaLiveChat(
            message=m,
            user_id=u.id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(chat)
        added += 1

db.commit()
print(f'Done! Added {added} mock live chats for constituency 288 (Mombasa).')
