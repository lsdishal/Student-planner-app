import smtplib
from email.message import EmailMessage
import os

def send_otp_email(to_email, otp_code):
    sender_email = os.environ.get("EMAIL_USER")
    sender_password = os.environ.get("EMAIL_PASS")

    # If variables are not set, print to console (development fallback)
    if not sender_email or not sender_password:
        print(f"---------- [DEV MODE LOG] ----------")
        print(f" Simulating sending OTP to: {to_email}")
        print(f" Simulated OTP Code: {otp_code}")
        print(f"------------------------------------")
        return True

    msg = EmailMessage()
    msg.set_content(f"Your WebOS Authentication OTP is: {otp_code}\n\nThis code will expire in 5 minutes.")

    msg['Subject'] = 'WebOS Login verification code'
    msg['From'] = f"WebOS System <{sender_email}>"
    msg['To'] = to_email

    try:
        print(f"Connecting to SMTP server via SSL port 465 for {to_email}...")
        # Use SMTP_SSL on port 465, which is typically open on Render
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=10)
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        print(f"Successfully sent OTP to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")
        return False
