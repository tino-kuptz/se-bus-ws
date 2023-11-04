import SEBusServer from "../lib/SEBusServer.js";

const countConnectedClients = (server) => {
    return server.connectedClients.length;
};

const testPort = 8080;

export {
    testPort,
    countConnectedClients,
}