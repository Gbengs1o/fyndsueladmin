
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { recipients, subject, message, smtpSettings, category } = await req.json();

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
        }

        if (!subject || !message) {
            return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
        }

        if (!smtpSettings || !smtpSettings.host || !smtpSettings.user || !smtpSettings.password) {
            return NextResponse.json({ error: 'Valid SMTP configuration is required' }, { status: 400 });
        }

        // Create SMTP transporter
        const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port || 465,
            secure: smtpSettings.port === 465 || smtpSettings.secure !== false, // Default to secure if port 465 or not specified otherwise
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.password,
            },
        });

        // Template rendering logic
        const getHtmlTemplate = (name: string, content: string, category: string = 'general') => {
            const colors = {
                general: '#6366f1', // Indigo
                alert: '#ef4444',   // Red
                update: '#3b82f6'   // Blue
            } as Record<string, string>;

            const accentColor = colors[category] || colors.general;
            const formattedMessage = content.replace(/\n/g, '<br>');

            return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; }
        .wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: ${accentColor}; padding: 32px 24px; text-align: center; }
        .logo { color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; text-decoration: none; }
        .content { padding: 40px 32px; }
        .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; }
        .message { font-size: 16px; color: #374151; margin-bottom: 32px; }
        .footer { padding: 32px; background-color: #f3f4f6; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer-text { font-size: 12px; color: #6b7280; margin: 0; }
        .btn { display: inline-block; padding: 12px 24px; background-color: ${accentColor}; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <a href="#" class="logo">FYND FUEL</a>
        </div>
        <div class="content">
            <div class="greeting">Hello ${name || 'User'},</div>
            <div class="message">${formattedMessage}</div>
        </div>
        <div class="footer">
            <p class="footer-text">You received this email because you are a registered user of FYND FUEL.</p>
            <p class="footer-text" style="margin-top: 8px;">&copy; ${new Date().getFullYear()} FYND FUEL. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
        };

        // Limit the batch size to avoid timeouts
        const batch = recipients.slice(0, 50);

        const emailPromises = batch.map((recipient: { email: string, name: string }) => {
            return transporter.sendMail({
                from: `"${smtpSettings.fromName || 'FYND FUEL'}" <${smtpSettings.fromEmail}>`,
                to: recipient.email,
                subject: subject,
                html: getHtmlTemplate(recipient.name, message, category || 'general')
            });
        });

        const results = await Promise.allSettled(emailPromises);

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.filter(r => r.status === 'rejected').length;

        // Log failures if any
        if (failureCount > 0) {
            const failures = results
                .filter(r => r.status === 'rejected')
                .map((r: any) => r.reason?.message || 'Unknown error');
            console.error('Email failures:', failures);
        }

        return NextResponse.json({
            success: true,
            sent: successCount,
            failed: failureCount,
            message: `Emails processed: ${successCount} sent, ${failureCount} failed.`
        });

    } catch (error: any) {
        console.error('Error sending emails:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
