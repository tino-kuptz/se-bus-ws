import { expect } from 'chai';
import { createServer } from 'http';
import WebSocket from 'ws';

import { emit, on, once } from 'se-bus';

import { bindServer } from '../index.js';
import { testPort, countConnectedClients } from './000-utils.js';

describe('send data to a client', () => {
    var httpServer = null;
    var seBusServer = null;
    var wsClient = null;
    // Will be set to a package every time the client receives smth
    // Needs to be set to "null" before every test emit
    var receivedData = null;

    it('should be able to create a new node http server', () => {
        httpServer = createServer();
    });

    it('should be able to bind se-bus-ws', async () => {
        seBusServer = await bindServer(httpServer);
    });

    it('should be able to register events', () => {
        on('test.on', seBusServer.transfer('test.on'));
        once('test.once', seBusServer.transfer('test.once'));
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
            wsClient.on('message', (data) => {
                data += "";
                console.log('      %s', data);
                receivedData = data.trim();
            });
        });
    });

    it('should have one connected client', async () => {
        expect(countConnectedClients(seBusServer)).to.equal(1);
    });

    it('should receive the "on" event', async () => {
        receivedData = null;
        return new Promise(function(res, rej) {
            emit('test.on', {});

            setTimeout(() => {
                if(receivedData == null) return rej('Did not receive anything.');
                else return res();
            }, 20);
        });
    });

    it('should receive the "once" event', async () => {
        receivedData = null;
        return new Promise(function(res, rej) {
            emit('test.once', {});

            setTimeout(() => {
                if(receivedData == null) return rej('Did not receive anything.');
                else return res();
            }, 20);
        });
    });

    it('should not receive the "once" event a second time', async () => {
        receivedData = null;
        return new Promise(function(res, rej) {
            emit('test.once', {});

            setTimeout(() => {
                if(receivedData != null) return rej('Received the event.');
                else return res();
            }, 20);
        });
    });

    it('should again receive the "on" event', async () => {
        receivedData = null;
        return new Promise(function(res, rej) {
            emit('test.on', {});

            setTimeout(() => {
                if(receivedData == null) return rej('Did not receive anything.');
                else return res();
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