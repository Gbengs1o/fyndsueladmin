
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface TemplateSettings {
    headerColor: string;
    logoText: string;
    logoImageUrl: string;
    greetingPrefix: string;
    footerText: string;
    showFooter: boolean;
}

export async function POST(req: Request) {
    try {
        const { recipients, subject, message, smtpSettings, templateSettings, images } = await req.json();

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
            secure: smtpSettings.port === 465 || smtpSettings.secure !== false,
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.password,
            },
        });

        // Merge defaults with user-provided template settings
        const tpl: TemplateSettings = {
            headerColor: templateSettings?.headerColor || '#6366f1',
            logoText: templateSettings?.logoText || '',
            logoImageUrl: templateSettings?.logoImageUrl || '',
            greetingPrefix: templateSettings?.greetingPrefix || 'Hello',
            footerText: templateSettings?.footerText || '',
            showFooter: templateSettings?.showFooter !== false,
        };

        // Prepare attachments
        const attachments = (images || []).map((base64: string, index: number) => {
            const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
            if (!match) return null;
            const contentType = match[1];
            const content = match[2];
            return {
                filename: `image_${index}.${contentType.split('/')[1]}`,
                content: content,
                encoding: 'base64',
                cid: `img_${index}@broadcast`,
                contentType: contentType
            };
        }).filter(Boolean);

        // Template rendering logic — fully dynamic
        const getHtmlTemplate = (name: string, content: string) => {
            const formattedMessage = content;

            const logoHtml = tpl.logoImageUrl
                ? `<img src="${tpl.logoImageUrl}" alt="${tpl.logoText || 'Logo'}" style="max-height: 48px; max-width: 200px;" />`
                : `<span style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">${tpl.logoText || ''}</span>`;

            const footerHtml = tpl.showFooter && tpl.footerText
                ? `<div style="padding: 32px; background-color: #f3f4f6; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #6b7280; margin: 0;">${tpl.footerText}</p>
                </div>`
                : '';

            // Generate HTML for attached images
            const imagesHtml = (attachments || []).map((att: any) => `
                <div style="margin-top: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
                    <img src="cid:${att.cid}" alt="Attachment" style="width: 100%; height: auto; display: block;" />
                </div>
            `).join('');

            return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; }
    </style>
</head>
<body>
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: ${tpl.headerColor}; padding: 32px 24px; text-align: center;">
            ${logoHtml}
        </div>
        <div style="padding: 40px 32px;">
            <div style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px;">${tpl.greetingPrefix} ${name || 'User'},</div>
            <div style="font-size: 16px; color: #374151; margin-bottom: 32px; line-height: 1.6;">${formattedMessage}</div>
            ${imagesHtml}
        </div>
        ${footerHtml}
    </div>
</body>
</html>`;
        };

        // Limit the batch size to avoid timeouts
        const batch = recipients.slice(0, 50);

        const emailPromises = batch.map((recipient: { email: string, name: string }) => {
            return transporter.sendMail({
                from: `"${smtpSettings.fromName || 'Support'}" <${smtpSettings.fromEmail}>`,
                to: recipient.email,
                subject: subject,
                html: getHtmlTemplate(recipient.name, message),
                attachments: attachments as any[]
            });
        });

        const results = await Promise.allSettled(emailPromises);

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.filter(r => r.status === 'rejected').length;

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
