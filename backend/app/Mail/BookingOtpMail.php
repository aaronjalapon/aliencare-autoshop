<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\JobOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class BookingOtpMail extends Mailable
{
    use Queueable;

    public function __construct(
        public string $code,
        public JobOrder $jobOrder,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Booking Verification Code — '.$this->jobOrder->jo_number,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.booking-otp',
            with: [
                'code' => $this->code,
                'joNumber' => $this->jobOrder->jo_number,
                'serviceName' => $this->jobOrder->service?->service_name ?? 'Auto Service',
                'expiresIn' => '10 minutes',
            ],
        );
    }
}
