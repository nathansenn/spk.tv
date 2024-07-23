const express = require('express');
const { Client, PrivateKey } = require('@hiveio/dhive');
require('dotenv').config();

const app = express();
const port = 3001;

// Configure the Hive client
const client = new Client([process.env.HIVE_NODE], {
    timeout: 8000,
    failoverThreshold: 10,
    consoleOnFailover: true
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    const startBlock = process.env.START_BLOCK || 'latest'; // Use 'latest' or specify a block number
    streamBlockchain(startBlock);
});

// Function to stream the blockchain and filter for SPK_TV_FREE_CONTRACT
const streamBlockchain = (startBlock) => {
    console.log(`Starting to stream the blockchain from block: ${startBlock}...`);

    client.blockchain.getBlockStream().on('data', block => {
        console.log('Processing block:', block.block_id);
        block.transactions.forEach(transaction => {
            transaction.operations.forEach(operation => {
                const [type, data] = operation;
                if (type === 'custom_json' && data.id === 'SPK_TV_FREE_CONTRACT') {
                    console.log('SPK_TV_FREE_CONTRACT operation found:', data);
                    // Process the data here
                    postTransaction(data);
                }
            });
        });
    }).on('error', error => console.error('Stream error:', error));
};


// Function to post transactions back to the Hive blockchain
const postTransaction = async (data) => {
    console.log('Posting transaction:', data);
    const ops = [{
        required_auths: [process.env.BOT_ACCOUNT],
        required_posting_auths: [],
        id: 'spkccT_channel_open',
        json: JSON.stringify({
            "broca": parseFloat(data.json.match(/"kb":(\d+)/)[1]) * 10,
            "broker": "dlux-io",
            "to": data.required_auths[0],
            "contract": "0"
        })
    }];
   try {
       const result = await client.broadcast.json(ops[0], PrivateKey.from(process.env.ACTIVE_KEY));
       console.log('Transaction posted:', result);
   } catch (error) {
       console.error('Failed to post transaction:', error);
   }
};

app.get('/', (req, res) => {
    res.send('API is running and streaming for SPK_TV_FREE_CONTRACT!');
});
