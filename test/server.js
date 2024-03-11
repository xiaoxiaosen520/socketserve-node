/**
 * 
 */
const ts = require('abv-ts')('abv:node');
const AbvNode = require('../index.js');

const http = require('http') ; 
const port = 8089;

const requestHandler = function(req, res) {  
	console.log(req.url);
	res.end('Abv-node server!');
};

const server = http.createServer(requestHandler);

server.listen(port, function(err) {  
	if (err) return console.log(err);
	console.log('Abv-node is running on port ' + port);
});

let WebSocket = null;

try{
	WebSocket = require('uws');
}catch(e){
	ts.log('Fallback to ws');
	WebSocket = require('ws');
}

const node = new AbvNode(server,WebSocket);
