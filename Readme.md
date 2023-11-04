# se-bus-ws
Dropin bridge for [se-bus](https://www.npmjs.com/package/se-bus) to pass events events from server to client and vice versa.

## Usage (server)
This dropin needs to be bond on a http(s)Server.  
It does not need to use it's own instance/port. It can also be bond on subdirectories.

### Binding
When working with express or similar this should look familiar.  
You just need to create a simple httpServer and bind se-bus-ws to it.
```js
// Imports
import { bindServer } from 'se-bus-ws';
import { createServer } from 'http';

(async () => {
    // Setup a http server
    const httpServer = createServer();
    const seBusServer = await bindServer(httpServer);

    // setup events to be passed here

    // start http server
    server.listen(8080);
})();
```
When using se-bus-ws this way, all UPGRADE-requests are catched by se-bus-ws.

#### Bind to a specific subpath only
If you use multiple websocket-servers, it's possible to bind se-bus-ws to specific paths only.  
This can be done by adding a path to `bindServer` as second parameter.
```js
// Imports
import { bindServer } from 'se-bus-ws';
import { createServer } from 'http';

(async () => {
    // Setup a http server
    const httpServer = createServer();
    const seBusServer = await bindServer(httpServer, '/event-bus');

    // setup events to be passed here

    // start http server
    server.listen(8080);
})();
```

## Passing events from server to client
Events that should be passed from the server to the client needs to be registered.
This will be done via `se-bus` and the just created server insance
```js
import { on, once, emit } from 'se-bus';

// [see above for imports and how to creating the httpServer]
const seBusServer = await bindServer(httpServer, '/event-bus');

// Bind an event to the seBusServer.
// The parameter of "transfer", file.created, will be the name of the event the clients will receive.
// You could rename it, e.g. to "server.file.created" - so clients will know that this event was created from the server
on('file.created', seBusServer.transfer('file.created'));
//on('file.created', seBusServer.transfer('server.file.created'));

// You can also decide to broadcase an event only once to the clients.
once('server.restart', seBusServer.transfer('server.restart'));
// The first time server.restart will be emitted then will be broadcastet to all clients; afterwards clients won't receive that event anymore

// Emitting events to the clients is now identical to emitting in server side only
emit('file.created', { name: "test.txt" })

// [see above on how to start the server]
```

### Filtering events to be passed to the client
You can also filter events to be passed to clients afterwards. Let's say you only want to pass the event `file.created` to clients in the local subnet (ip starts with `10.0.0.`)
```js
import { on, emit } from 'se-bus';

// [see above for imports and how to creating the httpServer]
const seBusServer = await bindServer(httpServer, '/event-bus');

// Bind an event to the seBusServer
on('file.created', seBusServer.transfer('file.created', async (eventName, eventParameters, seBusClient) => {
    // if(eventParameters.name != 'test.txt') return false;
    const startsWithIP = '10.0.0.';
    const theClientIP = seBusClient.initialRequest.socket.remoteAddress;
    if(theClientIP.length < startsWithIP.length) return false;
    if(theClientIP.substr(0, startsWithIP.length) != startsWithIP) return false;
    return true;
}));

// This event will now only be emitted to clients that have their ip-adress start with "10.0.0."
emit('file.created', { name: "test.txt" })

// [see above on how to start the server]
```

## Receiving events from a client on a server side
In order to allow clients to send events to the server they need to be authenticated. They always are, by default, see below on how to change this behaviour.  
You also need to allow specific events to be broadcasted:
```js
// [see above for imports and how to creating the httpServer]
const seBusServer = await bindServer(httpServer, '/event-bus');

// Allow clients at this seBusServerInstance to broadcast the event "client.event.name" to the server
seBusServer.listen('client.event.name');

on('client.event.name', (data) => {
    // This event can now also be triggered by clients
});

// [see above on how to start the server]
```

Due to clients being considered as untrusted it might be useful to filter events before allowing them to get broadcastet on the server.
In oder to allow this you can pass a callback as second parameter:
```js
// [see above for imports and how to creating the httpServer]
const seBusServer = await bindServer(httpServer, '/event-bus');

// Allow clients at this seBusServerInstance to broadcast the event "client.event.name" to the server
seBusServer.listen('client.event.name', async (eventName, eventData, seBusClient) => {
    // eventName as parameter might seem a little bit stupid right now, but
    // might be interesting in case se-bus-ws will ever support wildcard events.
    if(typeof eventData.test != true) return false;
    return true;
});

on('client.event.name', (data) => {
    // This event can now also be triggered by clients, as long as
    // data.test is set to true
});

// [see above on how to start the server]
```



## Authentification
You can add your own auth handler in order to allow or disallow connections made to your server.  
Please be aware that the authentification will be handled after the websocket upgrade; but in most cases this shouldn't matter.
```js
// [see above...]
const seBusServer = await bindServer(httpServer, '/event-bus');

seBusServer.on.connect = async (seBusClient) => {
    // Here you may return true or false in order to allow or disallow the connection
    // For example to only allow connections from localhost:
    return seBusClient.initialRequest.socket.remoteAddress == '127.0.0.1';
};

// start http server
server.listen(8080);
```
In case you set `on.connect`, the client will not receive any events or is able to send any event before that function returns true.  
The socket is still kept alive meanwhile.