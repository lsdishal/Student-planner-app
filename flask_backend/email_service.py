import smtplib
from email.message import EmailMessage
import os

def send_otp_email(to_email, otp_code):
    sender_email = 'dishvit55@gmail.com'
    sender_password = 'amaz ogby jqct lmyl'

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
        # Use Gmail's SMTP server
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
