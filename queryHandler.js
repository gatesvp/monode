var bson = require('./bson/bson').BSON;
var net = require('net');
var constants = require('./constants').constants;

exports.queryHandler = function(socket, header, data){

  // First four bytes of query are the flags
  var flags = data.readInt32LE(0, false);

  // Next is a null-terminated collection name
  var fullCollectionName = "";
  for(i = 3; i++; i < data.length) {
    if(data[i] == 0) { break; }
    fullCollectionName += String.fromCharCode(data[i]);
  }
  i++; // skip the null

  // Next we read the Skip, Limit and Actual data
  var numberToSkip = data.readInt32LE(i, false);
  var numberToLimit = data.readInt32LE(i+4, false);
  var message_data = bson.deserialize(data.slice(i+8));

  // Log these
  console.log("  Query: Flags: %s - NS: %s - Skip: %s - Limit %s", flags, fullCollectionName, numberToSkip, numberToLimit);
  console.log("  Message: %s", JSON.stringify(message_data));

  // Handle individual responses here, should result in a BSON resopnse
  if(message_data["_isSelf"] == 1){
    var obj = {"id": new objectid(), "ok": 1};
    response_bson = bson.serialize(obj);
  }
  else if(message_data["whatsmyuri"] == 1){
    var obj = {"you": socket.remoteAddress +":"+ socket.remotePort, "ok": 1};
    response_bson = bson.serialize(obj);
  }
  else if(message_data["ismaster"] == 1){
    var obj = { "ismaster" : true, "maxBsonObjectSize" : 16777216, "ok" : 1 }
    response_bson = bson.serialize([obj]);
  }
  else if(message_data["getlasterror"] == 1){
    var obj = { "ok" : 1, "err" : null }
    response_bson = bson.serialize([obj]);
  }

  // Create an op header containing a reply header
  // These are intermediary objects and may be removed later
  var replyHeader = { requestID: header.requestID, responseTo: header.requestID, opCode: 1 };
  var opHeader = { header: replyHeader , responseFlags:4, cursorID:0, startingFrom:0, numberReturned:1 };

  // Figure out the buffer size and then instantiate it.
  replyHeader.messageLength = (16 + 20 + response_bson.length); // reply header + op header + serialized documents

  var serialized_response = new Buffer(replyHeader.messageLength);

  // Populate response buffer with header data
  serialized_response.writeInt32LE(replyHeader.messageLength,0);
  serialized_response.writeInt32LE(replyHeader.requestID, 4);
  serialized_response.writeInt32LE(replyHeader.responseTo, 8);
  serialized_response.writeInt32LE(replyHeader.opCode, 12);
  serialized_response.writeInt32LE(opHeader.responseFlags, 16);
  serialized_response.writeInt64LE(opHeader.cursorID, 20);
  serialized_response.writeInt32LE(opHeader.startingFrom, 28);
  serialized_response.writeInt32LE(opHeader.numberReturned, 32);

  // Populate response buffer with command data.
  response_bson.copy(serialized_response, 36, 0);

  console.log("Response length %s", serialized_response.length);

  return serialized_response;
}

