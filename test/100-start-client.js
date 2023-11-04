import { expect } from 'chai';
import { WebSocketServer } from 'ws';

import { bindClient } from '../index.js';
import { testPort } from './000-utils.js';

describe('simple client binding with emulated server', () => {
    var wsInstance = null;

    var seBusClient = null;

    it('should be able to create a new http server', () => {
        wsInstance = new WebSocketServer({ port: testPort });
    });

    it('should be able to create a client', async () => {
        seBusClient = await bindClient("ws://localhost:"+ testPort);
    });

    it('should have a connected client', () => {
        expect(wsInstance.clients.size).to.equal(1);
    });

    after(() => {
        wsInstance.close();
    });
});