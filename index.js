var SEBusServer = null;
var SEBusClient = null;

/**
 * Bind se-bus-ws to an httpServer or httpsServer instance
 * That instance needs to be manually configured using http.createServer / https.createServer
 * @param {httpServer} httpServerInstance 
 * @param {string} pathname
 * @returns {Promise<SEBusServer>}
 */
const bindServer = async (httpServerInstance, pathname) => {
    if (SEBusServer === null) {
        SEBusServer = await import('./lib/SEBusServer.js');
        SEBusServer = SEBusServer.default;
    }

    const seBusServer = new SEBusServer(httpServerInstance);
    await seBusServer.setupServer(pathname);
    return seBusServer;
}

/**
 * Connects to a se-bus-ws server in order to send/receive events from it
 * @param {string} wsURI
 * @returns {Promise<SEBusClient>}
 */
const bindClient = async (wsURI) => {
    if (SEBusClient === null) {
        SEBusClient = await import('./lib/SEBusClient.js');
        SEBusClient = SEBusClient.default;
    }

    const seBusClient = new SEBusClient(wsURI);
    await seBusClient.connect();
    return seBusClient;
};

export {
    bindServer,
    bindClient,
}