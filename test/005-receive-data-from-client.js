import { expect } from 'chai';
import { createServer } from 'http';
import WebSocket from 'ws';

import { once } from 'se-bus';

import { bindServer } from '../index.js';
import { testPort, countConnectedClients } from './000-utils.js';

describe('receive data from a client', () => {
    var httpServer = null;
    var seBusServer = null;
    var wsClient = null;

    it('should be able to create a new node http server', () => {
        httpServer = createServer();
    });

    it('should be able to bind se-bus-ws', async () => {
        seBusServer = await bindServer(httpServer);
    });

    it('should be able to register events', () => {
        seBusServer.listen('client.event');
        seBusServer.listen('client.conditional.event', (eventName, eventData) => {
            return eventData.test == true;
        });
    });

    it('should be able to start the http server', async () => {
        return new Promise((res, rej) => {
            httpServer.listen(testPort, (err) => {
                if (err) return rej(err);
                else return res();
            });
        });
    });

    it('should be able to connect to the server', async () => {
        wsClient = new WebSocket('ws://localhost:' + testPort + '/');
        var isResolved = false;
        return new Promise((res, rej) => {
            wsClient.on('error', (err) => {
                if (isResolved) return;
                isResolved = true;
                return rej(err);
            });
            wsClient.on('open', () => {
                if (isResolved) return;
                isResolved = true;
                return res();
            });
        });
    });

    it('should have one connected client', async () => {
        expect(countConnectedClients(seBusServer)).to.equal(1);
    });

    it('should be able to get the event on the server', async () => {
        return new Promise(function (res, rej) {
            var hasEmitted = false;

            const eventInstance = once('client.event', function (data) {
                if (hasEmitted) return;
                hasEmitted = true;
                return res();
            });

            wsClient.send(JSON.stringify({ "dts": "2000-01-01T12:00:00.000Z", "type": "event", "en": "client.event", "ed": {} }))

            setTimeout(() => {
                if (hasEmitted) return;
                hasEmitted = true;
                eventInstance.unregister();
                return rej('did not receive the event');
            }, 20);
        });
    });

    it('should be able to get the conditional event on the server', async () => {
        return new Promise(function (res, rej) {
            var hasEmitted = false;

            const eventInstance = once('client.conditional.event', function (data) {
                if (hasEmitted) return;
                hasEmitted = true;
                return res();
            });

            wsClient.send(JSON.stringify({ "dts": "2000-01-01T12:00:00.000Z", "type": "event", "en": "client.conditional.event", "ed": { test: true } }))

            setTimeout(() => {
                if (hasEmitted) return;
                hasEmitted = true;
                eventInstance.unregister();
                return rej('did not receive the event');
            }, 20);
        });
    });

    it('should not be able to get the conditional event on the server', async () => {
        return new Promise(function (res, rej) {
            var hasEmitted = false;

            const eventInstance = once('client.conditional.event', function (data) {
                if (hasEmitted) return;
                hasEmitted = true;
                return rej('Event passed`somehow');
            });

            // See the "test: false" at the end; we definied earlier, that test needs to be true
            wsClient.send(JSON.stringify({ "dts": "2000-01-01T12:00:00.000Z", "type": "event", "en": "client.conditional.event", "ed": { test: false } }))

            setTimeout(() => {
                if (hasEmitted) return;
                hasEmitted = true;
                eventInstance.unregister();
                return res();
            }, 20);
        });
    });

    it('should be able to disconnect', async () => {
        var isResolved = false;
        return new Promise((res, rej) => {
            wsClient.close();
            wsClient.on('error', (err) => {
                if (isResolved) return;
                isResolved = true;
                return rej(err);
            });
            wsClient.on('close', () => {
                if (isResolved) return;
                isResolved = true;
                return res();
            });
        });
    });

    after(() => {
        httpServer.closeAllConnections();
        httpServer.close();
    })
});