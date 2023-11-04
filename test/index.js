/**
 * First tests: testing the server with an emulated client
 * 
 * In those tests different features of the server will be tested.
 * The client will be emulated; we won't use this library, but hand-craft all packages send to
 * the server
 */
import './001-start-server.js';
import './002-start-server-with-path.js';
import './003-start-server-with-auth.js';
import './004-send-data-to-client.js';
import './005-receive-data-from-client.js';

/**
 * Second tests: testing the client with an emulated server
 * 
 * In those tests different features of the client will be tested.
 * Now, the server will be emulated and send handcraft packages to a client.
 */
import './100-start-client.js';
import './101-send-data-to-server.js';
import './102-send-filtered-data-to-server.js';

after(() => process.exit(0));