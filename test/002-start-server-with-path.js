import { expect } from 'chai';
import { createServer } from 'http';
import WebSocket from 'ws';

import { bindServer } from '../index.js';
import { testPort, countConnectedClients } from './000-utils.js';

describe('startup and simple connection handling of server with specific path', () => {
    var httpServer = null;
    var seBusServer = null;
    var wsClient = null;
    
    it('should be able to create a new node http server', () => {
        httpServer = createServer();
    });

    it('should be able to bind se-bus-ws', async () => {
        seBusServer = await bindServer(httpServer, '/test');
    });

    it('should be able to start the http server', async () => {
        return new Promise((res, rej) => {
            httpServer.listen(testPort, (err) => {
                if(err) return rej(err);
                else return res();
            });
        });
    });

    it('should have 0 connected clients', () => {
        expect(countConnectedClients(seBusServer)).to.equal(0);
    });
    
    it('should not be able to connect to the server because of a wrong path', async () => {
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
                return rej('should not have worked');
            });
            // Timeout - as we won't respond to the upgrade request
            // and our unit test only allows tests for up to 2000ms
            setTimeout(() => {
                if (isResolved) return;
                isResolved = true;
                if (wsClient.readyState != WebSocket.OPEN) return res();
                else return rej('websocket connection was still connecting');
            }, 25);
        });
    });

    it('should still have no connected clients', async () => {
        expect(countConnectedClients(seBusServer)).to.equal(0);
    });
    
    it('should be able to connect to the server with the correct path', async () => {
        wsClient = new WebSocket('ws://localhost:' + testPort + '/test');
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

    it('should now have one client', async () => {
        expect(countConnectedClients(seBusServer)).to.equal(1);
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
    
    it('should have 0 connected clients again', async () => {
        expect(countConnectedClients(seBusServer)).to.equal(0);
    });

    after(() => {
        httpServer.closeAllConnections();
        httpServer.close();
    })
});