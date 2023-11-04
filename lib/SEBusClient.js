/**
 * This class handles a client connecting to the server
 */

import WebSocket from 'ws';

import { emit } from 'se-bus';

class SEBusClient {
    // Websocket URL of the se-bus-ws server
    serverURL = "";

    // Websocket instance
    wsInstance = null;

    // Accepted events from this connection
    acceptedEvents = [];

    /**
     * Constructor
     * @param {string} url
     */
    constructor(url) {
        this.serverURL = url;
    }

    /**
     * Connects to the remote server
     * @returns {Promise}
     */
    async connect() {
        this.wsInstance = new WebSocket(this.serverURL);
        var isResolved = false;
        return new Promise((res, rej) => {
            this.wsInstance.on('error', (err) => {
                if (isResolved) return;
                isResolved = true;
                return rej(err);
            });
            this.wsInstance.on('open', () => {
                if (isResolved) return;
                isResolved = true;
                return res();
            });
            this.wsInstance.on('message', (data) => {
                this._handleMessage(data);
            });
        });
    }

    /**
     * Will be called as soon as the client receives a message from the server
     * @param {string} message
     * @returns {Promise}
     */
    async _handleMessage(message) {
        try {
            message = JSON.parse(message);
        } catch (e) {
            // @todo
            return;
        }
        if (typeof message.en != "string" || message.en.length == 0) return;
        if (typeof message.ed == "undefined") message.ed = {};

        var isAccepted = false;
        for (var i = 0; i < this.acceptedEvents.length; i++) {
            if (this.acceptedEvents[i].name != message.en) continue;
            if (this.acceptedEvents[i].cb != null)
                isAccepted = await this.acceptedEvents[i].cb(message.en, message.ed);
            else
                isAccepted = true;
            if (!isAccepted) continue;
            emit(message.en, message.ed);
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
        if (typeof callback == "undefined") callback = null;

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


        return async (eventProperties) => {
            var shouldBeSend = true;
            if (eventCallback != null) {
                try {
                    shouldBeSend = await eventCallback(eventName, eventProperties);
                } catch (e) { shouldBeSend = false; }
            }
            if (!shouldBeSend) return;
            this.wsInstance.send(JSON.stringify({
                'dts': new Date().toISOString(),
                'type': 'event',
                'en': eventName,
                'ed': eventProperties,
            }));
        };
    }
}

export default SEBusClient;