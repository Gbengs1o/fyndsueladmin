
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { recipients, subject, message, smtpSettings } = await req.json();

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

        // Limit the batch size to avoid timeouts
        const batch = recipients.slice(0, 50);

        const emailPromises = batch.map((recipient: { email: string, name: string }) => {
            return transporter.sendMail({
                from: `"${smtpSettings.fromName || 'Support'}" <${smtpSettings.fromEmail}>`,
                to: recipient.email,
                subject: subject,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hello ${recipient.name || 'User'},</p>
            <div style="white-space: pre-wrap; margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #666; font-size: 12px;">
              You received this email because you are a registered user of our Fuel Price Dashboard.
            </p>
          </div>
        `
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
