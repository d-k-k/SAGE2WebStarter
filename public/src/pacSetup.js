



//---------------------------------------------------------------------------Variable setup
var wsio	= null;

var debug 	= true;
//---------------------------------------------------------------------------Code start



//---------------------------------------------------------------------------functions


/**
Setup of websockets.
 */
function initialize() {

	if(debug){console.log("Initializing client");}


	// Create a connection to server
	wsio = new WebsocketIO();
	if(debug){console.log("Websocket status:" + wsio);}
	wsio.open(function() {
		console.log("Websocket opened");

		setupListeners();

		var clientDescription = {
			clientType: "sageUI",
			requests: {
				config: true,
				version: false,
				time: false,
				console: false
			}
		};
		wsio.emit('addClient', clientDescription);
	});

	wsio.on('close', function (evt) {

	});

	//might want this to create listeners.
	// var sage2UI = document.getElementById('sage2UI');
	// window.addEventListener('drop',     preventDefault, false);
	// sage2UI.addEventListener('drop',      fileDrop,       false);
	// document.addEventListener('keydown',    noBackspace,  false);
} //end initialize






function setupListeners() {
	wsio.on('serverAccepted', function(data) {
		console.log('---Has been accepted by server---');
		console.dir(data);
	});

	wsio.on('serverPingBack', function(data) {
		console.log('Recieved a ping back from the server');
		console.dir(data);
	});


	wsio.on('convertedMd5' , wsConvertedMd5) ;
	wsio.on('configContents' , wsConfigContents) ;

}

function wsConvertedMd5 (data) {
	var resultDiv = document.getElementById('md5result');

	resultDiv.innerHTML = 'Result: ' + data.md5;
}


function wsConfigContents (data) {
	var workingDiv = document.getElementById('confPort');
	workingDiv.value = data.port;
	workingDiv = document.getElementById('confResolutionWidth');
	workingDiv.value = data.rWidth;
	workingDiv = document.getElementById('confResolutionHeight');
	workingDiv.value = data.rHeight;
	workingDiv = document.getElementById('confLayoutRows');
	workingDiv.value = data.lRows;
	workingDiv = document.getElementById('confLayoutColumns');
	workingDiv.value = data.lColumns;
}



