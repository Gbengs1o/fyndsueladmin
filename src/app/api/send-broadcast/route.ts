
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { recipients, subject, message } = await req.json();

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
        }

        if (!subject || !message) {
            return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
        }

        // In a production environment, you might want to use a queue for bulk sending.
        // For this scope, we will loop and send.
        // Ideally, utilize Resend's batch sending capabilities if available or send individually.
        // Sending individually to ensure privacy (no CC/BCC exposure) and personalization if needed.

        // We'll limit the batch size for this demo to avoid timeouts on Vercel/Node functions (10s limit often).
        // Let's grab the first 50 for safety in this synchronous handler.
        const batch = recipients.slice(0, 50);

        const emailPromises = batch.map((recipient: { email: string, name: string }) => {
            return resend.emails.send({
                from: 'Support <onboarding@resend.dev>', // Update this with your verified domain in Resend dashboard
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
