const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
    generateReceipt(transaction) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const fileName = `txn_${transaction.transaction_id}.pdf`;
            const filePath = path.join(__dirname, '../../storage', fileName);
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
                doc.text(`From Account: ${transaction.from_account_id}`);
            }
            if (transaction.to_account_id) {
                doc.text(`To Account: ${transaction.to_account_id}`);
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
