const axios = require('axios');
const colors = require('colors');

const GATEWAY_URL = 'http://localhost';
const NOTIFICATION_URL = 'http://localhost:3006';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logStep = (step, title) => {
    console.log(`\n${'='.repeat(50)}`.cyan);
    console.log(`STEP ${step}: ${title}`.bold.yellow);
    console.log(`${'='.repeat(50)}\n`.cyan);
};

const runDemo = async () => {
    try {
        console.log('Starting Payment Orchestration Platform Demo...'.bold.green);

        // ---------------------------------------------------------
        // 1. Register User A
        // ---------------------------------------------------------
        logStep(1, 'Registering User A (Sender)');
        const userA = {
            username: 'Saad Musema',
            email: `musemrrasa6ad3333436@gmail.com`,
            password: 'password123',
            phone_number: '+251900478653'
        };
        const regA = await axios.post(`${GATEWAY_URL}/auth/register`, userA);
        console.log('User A Registered:'.green, regA.data.user.user_id);
        const tokenA = regA.data.token;
        const userIdA = regA.data.user.user_id;

        // ---------------------------------------------------------
        // 2. Register User B
        // ---------------------------------------------------------
        logStep(2, 'Registering User B (Receiver)');
        const userB = {
            username: 'UserB',
            email: `userb_${Date.now()}@test.com`,
            password: 'password123',
            phone_number: '+15005550002'
        };
        const regB = await axios.post(`${GATEWAY_URL}/auth/register`, userB);
        console.log('User B Registered:'.green, regB.data.user.user_id);
        const userIdB = regB.data.user.user_id;

        // ---------------------------------------------------------
        // 3. Create Accounts
        // ---------------------------------------------------------
        logStep(3, 'Creating Accounts for Users (Core Banking)');
        // Auth service doesn't auto-create accounts in this version, so we call Core Banking directly via Gateway
        // Gateway: /core -> CoreBanking

        // Account A
        const accA = await axios.post(`${GATEWAY_URL}/core/accounts`, {
            user_id: userIdA,
            account_type: 'CHECKING',
            currency: 'USD'
        });
        console.log('Account A Created:'.green, accA.data.account_id);
        const accountIdA = accA.data.account_id;

        // Account B
        const accB = await axios.post(`${GATEWAY_URL}/core/accounts`, {
            user_id: userIdB,
            account_type: 'SAVINGS',
            currency: 'USD'
        });
        console.log('Account B Created:'.green, accB.data.account_id);
        const accountIdB = accB.data.account_id;

        // ---------------------------------------------------------
        // 4. Deposit Funds to A
        // ---------------------------------------------------------
        logStep(4, 'Depositing $1000 to User A');
        const deposit = await axios.post(`${GATEWAY_URL}/core/transactions/deposit`, {
            idempotency_key: `dep_${Date.now()}`,
            account_id: accountIdA,
            amount: 1000,
            currency: 'USD',
            provider: 'STRIPE',
            provider_transaction_id: 'stripe_123'
        });
        console.log('Deposit Successful:'.green, deposit.data);

        // ---------------------------------------------------------
        // 5. Transfer A -> B (ACID)
        // ---------------------------------------------------------
        logStep(5, 'Transferring $500 from A to B (ACID Transaction)');
        console.log('Theory: This operation uses database transactions (BEGIN/COMMIT) to ensure funds are deducted from A only if added to B.'.gray);

        const transferKey = `trans_${Date.now()}`;
        const transfer = await axios.post(`${GATEWAY_URL}/core/transactions/transfer`, {
            idempotency_key: transferKey,
            from_account_id: accountIdA,
            to_account_id: accountIdB,
            amount: 500,
            currency: 'USD',
            description: 'Demo Transfer'
        });
        console.log('Transfer Successful:'.green, transfer.data);
        const txnId = transfer.data.transaction_id;

        // ---------------------------------------------------------
        // 6. Idempotency Check
        // ---------------------------------------------------------
        logStep(6, 'Testing Idempotency (Retrying same transfer)');
        console.log('Theory: Retrying with the same idempotency_key should return the original result without processing again.'.gray);

        const retryTransfer = await axios.post(`${GATEWAY_URL}/core/transactions/transfer`, {
            idempotency_key: transferKey, // SAME KEY
            from_account_id: accountIdA,
            to_account_id: accountIdB,
            amount: 500,
            currency: 'USD',
            description: 'Demo Transfer Retry'
        });
        console.log('Idempotent Response:'.cyan, retryTransfer.data);
        if (retryTransfer.data.transaction_id === txnId) {
            console.log('SUCCESS: Transaction IDs match!'.green.bold);
        } else {
            console.log('FAIL: Transaction IDs do not match!'.red.bold);
        }

        // ---------------------------------------------------------
        // 7. Verify Balances
        // ---------------------------------------------------------
        logStep(7, 'Verifying Final Balances');
        const balA = await axios.get(`${GATEWAY_URL}/core/accounts/${accountIdA}`);
        const balB = await axios.get(`${GATEWAY_URL}/core/accounts/${accountIdB}`);

        console.log(`User A Balance: $${balA.data.balance}`.yellow);
        console.log(`User B Balance: $${balB.data.balance}`.yellow);

        // ---------------------------------------------------------
        // 8. Withdrawal (User A)
        // ---------------------------------------------------------
        logStep(8, 'Withdrawing $100 from User A');
        const withdrawal = await axios.post(`${GATEWAY_URL}/core/transactions/withdrawal`, {
            idempotency_key: `with_${Date.now()}`,
            account_id: accountIdA,
            amount: 100,
            currency: 'USD'
        });
        console.log('Withdrawal Successful:'.green, withdrawal.data);

        // ---------------------------------------------------------
        // 9. Transaction History (User A)
        // ---------------------------------------------------------
        logStep(9, 'Checking Transaction History for User A');
        const historyA = await axios.get(`${GATEWAY_URL}/core/accounts/${accountIdA}/transactions`);
        console.log(`Found ${historyA.data.length} transactions for User A:`.cyan);
        historyA.data.forEach((txn, idx) => {
            console.log(`${idx + 1}. [${txn.transaction_type}] ${txn.amount} ${txn.currency} (Status: ${txn.status})`.white);
        });

        // ---------------------------------------------------------
        // 10. Notifications
        // ---------------------------------------------------------
        logStep(10, 'Checking Notifications');
        console.log('Theory: The Core Banking service published events to Kafka. The Notification Service consumed them.'.gray);
        console.log('Please check the "notification-service" terminal for SMS/Email logs.'.magenta);
        console.log(`You can download the PDF receipt (if running) at: ${NOTIFICATION_URL}/receipts/txn_${txnId}.pdf`.blue.underline);
        console.log('\nDemo Completed Successfully!'.rainbow);

        // ---------------------------------------------------------
        // 11. Subscription Trial
        // ---------------------------------------------------------
        logStep(11, 'creating subscription for userA to pay userB');
        console.log('Theory: User A subscribes to User B monthly service ($10/month). Next payment is immediate.'.gray);

        const subscription = await axios.post(`${GATEWAY_URL}/auth/users/${userIdA}/subscriptions`, {
            channels: ['EMAIL'],
            event_types: ['PAYMENT_SUCCESS'],
            amount: 10.00,
            currency: 'USD',
            frequency: 'MONTHLY',
            provider_id: userB.username, // Using username as provider_id for this demo
            next_payment_date: new Date().toISOString() // Trigger immediately
        }, {
            headers: { Authorization: `Bearer ${tokenA}` }
        });
        console.log('Subscription Created:'.green, subscription.data);
        const subId = subscription.data.subscription_id;

        // ---------------------------------------------------------
        // 12. Verify Subscription Payment
        // ---------------------------------------------------------
        logStep(12, 'Waiting for Subscription Payment (Cron Job)');
        console.log('Waiting 15 seconds for the cron job to process the due subscription...'.yellow);
        await wait(15000);

        console.log('Checking User A Transaction History again...'.cyan);
        const historyA2 = await axios.get(`${GATEWAY_URL}/core/accounts/${accountIdA}/transactions`);
        const subTxn = historyA2.data.find(t => t.to_account_id === accountIdB && parseFloat(t.amount) === 10.00);

        if (subTxn) {
            console.log('SUCCESS: Subscription Payment Found!'.green.bold);
            console.log(subTxn);
        } else {
            console.log('FAIL: Subscription Payment NOT Found yet.'.red.bold);
            console.log('Note: Ensure the cron job in core-banking-service is running.'.gray);
        }

        console.log('\nDemo Expansion Completed Successfully!'.rainbow);

    } catch (error) {
        console.error('Demo Failed:'.red, error.response ? error.response.data : error.message);
    }
};

runDemo();
