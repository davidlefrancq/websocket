const WebSocket = require('ws');

var wsConnection;
var wsTries = 5;
var timeout = 1000;
var wsSessionID;
const rpcUrl = "wss://rpc-mumbai.maticvigil.com/ws/v1";
const rpcKey = "";

initWS(rpcKey); //pass the read key.

function initWS(key){
    console.log('tries', wsTries);
    if (wsTries <= 0){
        console.error('unable to estabilish WS after 5 tries!');
        wsConnection = null;
        wsTries = 5;
        wsSessionID = null;
        return;
    }
    wsConnection = new WebSocket(rpcUrl);
    wsConnection.onopen = function () {
        wsConnection.send(JSON.stringify({
            'command': 'register',
            'key': key
        }));
    };

    // Log errors
    wsConnection.onerror = function (error) {
        wsTries--;
        console.error('WebSocket Error ', error);
    };

    // Log messages from the server
    wsConnection.onmessage = function (d) {
        try {
            var data = JSON.parse(d.data);
            if (data.command){
                if (data.command == 'register:nack'){
                    console.error('bad auth from WS');
                    closeWS();
                }
                if (data.command == 'register:ack'){
                    wsSessionID = data.sessionID;
                    console.log('got sessionID', wsSessionID);
                    heartbeat();
                }
                return;
            }
            if (data.type){
                if (data.type == 'event'){
                    console.log('event', data);
                    //now do something with the event.
                } else {
                    console.log('tx', data);
                    //now do something with the tx data.
                }
                return;
            }
            console.warn('got unrecognized json data', data);
        }
        catch (e){
            console.error('got non json data', d.data, e);
        }
    };
    wsConnection.onclose = function(e){
        console.error('websocket error', e);
        if (e.code != 1000){
            closeWS();
        } else {
            setTimeout(function(){
                initWS(key);
            }, timeout);
        }
    };
}

function closeWS(){
    if (wsConnection){
        console.log('closing ws');
        wsSessionID = null;
        wsConnection.onclose = function(){
            wsConnection = null;
        };
        wsConnection.close();
    }
}

function heartbeat() {
    if (!wsSessionID || !wsConnection || wsConnection.readyState !== 1){
        return;
    }
    wsConnection.send(JSON.stringify({
        command: "heartbeat",
        sessionID: wsSessionID
    }));
    setTimeout(heartbeat, 30000);
}
