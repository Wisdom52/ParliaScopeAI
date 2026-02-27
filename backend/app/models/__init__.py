# Import all models here so SQLAlchemy can resolve string-based relationships
from app.models.user import User
from app.models.location import County, Constituency
from app.models.representative_review import RepresentativeReview
from app.models.speaker import Speaker
from app.models.hansard import Hansard
from app.models.speech import SpeechSegment
from app.models.bill import Bill, BillImpact
from app.models.subscription import Subscription
from app.models.search_history import SearchHistory
