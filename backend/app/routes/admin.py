from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, inspect, text
from typing import List
import os
import psutil
import datetime

from app.database import get_db, engine
from app.models.user import User
from app.models.system import AdminNotification
from app.models.admin_audit import AdminAuditLog
from app.models.bill import Bill
from app.models.hansard import Hansard
from app.models.baraza import BarazaMeeting, BarazaPoll, BarazaForumPost, BarazaLiveChat, BarazaLivePulse
from app.schemas import User as UserRead, AdminAuditLogOut
from app.routes.auth import get_current_admin_user
from app.core.logger import logger
from app.routes.ingest import perform_hansard_crawl

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/health")
def get_system_health(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Returns real-time server health metrics: CPU, RAM, disk, and DB connectivity.
    """
    cpu_percent = psutil.cpu_percent(interval=0.5)
    ram = psutil.virtual_memory()
    disk = psutil.disk_usage("/" if os.name != "nt" else "C:\\")

    # DB connectivity check
    db_ok = True
    db_latency_ms = 0
    try:
        t0 = datetime.datetime.utcnow()
        db.execute(text("SELECT 1"))
        db_latency_ms = round((datetime.datetime.utcnow() - t0).total_seconds() * 1000, 2)
    except Exception:
        db_ok = False

    # Connection pool stats (SQLAlchemy)
    pool = engine.pool
    pool_stats = {
        "checkedin": pool.checkedin(),
        "checkedout": pool.checkedout(),
        "size": pool.size(),
        "overflow": pool.overflow(),
    }

    return {
        "cpu": {
            "percent": cpu_percent,
            "core_count": psutil.cpu_count(logical=True)
        },
        "ram": {
            "total_gb": round(ram.total / 1e9, 2),
            "used_gb": round(ram.used / 1e9, 2),
            "percent": ram.percent
        },
        "disk": {
            "total_gb": round(disk.total / 1e9, 2),
            "used_gb": round(disk.used / 1e9, 2),
            "percent": disk.percent
        },
        "database": {
            "ok": db_ok,
            "latency_ms": db_latency_ms,
            "pool": pool_stats
        },
        "uptime_seconds": round((datetime.datetime.utcnow() - datetime.datetime.utcfromtimestamp(psutil.boot_time())).total_seconds())
    }

@router.get("/users", response_model=List[UserRead])
def list_users(
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin_user)
):
    """
    List all registered citizens.
    """
    logger.info(f"Admin {admin.email} requested user list.")
    return db.query(User).all()

@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """
    Retrieve system-wide aggregated statistics for the Admin Dashboard.
    Pulling real data from the database tables.
    """
    # User Stats
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    paused_users = total_users - active_users
    total_leaders = db.query(User).filter(User.role == "LEADER").count()
    total_admins = db.query(User).filter(User.is_admin == True).count()
    total_citizens = db.query(User).filter(User.role == "CITIZEN").count()

    # Content Stats
    total_bills = db.query(Bill).count()
    total_hansards = db.query(Hansard).count()

    # Baraza Stats
    total_meetings = db.query(BarazaMeeting).count()
    total_polls = db.query(BarazaPoll).count()
    total_posts = db.query(BarazaForumPost).count()
    
    # Live Stream Engagement
    total_live_chats = db.query(BarazaLiveChat).count()
    total_pulse_reactions = db.query(BarazaLivePulse).count()

    return {
        "users": {
            "total": total_users,
            "citizens": total_citizens,
            "leaders": total_leaders,
            "admins": total_admins,
            "active": active_users,
            "paused": paused_users
        },
        "content": {
            "bills": total_bills,
            "hansard_sessions": total_hansards
        },
        "baraza": {
            "meetings": total_meetings,
            "polls": total_polls,
            "forum_posts": total_posts
        },
        "live_stream": {
            "chats": total_live_chats,
            "reactions": total_pulse_reactions
        }
    }

@router.get("/logs")
def get_logs(
    lines: int = Query(100, ge=1, le=1000),
    admin: User = Depends(get_current_admin_user)
):
    """
    Fetch the latest lines from the application log file.
    """
    log_path = "logs/parliascope.log"
    if not os.path.exists(log_path):
        return {"logs": "Log file not found."}
    
    try:
        with open(log_path, "r") as f:
            # Simple tail implementation
            content = f.readlines()
            last_lines = content[-lines:] if len(content) > lines else content
            return {"logs": "".join(last_lines)}
    except Exception as e:
        logger.error(f"Failed to read logs for admin: {e}")
        raise HTTPException(status_code=500, detail="Could not read log file.")

@router.post("/ingest/hansard")
async def trigger_hansard_ingest(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """
    Manually trigger the Hansard ingestion crawler.
    """
    logger.info(f"Admin {admin.email} manually triggered Hansard ingestion.")
    try:
        # Note: In a production app, this should be a background task.
        # But for this system, we can invoke it and return status.
        stats = await perform_hansard_crawl(db)
        return {"status": "success", "summary": stats}
    except Exception as e:
        logger.error(f"Manual ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """
    Toggle a user's admin (is_admin) status.
    """
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot demote themselves.")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    user.is_admin = not user.is_admin
    db.commit()
    # Audit trail
    db.add(AdminAuditLog(
        admin_id=admin.id,
        action="ROLE_CHANGED",
        target_user_id=user.id,
        details=f"{'Promoted to Admin' if user.is_admin else 'Demoted to Citizen'}: {user.email}"
    ))
    db.commit()
    logger.info(f"Admin {admin.email} toggled role for user {user.email} to is_admin={user.is_admin}")
    return {"status": "success", "is_admin": user.is_admin}

@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """
    Toggle a user's active (is_active) status.
    """
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot pause themselves.")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    user.is_active = not user.is_active
    db.commit()
    # Audit trail
    db.add(AdminAuditLog(
        admin_id=admin.id,
        action="STATUS_CHANGED",
        target_user_id=user.id,
        details=f"{'Activated' if user.is_active else 'Paused'}: {user.email}"
    ))
    db.commit()
    logger.info(f"Admin {admin.email} toggled status for user {user.email} to is_active={user.is_active}")
    return {"status": "success", "is_active": user.is_active}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """
    Permanently delete a user account.
    """
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot delete themselves.")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    email = user.email
    db.delete(user)
    # Audit trail (before final commit so we still have admin context)
    db.add(AdminAuditLog(
        admin_id=admin.id,
        action="USER_DELETED",
        target_user_id=user_id,
        details=f"Permanently deleted account: {email}"
    ))
    db.commit()
    logger.warning(f"Admin {admin.email} PERMANENTLY DELETED user account: {email}")
    return {"status": "success", "message": f"User {email} deleted successfully."}

@router.get("/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Fetch recent system notifications for administrators."""
    return db.query(AdminNotification).order_by(AdminNotification.created_at.desc()).limit(100).all()

@router.get("/audit-logs", response_model=List[AdminAuditLogOut])
def get_audit_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Returns the admin action ledger in reverse-chronological order."""
    return db.query(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(200).all()

@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Mark a notification as read."""
    notif = db.query(AdminNotification).filter(AdminNotification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"status": "success"}
@router.get("/db/tables")
def list_db_tables(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """List all tables in the database."""
    inspector = inspect(db.get_bind())
    return inspector.get_table_names()

@router.get("/db/table/{table_name}")
def get_table_data(
    table_name: str,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Fetch raw data from a specific table."""
    try:
        inspector = inspect(db.get_bind())
        if table_name not in inspector.get_table_names():
            raise HTTPException(status_code=404, detail="Table not found")
            
        result = db.execute(text(f"SELECT * FROM {table_name} LIMIT :limit OFFSET :offset"), {"limit": limit, "offset": offset})
        columns = result.keys()
        rows = []
        for row in result:
            # Convert row to dict, handling non-serializable types if needed
            row_dict = {}
            for i, col in enumerate(columns):
                val = row[i]
                # Basic serialization for common types that might cause JSON issues
                if hasattr(val, 'isoformat'): # datetime
                    val = val.isoformat()
                elif isinstance(val, (bytes, bytearray)):
                    val = "<binary data>"
                row_dict[col] = val
            rows.append(row_dict)
            
        return {
            "table": table_name,
            "columns": list(columns),
            "rows": rows
        }
    except Exception as e:
        logger.error(f"Failed to fetch data for table {table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
