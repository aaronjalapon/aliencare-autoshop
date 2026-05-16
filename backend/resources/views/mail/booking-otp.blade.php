<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Verification Code</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e5e5e5;">
        <tr>
            <td style="padding: 32px 24px;">
                <h1 style="font-size: 18px; margin: 0 0 16px; color: #111;">Booking Verification Code</h1>
                <p style="font-size: 14px; color: #444; margin: 0 0 16px;">
                    Your booking for <strong>{{ $serviceName }}</strong> ({{ $joNumber }}) requires verification.
                </p>
                <p style="font-size: 14px; color: #444; margin: 0 0 8px;">
                    Enter the code below to confirm your booking:
                </p>
                <div style="text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; background: #f3f4f6; border-radius: 8px; margin: 16px 0; color: #111;">
                    {{ $code }}
                </div>
                <p style="font-size: 13px; color: #666; margin: 0 0 24px;">
                    This code expires in <strong>{{ $expiresIn }}</strong>.
                </p>
                <p style="font-size: 12px; color: #999; margin: 0;">
                    If you did not request this booking, please ignore this email.
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding: 16px 24px; border-top: 1px solid #e5e5e5; text-align: center;">
                <p style="font-size: 12px; color: #999; margin: 0;">
                    {{ config('app.name') }}
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
