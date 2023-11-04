/**
 * This is the server dropin for se-bus
 * It can bind on a node.js http(s)-server instance and registeres itself as websocket receiver
 */

import { WebSocketServer } from 'ws';
import { parse } from 'url';
import crypto from 'crypto';

import { emit } from 'se-bus';

import SEBusServerClient from './SEBusServerClient.js';

class SEBusServer {
    // Wrapper for the server instance
    httpServer = null;

    // Wrapper for ws
    wsInstance = null;

    // Connected clients
    connectedClients = [];

    // Accepted events from clients
    acceptedEvents = [];

    // Callbacks
    on = {
        connect: null,
        disconnect: null
    };

    /**
     * Constructor of this class.
     * Needs to be passed an server instance where it'll bind on
     * @param {HttpServer} httpServer
     */
    constructor(httpServer) {
        this.httpServer = httpServer;
    }

    /**
     * Setup the websocket server
     * When using NULL or UNDEFINED as path se-bus-ws will receive all websocket requests on the server
     * When you want se-bus-ws to listen to specific paths only pass the path with a trailing slash
     * as argument
     * @param {string} path The path
     * @returns {Promise}
     */
    async setupServer(path) {
        if (typeof path == "undefined" || path == null) {
            this.wsInstance = new WebSocketServer({server: this.httpServer});
            await this._registerEvents();
            return;
        }
        // Argument validation
        if (typeof path != "string")
            throw new Error('Expected parameter path to be string, ' + (typeof path) + ' given');
        if (path.length == 0 || path.substring(0, 1) != '/')
            throw new Error('Parameter path needs to start with a \'/\'');

        // Setup server, listen on upgrade requests, and validate if they match our path
        const wsInstance = new WebSocketServer({ noServer: true });
        this.wsInstance = wsInstance;
        this.httpServer.on('upgrade', (request, socket, head) => {
            // Will be called when a client tries to upgrade. Validating if the path matches or se-bus-ws path
            const { pathname } = parse(request.url);
            if (pathname != path) return;
            // It does. Let ws handle the upgrade and emit the new connection
            wsInstance.handleUpgrade(request, socket, head, (ws) => {
                wsInstance.emit('connection', ws, request);
            });
        });
        await this._registerEvents();
    }

    /**
     * Registeres events required for se-bus-ws to work
     * Will be called in setupServer()
     * @returns {Promise}
     */
    async _registerEvents() {
        this.wsInstance.on('connection', (websocketInstance, initialRequest) => {
            const thisConnectionUUID = crypto.randomUUID();
            const thisClientInstance = new SEBusServerClient(thisConnectionUUID, websocketInstance, initialRequest, this);
            this._onClientConnected(thisClientInstance);
        });
    }

    /**
     * Will be called once a client connects to the event bus server
     * @param {SEBusServerClient} seBusClient
     */
    async _onClientConnected(seBusClient) {
        await seBusClient._registerPreConnectEvents();

        var isAllowedToConnect = true;
        if(this.on.connect != null) {
            try {
                isAllowedToConnect = await this.on.connect(seBusClient);
            } catch(e) {
                isAllowedToConnect = false;
            }
        }
        
        if (!isAllowedToConnect) {
            seBusClient.websocketInstance.close();
            setTimeout(() => {
                try {
                    seBusClient.websocketInstance.terminate();
                } catch(e) { }
                try {
                    seBusClient.initialRequest.socket.close();
                } catch(e) { }
            }, 250);
            return;
        }

        await seBusClient._registerPostConnectEvents();
        this.connectedClients.push(seBusClient);
    }

    /**
     * On client disconnect
     * @param {SEBusServerClient} seBusClient
     */
    async _onClientDisconnected(seBusClient) {
        // Callback; if defined
        if (this.on.disconnect != null) await this.on.disconnect(seBusClient);

        // Remove that client from our connected client list
        for (var i = 0; i < this.connectedClients.length; i++) {
            if (this.connectedClients[i].connectionUUID != seBusClient.connectionUUID) continue;
            this.connectedClients.splice(i, 1);
            break;
        }
    }

    /**
     * On client send data
     * @param {SEBusServerClient} seBusClient
     * @param {string} data
     */
    async _onClientData(seBusClient, data) {
        var jsonParsedData = null;
        try {
            jsonParsedData = JSON.parse(data);
        } catch (e) {
            // @todo not json data
            console.log(e);
            return;
        }
        const eventName = typeof jsonParsedData.en == "string" ? jsonParsedData.en : null;
        const eventData = typeof jsonParsedData.ed != "undefined" ? jsonParsedData.ed : {};
        if (eventName == null) {
            // @todo invalid package
            return;
        }
        
        var isAccepted = false;
        for(var i = 0; i < this.acceptedEvents.length; i++) {
            if(this.acceptedEvents[i].name != eventName) continue;
            if(this.acceptedEvents[i].cb != null)
                try {
                    isAccepted = await this.acceptedEvents[i].cb(eventName, eventData, seBusClient);
                } catch(e) { isAccepted = false; }
            else
                isAccepted = true;
            if(!isAccepted) continue;
            emit(eventName, eventData);
            break;
        }
    }

    /**
     * Allow an event to be emitted locally through the server
     * If no callback is 
     * @param {string} eventName
     * @param {function?} callback
     */
    listen(eventName, callback) {
        if(typeof callback == "undefined") callback = null;

        this.acceptedEvents.push({
            name: eventName,
            cb: callback
        });
    }

    /**
     * Create a function that can be used by se-bus to transfer events
     * @param {string} eventName the name of the event to be transfered
     * @param {function?} eventCallback in order to filter the event
     * @returns {function}
     */
    transfer(eventName, eventCallback) {
        if (typeof eventCallback != "function")
            eventCallback = null;

        var that = this;
        return async function (eventParameters) {
            for (var i = 0; i < that.connectedClients.length; i++) {
                (async function (theClient) {
                    const shouldBeSend = eventCallback != null ? await eventCallback(eventName, eventParameters, theClient) : true;
                    if (!shouldBeSend) return;
                    that.connectedClients[i].send(eventName, eventParameters);
                })(that.connectedClients[i]);
            }
        }
    }
}

export default SEBusServer;