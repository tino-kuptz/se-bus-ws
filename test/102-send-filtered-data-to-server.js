import { expect } from 'chai';
import { WebSocketServer } from 'ws';

import { on, once, emit } from 'se-bus';

import { bindClient } from '../index.js';
import { testPort } from './000-utils.js';

describe('sending data from client to emulated server while filtering', () => {
    var wsInstance = null;

    var seBusClient = null;

    var receivedData = null;

    var listenCBs = [];

    it('should be able to create a new http server', () => {
        wsInstance = new WebSocketServer({ port: testPort });
    });

    it('should listen for messages on the server', () => {
        wsInstance.on('connection', (ws) => {
            ws.on('message', (data) => {
                data += "";
                console.log('      %s', data);
                receivedData = data.trim();
            });
        })
    });

    it('should be able to create a client', async () => {
        seBusClient = await bindClient("ws://localhost:" + testPort);
    });

    it('should have a connected client', () => {
        expect(wsInstance.clients.size).to.equal(1);
    });

    it('should register client filter events', () => {
        listenCBs.push(on('client.ftest.on', seBusClient.transfer('client.ftest.on', (eventName, eventData) => {
            return eventData.test === true;
        })));
        listenCBs.push(once('client.ftest.once', seBusClient.transfer('client.ftest.once', (eventName, eventData) => {
            return eventData.test === true;
        })));
    });

    it('should get valid "on"-data on the server', () => {
        receivedData = null;
        return new Promise((res, rej) => {
            emit('client.ftest.on', { test: true });

            setTimeout(() => {
                if(receivedData == null) return rej('No data received');
                else return res();
            }, 20);
        });
    });

    it('should not get invalid "on"-data on the server', () => {
        receivedData = null;
        return new Promise((res, rej) => {
            emit('client.ftest.on', { test: false });

            setTimeout(() => {
                if(receivedData == null) return res();
                else return rej('data received');
            }, 20);
        });
    });

    it('should get the "once"-data on the server', () => {
        receivedData = null;
        return new Promise((res, rej) => {
            emit('client.ftest.once', { test: true });

            setTimeout(() => {
                if(receivedData == null) return rej('No data received');
                else return res();
            }, 20);
        });
    });

    it('should not get the "once"-data a second time on the server', () => {
        receivedData = null;
        return new Promise((res, rej) => {
            emit('client.ftest.once', { test: true });

            setTimeout(() => {
                if(receivedData != null) return rej('Data received');
                else return res();
            }, 20);
        });
    });

    after(() => {
        wsInstance.close();
        listenCBs.forEach((s) => s.unregister());
    });
});