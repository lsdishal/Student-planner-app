import smtplib
from email.message import EmailMessage
import os

def send_otp_email(to_email, otp_code):
    
    sender_email = os.environ.get("EMAIL_USER")
    sender_password = os.environ.get("EMAIL_PASS")

    if not sender_email or not sender_password:
        print(f"[WARNING] SENDER_EMAIL or SENDER_PASSWORD not set in environment variables.")
        print(f"---------- [DEV MODE LOG] ----------")
        print(f" Simulating sending OTP to: {to_email}")
        print(f" Simulated OTP Code: {otp_code}")
        print(f"------------------------------------")
        # In dev mode without password, we simulate a successful send so the user can see it in terminal
        return True

    msg = EmailMessage()
    msg.set_content(f"Your WebOS Authentication OTP is: {otp_code}\n\nThis code will expire in 5 minutes.")

    msg['Subject'] = 'WebOS Login verification code'
    msg['From'] = f"WebOS System <{sender_email}>"
    msg['To'] = to_email

    try:
        # Use Gmail's SMTP server with a 10-second timeout
        print(f"Connecting to SMTP server for {to_email}...")
        server = smtplib.SMTP('smtp.gmail.com', 587, timeout=10)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        print(f"Successfully sent OTP to {to_email}")
        return True
    except smtplib.SMTPConnectError:
        print(f"Error: Could not connect to SMTP server. Check internet or server block.")
        return False
    except smtplib.SMTPAuthenticationError:
        print(f"Error: SMTP Authentication failed. Check EMAIL_USER and EMAIL_PASS (App Password required).")
        return False
    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")
        return False
