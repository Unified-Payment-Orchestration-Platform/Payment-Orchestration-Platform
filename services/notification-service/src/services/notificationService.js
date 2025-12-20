const twilio = require("twilio")

class NotificationService {
    async sendSMS(phoneNumber, message) {
        // Mock SMS Sending
        console.log('\n==================================================');
        console.log(`[SMS GATEWAY] Sending to ${phoneNumber}:`);
        console.log(message);
        console.log('==================================================\n');
        // return true;

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const client = require('twilio')(accountSid, authToken);
        client.messages
            .create({
                body: message,
                messagingServiceSid: 'xxxxxx',
                to: phoneNumber
            })
            .then(message => console.log(message.sid));
    }
}

module.exports = new NotificationService();
