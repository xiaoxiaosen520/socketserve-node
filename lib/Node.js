/** 
 * Abvos node
 * thor --amount 1000 --messages 100 sock://localhost:8080/abv
 * https://gitlab.com/abvos/abv-node
 */
"use strict";

const ts = require('abv-ts')('abv:Node');
const fs = require('abv-vfs');
const { SSocket, Pool } = require('abv-socket');

const $port = 8089;
const MAX_SOCKETS = 65536;

class Node
{
	constructor (opt, mode='ws')
	{
		this.id = '~0';//this.SRV;
		this.db = new Pool();
		this.tm = setInterval(this.purge.bind(this), 30000); // 30 sec.

		const me = this;
	//ts.debug(opt);	
		let srv = null, opts = null;

		if (mode === 'ws'){
			let wss = null;

			try{
				wss = require('uws');
			}catch(e){
				ts.log('Fallback to ws');
				wss = require('ws');
			}
			
			if (typeof opt === ts.OBJ){
				opts = {
					verifyClient : (info, done) => {
						const org = info.origin;
						const host = info.req.headers.host;
						if(org && host && (host === org.split('://')[1])) done(true);
						else done(false,404,'Not found');
					},
					path: '/abv',
					server: opt.server
				};
			}else if (typeof opt === 'number'){
				opts = { port:opt };
			}else{
				opts = { port:$port };
			}
			srv = new wss.Server(opts);
		}else{
			srv = require('net').createServer();
			srv.listen($port, '0.0.0.0'); 
		}

		if (srv){
			ts.info('Waiting clients'); 
		
			srv.on('connection', (sock, req) => {
				if (this.db.size > MAX_SOCKETS) 
					return ts.warn('Max clients: ',MAX_SOCKETS);
				
				if (mode === '') sock.send = sock.write; // net socket

				const client = new SSocket(sock, this);
				
				sock.isAlive = true;

				sock.on('pong', () => { sock.isAlive = true; });

				sock.on('message', buf => { client.recv(buf); });

				sock.on('data', buf => { client.recv(buf.toString()); });

				sock.on('close',(c,r) => { 
					ts.debug(81,'close',client.id);
					client.close(); 
				});

				sock.on('error', err => { ts.error(91,err); });
			});
			
			srv.on('error', (err) => { ts.error(94,err); });
		}
	}
	init(){}

	purge()
	{
		const now = Date.now();
		let len = 0;
		for (let it of this.db.values()){
			for (let [k,client] of it.twins.entries()){
				if (!client) client.close('client?');
				else if (!client.sock) client.close('sock?');
				else if (client.sock.isAlive === false) client.close('alive?');
				else{
					len--;
					client.sock.isAlive = false;
					if (!client.sock.ping) continue;
					client.sock.ping('', false, err => { 
						if (err) client.close('ping?'); 
					});
				}
				len++;
			}
		}
		if (len > 0)ts.debug(116,'Purge socks', len, Date.now() - now);
	}
	
	recv(msg)
	{
	}
	
	send(msg, cb)
	{
		cb = typeof cb === ts.FN ? cb : false;
		msg.f = this.id;
		const m = msg.pack();
	
		if (m === null){
			const err = 'null';
			if (cb) return cb(err);
			return ts.error(189,err);
		}

		ts.debug(126,msg.c,msg.f,msg.t,msg.m);
		
		const client = this.db.get(msg.t);

		if (!client) return ts.error(130,msg.t);
		client.sock.send(m, (err) => {
			if (err) ts.error(132,err);
			if (cb) return cb(err);
		});
	}
	
	save(path, data) 
	{ 
		ts.debug(144, path);
	}
	
	pub(pkey)
	{
		return this.db.get(pkey);
	}
}
///

module.exports = Node;
