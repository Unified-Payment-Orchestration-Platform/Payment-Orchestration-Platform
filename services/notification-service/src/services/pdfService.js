const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
    generateReceipt(transaction) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const fileName = `txn_${transaction.transaction_id}.pdf`;
            const storageDir = path.join(__dirname, '../../storage');
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }
            const filePath = path.join(storageDir, fileName);
            const writeStream = fs.createWriteStream(filePath);

            doc.pipe(writeStream);

            // Receipt Content
            doc.fontSize(25).text('Transaction Receipt', { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`Transaction ID: ${transaction.transaction_id}`);
            doc.text(`Date: ${new Date().toLocaleString()}`);
            doc.moveDown();
            doc.text(`Amount: ${transaction.amount} ${transaction.currency}`);
            doc.text(`Type: ${transaction.transaction_type}`);
            doc.text(`Status: ${transaction.status}`);

            if (transaction.from_account_id) {
                const senderDisplay = transaction.sender_name
                    ? `${transaction.sender_name} (Account: ...${transaction.from_account_id.slice(-4)})`
                    : transaction.from_account_id;
                doc.text(`From: ${senderDisplay}`);
            }
            if (transaction.to_account_id) {
                const receiverDisplay = transaction.receiver_name
                    ? `${transaction.receiver_name} (Account: ...${transaction.to_account_id.slice(-4)})`
                    : transaction.to_account_id;
                doc.text(`To: ${receiverDisplay}`);
            }
            if (transaction.account_name) {
                doc.text(`Account Holder: ${transaction.account_name}`);
            }

            doc.moveDown();
            doc.fontSize(10).text('Thank you for using Payment Orchestration Platform.', { align: 'center' });

            doc.end();

            writeStream.on('finish', () => {
                resolve(fileName);
            });

            writeStream.on('error', (err) => {
                reject(err);
            });
        });
    }
}

module.exports = new PDFService();
