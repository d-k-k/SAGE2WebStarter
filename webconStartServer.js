


//---------------------------------------------------------------------------Imports
var http 			= require('http');
var sys				= require('sys');
var path 			= require('path');
var fs 				= require('fs');
var json5        	= require('json5');            // format that allows comments
var exec 			= require('child_process').exec;
var spawn 			= require('child_process').spawn;

var httpServer   	= require('./src/httpServer');
var WebSocketIO		= require('./src/wsio');
var md5				= require('./src/md5');                   // return standard md5 hash of given param
var utils			= require('./src/utils');

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



//testing file read
// var confContents = fs.readFileSync( "config/default-cfg.json", "utf8" );
// console.log("Read file:");
// console.log(confContents);




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
	
	wsio.on('ping',            		wsPing);
	wsio.on('consoleLog',      		wsConsoleLog);
	wsio.on('convertTomd5',      	wsConvertTomd5);
	wsio.on('requestForConfig',     wsRequestForConfig);
	wsio.on('newConfigSettings',    wsNewConfigSettings);


	//should be functions to keep
	wsio.on('giveClientConfiguration',		wsGiveClientConfiguration);
	wsio.on('giveServerConfiguration',		wsGiveServerConfiguration);
	wsio.on('setPassword',					wsSetPassword);
	wsio.on('checkPassword',				wsCheckPassword);
	wsio.on('startSage',					wsStartSage);


} //end setupListeners



function executeConsoleCommand( cmd ) {
	var child;
	child = exec(cmd, function (error, stdout, stderr) {
		sys.print('stdout: ' + stdout);
		sys.print('stderr: ' + stderr);
		if (error !== null) {
			console.log('Command> exec error: ' + error);
		}
	});
}

function executeScriptFile( file ) {

	output = "";

    file = path.normalize(file); // convert Unix notation to windows
    console.log('Launching script ', file);

    var proc = spawn(file, []);

    proc.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
            output = output + data;
    });
    proc.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
    });
    proc.on('exit', function (code) {
        console.log('child process exited with code ' + code);
        //if (socket) socket.emit('return', {status: true, stdout: output});
    });



    console.log("Setting up delayed process kill");

    setTimeout( function(){ proc.kill(); console.log("\nKilling process"); }, 6000);



    return proc;
}


//---------------------------------------------------------------------------websocket listener functions


function wsPing(wsio, data) {
	console.log('---wsPing:' + data.time);
	wsio.emit('serverPingBack', data);
} //end class


function wsConsoleLog(wsio, data) {
	console.log('---wsConsoleLog:' + data.comment);
	//executeConsoleCommand( "echo wsConsoleLog activating executeConsoleCommand" );
	
	//executeConsoleCommand( "open -a TextEdit.app" );

	executeScriptFile( "script/testScript" );
} //end class

function wsConvertTomd5(wsio, data) {
	var conversion = md5.getHash( data.phrase );
	wsio.emit('convertedMd5', { md5: conversion });
} //end class


function wsRequestForConfig(wsio, data) {

	console.log(' Checking file. ');

	var confLocation = "config/default-cfg.json";
	// if( ! utils.fileExists(confLocation) ) { return; }

	console.log(' Reading and sending config file contents. ');


	var confContents = fs.readFileSync( confLocation, "utf8" );
	confContents = json5.parse(confContents);

	var configData = {
		port: confContents.port ,
		rWidth: confContents.resolution.width,
		rHeight: confContents.resolution.height,
		lRows: confContents.layout.rows,
		lColumns: confContents.layout.columns
	}

	wsio.emit( 'configContents', configData );

} //end class


function wsNewConfigSettings(wsio, data) {
	var jsonString = json5.stringify(data);
	var confLocation = "config/default-cfg.json";
	var jsonString = json5.stringify(data);
	var confLocation = "config/default-cfg.json";
	fs.writeFileSync( confLocation, jsonString);
	fs.writeFileSync( confLocation, jsonString);

} //end class



function wsGiveClientConfiguration(wsio, data) {

	var confLocation = "config/default-cfg.json";
	var confContents = fs.readFileSync( confLocation, "utf8" );
	confContents = json5.parse(confContents);

	wsio.emit( 'giveClientConfiguration', confContents );
} //wsGiveClientConfiguration

function wsGiveServerConfiguration(wsio, data) {
	//!!!! ASSUMPTION !!!!
	//the numberical values being sent are already correctly type casted.

	//first grab original configuration
	//reasoning is to maintain fields.
	var confLocation = "config/default-cfg.json";
	var confContents = fs.readFileSync( confLocation, "utf8" );
	confContents = json5.parse(confContents);

	confContents.host = data.host;
	confContents.port = data.port;
	confContents.index_port = data.index_port;
	//confContents.register_site = true;
	confContents.resolution.width = data.resolution.width;
	confContents.resolution.height = data.resolution.height;

	//if the layout changed.
	if(  (confContents.layout.rows != data.layout.rows)  ||  (confContents.layout.columns = data.layout.columns)  ) {
		confContents.layout.rows = data.layout.rows;
		confContents.layout.columns = data.layout.columns;
		
		//diplays loop
		confContents.displays = [];
		var d = {};
		for(var r = 0; r < confContents.layout.rows; r++) {
			for(var c = 0; c < confContents.layout.columns; c++) {
				d.row = r;
				d.column = c;
				confContents.displays.push(d);
			}
		}

	} //end if the layout changed


	confContents.alternate_hosts = data.alternate_hosts; //translation of dependencies.
	confContents.remote_sites = data.remote_sites; 
	if(data.dependencies.ImageMagick != null) { confContents.dependencies.ImageMagick = data.dependencies.ImageMagick;  } 
	if(data.dependencies.FFMpeg != null) { confContents.dependencies.FFMpeg = data.dependencies.FFMpeg;  } 



	confContents = json5.stringify(confContents);
	fs.writeFileSync( confLocation, confContents);


	wsio.emit('configurationSet');

} //wsGiveServerConfiguration

function wsSetPassword(wsio, data) {
	var conversion = md5.getHash( data.password );
	var jsonString = { "pwd": conversion};
	jsonString = json5.stringify(jsonString);
	jsonString = '{ "pwd" : "' + conversion +'" }';
	var pwdFileLocation = "keys/passwd.json";
	console.log('Pasword save double checking:' + jsonString);
	fs.writeFileSync( pwdFileLocation, jsonString);

	wsio.emit('passwordSet');
} //wsSetPassword


function wsCheckPassword(wsio, data) {
	var conversion = md5.getHash( data.password );



	var pwdFileLocation = "keys/passwd.json";
	var jsonString;
	if( utils.fileExists(pwdFileLocation) ) {
		jsonString = fs.readFileSync( pwdFileLocation, "utf8" );
		jsonString = json5.parse(jsonString);
	}
	else {  jsonString = { pwd: -1 };  }

	console.log();
	console.log('process version?' + process.version + "   and type of" + typeof process.version);
	console.log('Checking ' + data.password + ' which has a hash of');
	console.log(conversion + ' against ');
	console.log( jsonString.pwd );



	if( jsonString.pwd === conversion) { wsio.emit('passwordCheckResult', { result: true } ); }
	else { wsio.emit('passwordCheckResult', { result: false } ); }


} //wsCheckPassword

function wsStartSage(wsio, data) {
	console.log();
	console.log();
	console.log('Attempting to start sage');
	executeConsoleCommand('node server.js');
	console.log('Should have started sage');
	console.log();
	console.log();
}


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
