import os
import resend

def send_otp_email(to_email, otp_code):
    api_key = os.environ.get("RESEND_API_KEY")

    if not api_key:
        # Dev mode: no API key set, just print to console
        print(f"---------- [DEV MODE LOG] ----------")
        print(f" Simulating sending OTP to: {to_email}")
        print(f" Simulated OTP Code: {otp_code}")
        print(f"------------------------------------")
        return True

    resend.api_key = api_key

    try:
        params: resend.Emails.SendParams = {
            "from": "WebOS System <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "WebOS Login Verification Code",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 30px; background: #1a1a2e; color: #ffffff; border-radius: 12px;">
                    <h2 style="color: #6c63ff; text-align: center;">WebOS Portal</h2>
                    <p style="text-align: center; color: #ccc;">Your one-time login code is:</p>
                    <div style="background: #16213e; border: 2px solid #6c63ff; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #ffffff;">{otp_code}</span>
                    </div>
                    <p style="text-align: center; color: #aaa; font-size: 13px;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
                </div>
            """,
        }

        email = resend.Emails.send(params)
        print(f"[Resend] Email sent to {to_email}, ID: {email['id']}")
        return True

    except Exception as e:
        print(f"[Resend] Failed to send email to {to_email}: {str(e)}")
        return False
