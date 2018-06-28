import express from 'express';
const https = require('https');
import WebSocket from 'ws';
import NfcApp from './src';
const fs = require('fs');
const path = require('path');
const httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname + '/private/key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname + '/private/cert.pem'))
};
const app = express();

//initialize a simple http server
const server = https.createServer(httpsOptions, app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });
const nfc = new NfcApp();

wss.on('connection', (ws) => {

    //connection is up, let's add a simple simple event
    ws.on('message', async (id) => {
        try {
            await nfc.write(id).then(function() {
                ws.send('write-done')
            }).catch(function() {
                ws.send(JSON.stringify({ error: 'write' }))
            });
        } catch(e) {
            try {
                ws.send(JSON.stringify({ error: 'write' }))
            } catch(e) {
            }
        }
    });

    nfc.on('error', function(e) {
        try {
            ws.send(JSON.stringify({ error: 'read' }))
        } catch(e) {
            ws.close()
        }
    });

    nfc.on('card-read', function(id) {
        try {
            ws.send(JSON.stringify({ id }))
        } catch(e) {
            ws.close()
        }
    });

});

//start our server
server.listen(8999, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});