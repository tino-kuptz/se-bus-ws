/**
 * This class handles a single connection from a client to the SEBusServer
 */
import SEBusServer from "./SEBusServer.js";

class SEBusServerClient {
    // UUID of this connection
    connectionUUID = null;

    // Websocker instance
    websocketInstance = null;

    // Initial request of the client
    initialRequest = null;

    // SEBusServer instance this client connected on
    serverInstance = null;

    // If the connection is still open
    // This prevents a deadlock when the connect-Callback of the server did not resolve before the connection closed
    isOpen = true;

    /**
     * Constructor
     * @param {string} connectionUUID
     * @param {websocketConnection} websocketInstance 
     * @param {httpRequest} initialRequest
     */
    constructor(connectionUUID, websocketInstance, initialRequest, serverInstance) {
        this.connectionUUID = connectionUUID;
        this.websocketInstance = websocketInstance;
        this.initialRequest = initialRequest;
        this.serverInstance = serverInstance;
    }

    /**
     * Handle event registration before connect callback
     * @return {Promise}
     */
    async _registerPreConnectEvents() {
        this.websocketInstance.on('error', (e) => {
            // @todo handle the error
            this.isOpen = false;
            this.serverInstance._onClientDisconnect(this);
        });
        this.websocketInstance.on('close', () => {
            this.isOpen = false;
            this.serverInstance._onClientDisconnected(this);
        });
    }


    /**
     * Handle event registrations after connect callback
     * @return {Promise}
     */
    async _registerPostConnectEvents() {
        this.websocketInstance.on('message', (data) => {
            this.serverInstance._onClientData(this, data.toString());
        });
    }

    /**
     * Send data to this client
     * @param {string} eventName
     * @param {object} eventProperties
     * @return {Promise}
     */
    async send(eventName, eventProperties) {
        const theJsonPayload = JSON.stringify({
            'dts': new Date().toISOString(),
            'type': 'event',
            'en': eventName,
            'ed': eventProperties,
        });
        this.websocketInstance.send(theJsonPayload);
    }
}

export default SEBusServerClient;