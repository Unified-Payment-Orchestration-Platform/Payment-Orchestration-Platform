const twilio = require("twilio");
const nodemailer = require("nodemailer");

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
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
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
                if (error.code === 21608) {
                    console.log('[SMS TIP] This seems to be a Trial Account error. You can only send SMS to Verified Numbers.');
                }
            }
        } else {
            // Mock SMS Sending
            console.log('\n==================================================');
            console.log(`[SMS GATEWAY (MOCK)] Sending to ${phoneNumber}:`);
            console.log(message);
            console.log('==================================================\n');
        }
    }

    async sendEmail(to, subject, text) {
        // If user is 'mock_user', FORCE mock mode regardless of other settings
        if (this.emailTransporter && process.env.EMAIL_USER !== 'mock_user') {
            try {
                const info = await this.emailTransporter.sendMail({
                    from: process.env.EMAIL_FROM || '"UPOP Notification" <no-reply@upop.com>',
                    to: to,
                    subject: subject,
                    text: text,
                });
                console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);
                return info;
            } catch (error) {
                console.error(`[EMAIL] Failed to send to ${to}:`, error.message);
            }
        } else {
            // Mock Email Sending
            console.log('\n==================================================');
            console.log(`[EMAIL GATEWAY (MOCK)] Sending to ${to}:`);
            console.log(`Subject: ${subject}`);
            console.log(text);
            console.log('==================================================\n');
        }
    }
}

module.exports = new NotificationService();
