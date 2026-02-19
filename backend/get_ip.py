import socket

def get_local_ip():
    try:
        # Create a dummy socket to find the preferred local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    print(f"\n--- ParliaScope API Discovery ---")
    print(f"Backend Local IP: {get_local_ip()}")
    print(f"API Base URL (for Mobile): http://{get_local_ip()}:8000")
    print(f"----------------------------------\n")
