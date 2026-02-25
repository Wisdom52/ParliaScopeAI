import logging

logger = logging.getLogger(__name__)

def send_whatsapp_alert(number: str, message: str) -> bool:
    """
    Stub for sending a WhatsApp alert.
    In production, this would integrate with Twilio, Meta Business API, or similar.
    """
    logger.info(f"🟢 [SIMULATED WHATSAPP] To: {number} | Message: {message}")
    print(f"\n📱 --- WHATSAPP ALERT ---")
    print(f"To: {number}")
    print(f"Message: {message}")
    print(f"------------------------\n")
    return True

def send_push_notification(token: str, message: str) -> bool:
    """
    Stub for sending a push notification.
    In production, this would integrate with Expo Push service, Firebase Cloud Messaging, etc.
    """
    logger.info(f"🔵 [SIMULATED PUSH] Token: {token} | Message: {message}")
    print(f"\n🔔 --- PUSH NOTIFICATION ---")
    print(f"Token: {token}")
    print(f"Message: {message}")
    print(f"---------------------------\n")
    return True
