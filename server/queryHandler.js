var bson = require('./bson/bson').BSON;
var net = require('net');
var constants = require('./constants').constants;
var serverUtilities = require('./serverUtilities');

exports.handle = function(socket, header, data, socketWriterCallback){

  // First four bytes of query are the flags
  var flags = data.readInt32LE(0, false);

  // Next is a null-terminated collection name
  var fullCollectionName = "";
  for(var i = 3; i++; i < data.length) {
    if(data[i] === 0) { break; }
    fullCollectionName += String.fromCharCode(data[i]);
  }
  i++; // skip the null

  // Next we read the Skip, Limit and Actual data
  var numberToSkip = data.readInt32LE(i, false);
  var numberToLimit = data.readInt32LE(i+4, false);
  var messageData = bson.deserialize(data.slice(i+8));

  // Log these
  console.log("  Query: Flags: %s - NS: %s - Skip: %s - Limit %s", flags, fullCollectionName, numberToSkip, numberToLimit);
  console.log("  Message: %s", JSON.stringify(messageData));

  // Create an op header containing a reply header
  // These are intermediary objects and may be removed later
  var replyHeader = { requestID: header.requestID, responseTo: header.requestID, opCode: 1 };
  var opHeader = { header: replyHeader , responseFlags:4, cursorID:0, startingFrom:0, numberReturned:1 };
  var responseBson;
  
  // Handle individual responses here, should result in a BSON resopnse
  if(messageData._isSelf === 1){
    var obj = {"id": new objectid(), "ok": 1};
    responseBson = bson.serialize(obj);
  }
  else if(messageData.whatsmyuri === 1){
    var obj = {"you": socket.remoteAddress +":"+ socket.remotePort, "ok": 1};
    responseBson = bson.serialize(obj);
  }
  else if(messageData.ismaster === 1){
    var obj = { "ismaster" : true, "maxBsonObjectSize" : 16777216, "ok" : 1 }
    responseBson = bson.serialize([obj]);
  }
  else if(messageData.getlasterror === 1){
    if(socket.lastErrors[header.requestID]){
      console.log("GETLASTERROR %s", socket.lastErrors[header.requestID]);
      responseBson = bson.serialize(socket.lastErrors[header.requestID]);
    }
    else {
      // The last error has not been updated, let's listen for an update.
      socket.once("lastErrorUpdated", function(data){
        var responseBson = bson.serialize(data);
        socketWriterCallback(serverUtilities.GenerateResponseForHeaderAndBson(opHeader, responseBson));
      });
    }
  }

  if(responseBson) {
    socketWriterCallback(serverUtilities.GenerateResponseForHeaderAndBson(opHeader, responseBson));
  }
}