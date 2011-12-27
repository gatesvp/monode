/* Requires */
var fs = require('fs');
var util = require('util');
var bson = require('./bson/bson').BSON;
var objectid = require('./bson/objectid').ObjectID;
var net = require('net');
var constants = require('./constants').constants;

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

var connection_id = 0;

dataHandler = function(socket, data){

  console.log("Data received: " + data.length);

  var header = { messageLength:0, requestID:0, responseTo:0, opCode:0 };

  header.messageLength = data.readInt32LE(0, false);
  header.requestID = data.readInt32LE(4, false);;
  header.responseTo = data.readInt32LE(8, false);;
  header.opCode = data.readInt32LE(12, false);

  console.log("Header: " + JSON.stringify(header));

  var response = "";

  if(header.opCode == constants.OP_QUERY){
    response = require('./queryHandler').queryHandler(socket, header, data.slice(16));
  }
  else if(header.opCode == constants.OP_INSERT){
    response = require('./insertHandler').insertHandler(socket, header, data.slice(16));
  } 
  //console.log(bson.deserialize(response));

  return response;

};

closeConnection = function(connID) {
  var currentTime = new Date();
  console.log(currentTime.getHours()+":"+currentTime.getMinutes()+":"+currentTime.getSeconds()+" : closed connection " + connID );
}

endConnection = function(connID) {
  var currentTime = new Date();
  console.log(currentTime.getHours()+":"+currentTime.getMinutes()+":"+currentTime.getSeconds()+" : client ended connection " + connID );
}

dataWritten = function() {
  var currentTime = new Date();
  //console.log(currentTime.getHours()+":"+currentTime.getMinutes()+":"+currentTime.getSeconds()+" : data written");
}

var connection_id = 0; // global connection_id
socketHandler = function(socket) {

  var my_connection_id = connection_id++;

  socket.setTimeout(30*1000);

  socket.on('close', function() { closeConnection(my_connection_id); });
  socket.on('end', function() { endConnection(my_connection_id); });
  socket.on('data', function(data) { 
    socket.write(dataHandler(socket, data), 'utf8', dataWritten); 
  });
  socket.on('timeout', function() { socket.destroy(); });

  console.log("connection %s accepted: %s:%s", my_connection_id, socket.remoteAddress, socket.remotePort);
  
};

// Configure the actual server and run it.
var server = net.createServer({allowHalfOpen:true});
server.on('connection', socketHandler);
server.on('listening', function() { console.log("now listening %s:%s", server.address().address, server.address().port); } );
server.listen(27017);



