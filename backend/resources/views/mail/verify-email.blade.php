<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; background: #0b0b0c; color: #f5f5f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #0b0b0c;">
        <tr>
            <td align="center" style="padding: 32px 16px;">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width: 560px; max-width: 100%; background: #111214; border: 1px solid #232428; border-radius: 16px; overflow: hidden;">
                    <tr>
                        <td style="padding: 28px 28px 8px;">
                            <div style="font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #9ca3af; font-weight: 600;">AlienCare AutoShop</div>
                            <h1 style="margin: 12px 0 8px; font-size: 24px; color: #ffffff;">Verify your email</h1>
                            <p style="margin: 0 0 16px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                                Hello {{ $notifiable->name ?? 'there' }}, please confirm your email address to activate your AlienCare account.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 0 28px 24px;">
                            <a href="{{ $verificationUrl }}" style="display: inline-block; background: #d4af37; color: #111111; text-decoration: none; padding: 12px 22px; border-radius: 10px; font-weight: 700; font-size: 14px;">Verify Email Address</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 28px 28px; color: #a1a1aa; font-size: 12px; line-height: 1.6;">
                            If the button does not work, copy and paste this link into your browser:<br>
                            <a href="{{ $verificationUrl }}" style="color: #e6c24e; word-break: break-all;">{{ $verificationUrl }}</a>
                        </td>
                    </tr>
                </table>
                <div style="margin-top: 16px; font-size: 11px; color: #6b7280;">
                    If you did not create an account, you can safely ignore this message.
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
