import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

def send_otp_email(to_email, otp_code):
    api_key = os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("EMAIL_USER", "dishvit55@gmail.com")

    if not api_key:
        # Dev fallback if API key is not configured
        print(f"---------- [DEV MODE LOG] ----------")
        print(f" Simulating sending OTP to: {to_email}")
        print(f" Simulated OTP Code: {otp_code}")
        print(f"------------------------------------")
        return True

    # Configure API key authorization
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = api_key

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

    # Define the transactional email
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": sender_email, "name": "WebOS Portal"},
        subject="WebOS Login Verification Code",
        html_content=f"""
            <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 30px; background: #1a1a2e; color: #ffffff; border-radius: 12px;">
                <h2 style="color: #6c63ff; text-align: center;">WebOS Portal</h2>
                <p style="text-align: center; color: #ccc;">Your one-time login code is:</p>
                <div style="background: #16213e; border: 2px solid #6c63ff; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #ffffff;">{otp_code}</span>
                </div>
                <p style="text-align: center; color: #aaa; font-size: 13px;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
            </div>
        """
    )

    try:
        print(f"Sending email via Brevo HTTP API to {to_email}...")
        api_response = api_instance.send_transac_email(send_smtp_email)
        print(f"Brevo email sent successfully. Message ID: {api_response.message_id}")
        return True
    except ApiException as e:
        print(f"Failed to send email to {to_email} via Brevo: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error sending email to {to_email}: {str(e)}")
        return False
