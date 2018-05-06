"use strict";
import NFC, { TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B } from './NFC';
import pretty from './pretty';
import EventEmitter from 'events';


export default class NfcApp extends EventEmitter{

    constructor() {
        super();
        const nfc = new NFC(); // const nfc = new NFC(minilogger); // optionally you can pass logger to see internal debug logs

        let readers = [];

        nfc.on('reader', async reader => {

            pretty.info(`device attached`, { reader: reader.name });

            readers.push(reader);

            // needed for reading tags emulated with Android HCE AID
            // see https://developer.android.com/guide/topics/connectivity/nfc/hce.html
            reader.aid = 'F222222222';

            reader.on('card', async card => {
                // standard nfc tags like Mifare
                if (card.type === TAG_ISO_14443_3) {
                    pretty.info(`card detected`, { reader: reader.name, card });
                }
                // Android HCE
                else if (card.type === TAG_ISO_14443_4) {
                    const data = card.data.toString('utf8');
                    pretty.info(`card detected`, { reader: reader.name, card: { ...card, data } });
                }
                else {
                    pretty.info(`card detected`, { reader: reader.name, card });
                }
                try {
                    const key = 'FFFFFFFFFFFF';
                    const keyType = KEY_TYPE_A;
                    let ret = "";
                    await reader.authenticate(1, keyType, key);
                    await reader.authenticate(2, keyType, key);
                    const e1 = await reader.read(1, 16);
                    const e2 = await reader.read(2, 16);
                    ret = (e1.toString('ascii')+e2.toString('ascii')).substr(0,24);
                    // pretty.info(`data read`, { reader: reader.name, card, data });
                    console.log('here', ret)
                    this.emit('card-read', ret);
                } catch (err) {
                    this.emit('error', { error: err, readerName: reader.name });
                }

            });
            reader.on('error', err => {
                this.emit('error', { error: err, readerName: reader.name });
            });
            reader.on('end', () => {
                pretty.info(`device removed`, { reader: reader.name });
                delete readers[readers.indexOf(reader)];
            });
        });

        nfc.on('error', err => {
            this.emit('error', { error: err });
        });

        this.write = async(cardId) => {
            try {
                let reader = readers[0];
                const key = 'FFFFFFFFFFFF';
                const keyType = KEY_TYPE_A;
                const firstBlock = Buffer.allocUnsafe(16);
                firstBlock.write(cardId.substr(0, 16), 'ascii');
                await reader.authenticate(1, keyType, key);
                await reader.write(1, firstBlock);
                const secondBlock = Buffer.allocUnsafe(16);
                secondBlock.write(cardId.substr(16, 8), 'ascii');
                await reader.authenticate(2, keyType, key);
                await reader.write(2, secondBlock);
                return true;
            } catch (err) {
                return err;
            }
        }
    }

}
