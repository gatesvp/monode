/* Requires */
var fs = require('fs');
var util = require('util');
var bson = require('./bson/bson').BSON;
var objectid = require('./bson/objectid').ObjectID;
var net = require('net');
var constants = require('./constants').constants;
var queryHandler = require('./queryHandler');
var insertHandler = require('./insertHandler');

var serverStats = { queries: 0, inserts: 0, updates: 0, deletes: 0 };
var port = process.env.PORT ? process.env.PORT : constants.DEFAULT_PORT;

/* Lame this should clearly be part of the base library... version? */
Buffer.prototype.writeInt64LE = function(value, offset){
  this[offset] = value & 0xff;
  this[offset+1] = (value >> 8) & 0xff;
  this[offset+2] = (value >> 16) & 0xff;
  this[offset+3] = (value >> 24) & 0xff;
  this[offset+4] = (value >> 32) & 0xff;
  this[offset+5] = (value >> 40) & 0xff;
  this[offset+6] = (value >> 48) & 0xff;
  this[offset+7] = (value >> 56) & 0xff;
}

var connection_id = 0; // global connection_id

var socketHandler = function(socket) {

  var my_connection_id = connection_id++;
  socket.lastErrors = { }; // instantiate a holder for the "getLastError" on this socket
  
  socket.setTimeout(30*1000);

  socket.on('close', function() { socket.closed = true; closeConnection(my_connection_id); });
  socket.on('end', function() { socket.closed = true; endConnection(my_connection_id); });
  socket.on('data', function(data) { 
    dataHandler(socket, data, socketWriter); 
  });
  socket.on('timeout', function() { socket.destroy(); });
  socket.on('error', function(err) { console.log("Error on connection " + my_connection_id + ": " + err); })

  console.log("connection %s accepted: %s:%s", my_connection_id, socket.remoteAddress, socket.remotePort);
  
/**
 * Core router for the incoming data
 * */
var dataHandler = function(socket, data, socketWriterCallback){

  console.log("Data received: " + data.length);

  var header = { messageLength:0, requestID:0, responseTo:0, opCode:0 };

  header.messageLength = data.readInt32LE(0, false);
  header.requestID = data.readInt32LE(4, false);
  header.responseTo = data.readInt32LE(8, false);
  header.opCode = data.readInt32LE(12, false);

  console.log("Header: " + JSON.stringify(header));

  var response = "";

  if(header.opCode == constants.OP_QUERY){
    serverStats.queries++;
    queryHandler.handle(socket, header, data.slice(16), socketWriterCallback);
  }
  else if(header.opCode == constants.OP_INSERT){
    serverStats.inserts++;
    insertHandler.handle(socket, header, data.slice(16), socketWriterCallback);
  } 
  else if(header.opCode == constants.OP_MSG){
	console.log(data.slice(16));
    commandHandler.handle(socket, header, data.slice(16), sockeetWriterCallback);
  }
  //console.log(bson.deserialize(response));
  //socketWriterCallback(response);

};

  /**
   * Handler for a connection closed by the server
   **/
  var closeConnection = function(connID) {
    var currentTime = new Date();
    console.log(currentTime.getHours()+":"+currentTime.getMinutes()+":"+currentTime.getSeconds()+" : closed connection " + connID );
  };

  /**
   * Handler for a connection closed by the user
   **/
  var endConnection = function(connID) {
    var currentTime = new Date();
    console.log(currentTime.getHours()+":"+currentTime.getMinutes()+":"+currentTime.getSeconds()+" : client ended connection " + connID );
  };

  /**
   * Handler for writing the response
   **/
  var socketWriter = function(response) { 
    if(!socket.closed){
      socket.write(response, 'utf8', dataWritten);
	}
  }

  /**
   * Handler for a response written back to the socket
   **/
  var dataWritten = function() {
    var currentTime = new Date();
    //console.log(currentTime.getHours()+":"+currentTime.getMinutes()+":"+currentTime.getSeconds()+" : data written");
  }
  
};

/**
 * Handler for when the socket is ready for listening
 **/
var listeningHandler = function() { 
  console.log("now listening %s:%s", server.address().address, server.address().port); 
} 

// Configure the actual server and run it.
var server = net.createServer({allowHalfOpen:true});
server.on('connection', socketHandler);
server.on('listening', listeningHandler);
server.listen(port);

