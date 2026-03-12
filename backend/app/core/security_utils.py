import time
import asyncio
from fastapi import HTTPException, Request
from functools import wraps
from typing import Dict, Tuple

# In-memory store: {path_ip: (count, reset_time)}
_rate_limits: Dict[str, Tuple[int, float]] = {}

def rate_limit(requests_per_minute: int = 20):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Search for Request object in args and kwargs by type
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            if not request:
                for val in kwargs.values():
                    if isinstance(val, Request):
                        request = val
                        break

            if not request:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                return func(*args, **kwargs)

            client_ip = request.client.host
            path = request.url.path
            key = f"{path}:{client_ip}"
            
            now = time.time()
            if key not in _rate_limits or now > _rate_limits[key][1]:
                # New window
                _rate_limits[key] = (1, now + 60)
            else:
                count, reset_time = _rate_limits[key]
                if count >= requests_per_minute:
                    raise HTTPException(
                        status_code=429, 
                        detail=f"Too many requests. Please try again in {int(reset_time - now)} seconds."
                    )
                _rate_limits[key] = (count + 1, reset_time)
                
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            return func(*args, **kwargs)
        return wrapper
    return decorator

def get_notification_trigger(db, type: str, message: str, severity: str = "Medium"):
    """Helper to trigger an admin notification in the database."""
    from app.models.system import AdminNotification
    from app.core.logger import logger
    
    try:
        notif = AdminNotification(
            type=type,
            message=message,
            severity=severity
        )
        db.add(notif)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to trigger admin notification: {e}")
