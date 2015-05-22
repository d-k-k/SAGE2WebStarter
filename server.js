


//---------------------------------------------------------------------------Imports
var http 			= require('http');
var httpServer   	= require('./src/httpServer');
var WebSocketIO		= require('./src/wsio');

//---------------------------------------------------------------------------Variable setup
var hostAddress		= "127.0.0.1";
var hostPort		= 9001;
var httpServerApp	= new httpServer("public");
var mainServer		= null;
var wsioServer		= null;
var clients			= [];

//node.js has a special variable called "global" which is visible throughout the other files.


//---------------------------------------------------------------------------Code start

//create http listener

mainServer = http.createServer( httpServerApp.onrequest ).listen(hostPort);
console.log('Server listening to port:'+hostPort);


//create ws listener
wsioServer = new WebSocketIO.Server( { server: mainServer } );
wsioServer.onconnection(openWebSocketClient);

//create timer counter in global. 
global.timeCounter = 0;

//Test to create something that happens at an interval
setInterval( function () {
		global.timeCounter++;
		console.log(global.timeCounter * 5);
	}
	, 5000);


//---------------------------------------------------------------------------Function definitions


global.printTimeCounter = function printTimeCounter (req) {
	console.log ( "Request at time:" + global.timeCounter );
	//console.log ( req );
}


function openWebSocketClient(wsio) {
	wsio.onclose(closeWebSocketClient);
	wsio.on('addClient', wsAddClient);
}



function closeWebSocketClient(wsio) {
	console.log( ">Disconnect" + wsio.id + " (" + wsio.clientType + " " + wsio.clientID+ ")");

	removeElement(clients, wsio);
} //end closeWebSocketClient


/*
Params
wsio is the websocket that was used.
data is the sent packet, usually in json format.
*/
function wsAddClient(wsio, data) {

	clients.push(wsio);
	setupListeners(wsio);

	wsio.emit('serverAccepted', {} );
}

/*
When receiving a packet of the named type, call the function.
*/
function setupListeners(wsio) {
	
	wsio.on('ping',            wsPing);
	wsio.on('consoleLog',      wsConsoleLog);

} //end setupListeners





//---------------------------------------------------------------------------websocket listener functions


function wsPing(wsio, data) {
	console.log('---wsPing:' + data.time);
	wsio.emit('serverPingBack', data);
} //end class


function wsConsoleLog(wsio, data) {
	console.log('---wsConsoleLog:' + data.comment);
} //end class


//---------------------------------------------------------------------------Utility functions



function removeElement(list, elem) {
	if(list.indexOf(elem) >= 0){
		moveElementToEnd(list, elem);
		list.pop();
	}
}

function moveElementToEnd(list, elem) {
	var i;
	var pos = list.indexOf(elem);
	if(pos < 0) return;
	for(i=pos; i<list.length-1; i++){
		list[i] = list[i+1];
	}
	list[list.length-1] = elem;
}
