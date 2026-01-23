const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Simple number to words function (limited to basic use, expand as needed)
function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];

    if (num === 0) return 'Zero';

    let word = '';
    let scaleIndex = 0;

    while (num > 0) {
        let temp = num % 1000;
        if (temp > 0) {
            let tempWord = '';
            if (temp >= 100) {
                tempWord += ones[Math.floor(temp / 100)] + ' Hundred ';
                temp %= 100;
            }
            if (temp >= 20) {
                tempWord += tens[Math.floor(temp / 10)] + ' ';
                temp %= 10;
            }
            if (temp > 0) {
                tempWord += ones[temp] + ' ';
            }
            word = tempWord + scales[scaleIndex] + ' ' + word;
        }
        num = Math.floor(num / 1000);
        scaleIndex++;
    }
    return word.trim();
}

class PDFService {
    generateReceipt(transaction) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const fileName = `txn_${transaction.transaction_id}.pdf`;
            const storageDir = path.join(__dirname, '../../storage');
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }
            const filePath = path.join(storageDir, fileName);
            const writeStream = fs.createWriteStream(filePath);

            doc.pipe(writeStream);

            // Header
            doc.fillColor('purple').rect(50, 50, 512, 30).fill();
            doc.fillColor('white').fontSize(18).text('International Payment Platform', 50, 55, { align: 'center', width: 512 });
            doc.fillColor('white').fontSize(14).text('Transaction Receipt / Invoice', 50, 70, { align: 'center', width: 512 });

            // Company and Customer Info Sections
            doc.fillColor('black').fontSize(12).moveDown(2);

            // Left: Company Info
            doc.text('Company Address & Info', 60, 110);
            doc.fontSize(10);
            doc.text('Country: United States');
            doc.text('City: New York');
            doc.text('Address: 123 Finance Ave, Suite 100');
            doc.text('Postal Code: 10001');
            doc.text('SWIFT Code: INTLPAYUS');
            doc.text('Email: info@intlpay.com');
            doc.text('Tel: +1-212-555-1234');
            doc.text('Fax: +1-212-555-5678');
            doc.text('TIN: 123456789');
            doc.text('VAT Receipt No.: FT123456789CDV');
            doc.text('VAT Registration Date: 01/01/2020');

            // Right: Customer Info
            doc.fontSize(12).text('Customer Information', 320, 110);
            doc.fontSize(10);
            const customerName = transaction.receiver_name || 'John Doe';
            const customerAccount = transaction.to_account_id ? `...${transaction.to_account_id.slice(-4)}` : 'N/A';
            doc.text(`Name: ${customerName}`, 320);
            doc.text('Region: North America');
            doc.text('City: New York');
            doc.text('Sub City: Manhattan');
            doc.text('Wereda/Kebele No.: -');
            doc.text('VAT Registration No.: -');
            doc.text(`VAT Registration Date: ${new Date().toLocaleDateString()}`);
            doc.text(`TIN (TAX ID): 987654321`);
            doc.text('Branch ID: MAIN BRANCH');

            // Payment / Transaction Information Table
            doc.fontSize(12).text('Payment / Transaction Information', 60, 280, { align: 'center', width: 492 });
            doc.roundedRect(60, 295, 492, 20, 5).stroke(); // Header row
            doc.text('Detail', 70, 300);
            doc.text('Value', 350, 300, { align: 'right', width: 192 });

            let y = 315;
            const rowHeight = 20;

            // Function to draw table row
            const drawRow = (label, value) => {
                doc.roundedRect(60, y, 492, rowHeight, 5).stroke();
                doc.text(label, 70, y + 5);
                doc.text(value, 350, y + 5, { align: 'right', width: 192 });
                y += rowHeight;
            };

            const payer = transaction.sender_name || transaction.from_account_id || 'N/A';
            const payerAccount = transaction.from_account_id ? `...${transaction.from_account_id.slice(-4)}` : 'N/A';
            const receiver = transaction.receiver_name || transaction.to_account_id || 'N/A';
            const receiverAccount = transaction.to_account_id ? `...${transaction.to_account_id.slice(-4)}` : 'N/A';
            const dateTime = new Date().toLocaleString();
            const reference = transaction.transaction_id;
            const reason = transaction.transaction_type || 'General Transaction';
            const transferredAmount = `${transaction.amount} ${transaction.currency}`;
            const commission = '0.50 USD'; // Placeholder, adjust as needed
            const vat = '0.08 USD'; // Placeholder
            const total = `${parseFloat(transaction.amount) + 0.50 + 0.08} ${transaction.currency}`;

            drawRow('Payer', payer);
            drawRow('Account', payerAccount);
            drawRow('Receiver', receiver);
            drawRow('Account', receiverAccount);
            drawRow('Payment Date & Time', dateTime);
            drawRow('Reference No. (VAT Invoice No)', reference);
            drawRow('Reason / Type of Service', reason);
            drawRow('Transferred Amount', transferredAmount);
            drawRow('Commission or Service Charge', commission);
            drawRow('15% VAT on Commission', vat);
            drawRow('Total Amount Debited from Customer\'s Account', total);

            // Draw border around the table
            doc.roundedRect(60, 295, 492, y - 295, 5).stroke();

            // Amount in Words
            y += 10;
            doc.text('Amount in Words', 60, y);
            const amountWords = `${transaction.currency} ${numberToWords(parseFloat(transaction.amount))} Only`;
            doc.rect(60, y + 20, 300, 30).stroke();
            doc.text(amountWords, 70, y + 25);

            // Placeholder for QR Code (text representation, as no QR lib)
            doc.rect(400, y + 20, 100, 100).stroke();
            doc.text('QR Code', 410, y + 50, { align: 'center', width: 80 });

            // Footer
            y += 140;
            doc.fontSize(10).text('Thank you for using International Payment Platform. All rights reserved.', 50, y, { align: 'center', width: 512 });
            doc.text(`© 2025 International Payment Platform.`, 50, y + 15, { align: 'center', width: 512 });

            // Placeholder for Stamp
            doc.circle(250, 400, 50).stroke();
            doc.text('Official Stamp', 220, 395, { align: 'center', width: 60 });

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