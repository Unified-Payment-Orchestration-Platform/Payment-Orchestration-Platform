const twilio = require("twilio");
const nodemailer = require("nodemailer");
const sgMail = require('@sendgrid/mail');

class NotificationService {
    constructor() {
        // Initialize Twilio
        this.twilioClient = null;
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        }

        // Initialize Nodemailer
        this.emailTransporter = null;
        if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            this.emailTransporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
        }

        // Initialize SendGrid
        this.sendGridEnabled = false;
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            this.sendGridEnabled = true;
            console.log("SendGrid intialized.");
        }
    }

    async sendSMS(phoneNumber, message) {
        if (this.twilioClient) {
            try {
                const messageOptions = {
                    body: message,
                    to: phoneNumber
                };

                if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
                    messageOptions.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
                } else {
                    messageOptions.from = process.env.TWILIO_PHONE_NUMBER;
                }

                const result = await this.twilioClient.messages.create(messageOptions);
                console.log(`[SMS] Sent to ${phoneNumber}: ${result.sid}`);
                return result;
            } catch (error) {
                console.error(`[SMS] Failed to send to ${phoneNumber}:`, error.message);
                // Fallback to Mock
                this._logMockSMS(phoneNumber, message, "Fallback (Twilio Error)");
            }
        } else {
            this._logMockSMS(phoneNumber, message, "Mock Mode");
        }
    }

    async sendEmail(to, subject, text) {
        // 1. SendGrid (Priority)
        if (this.sendGridEnabled) {
            const msg = {
                to: to,
                from: process.env.SENDGRID_FROM_EMAIL || 'test@example.com',
                subject: subject,
                text: text,
                // html: `<strong>${text}</strong>`, // Optional: nice to have but text is sufficient
            };

            try {
                await sgMail.send(msg);
                console.log(`[EMAIL-SG] Sent to ${to}`);
                return;
            } catch (error) {
                console.error(`[EMAIL-SG] Failed to send to ${to}:`, error.message);
                if (error.response) console.error(error.response.body);
                // Fallback to Next Method
            }
        }

        // 2. Nodemailer
        if (this.emailTransporter && process.env.EMAIL_USER !== 'mock_user') {
            try {
                const info = await this.emailTransporter.sendMail({
                    from: process.env.EMAIL_FROM || '"UPOP Notification" <no-reply@upop.com>',
                    to: to,
                    subject: subject,
                    text: text,
                });
                console.log(`[EMAIL-SMTP] Sent to ${to}: ${info.messageId}`);
                return info;
            } catch (error) {
                console.error(`[EMAIL-SMTP] Failed to send to ${to}:`, error.message);
                // Fallback to Mock
            }
        }

        // 3. Mock Fallback
        this._logMockEmail(to, subject, text, "Mock Mode / Fallback");
    }

    _logMockSMS(phoneNumber, message, reason) {
        console.log('\n==================================================');
        console.log(`[SMS GATEWAY (MOCK)] Sending to ${phoneNumber} [${reason}]:`);
        console.log(message);
        console.log('==================================================\n');
    }

    _logMockEmail(to, subject, text, reason) {
        console.log('\n==================================================');
        console.log(`[EMAIL GATEWAY (MOCK)] Sending to ${to} [${reason}]:`);
        console.log(`Subject: ${subject}`);
        console.log(text);
        console.log('==================================================\n');
    }
}

module.exports = new NotificationService();
