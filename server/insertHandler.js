var fs = require('fs');
var bson = require('./bson/bson').BSON;
var net = require('net');
var constants = require('./constants').constants;
var serverUtilities = require('./serverUtilities');
var objectid = require('./bson/objectid').ObjectID;
var path = require('path');
var mkdirp = require('mkdirp');

exports.handle = function(socket, header, data, socketWriterCallback){

  // First four bytes of query are the flags
  // TODO ContinueOnError (0) flag.
  var flags = data.readInt32LE(0, false);

  // Next is a null-terminated collection name
  var fullCollectionName = "";
  for(var i = 3; i++; i < data.length) {
    if(data[i] === 0) { break; }
    fullCollectionName += String.fromCharCode(data[i]);
  }
  i++; // skip the null;

  // Deserialize the actual data to store
  var message_data = bson.deserialize(data.slice(i));

  console.log("  Query: Flags: %s - NS: %s", flags, fullCollectionName);
  console.log("  Message:" + JSON.stringify(message_data));

  var ns = fullCollectionName.split('.');
  var dbName = ns[0];
  delete ns[0];
  var collectionName = ns.join('');

  console.log("  DB: %s - Collection %s", dbName, collectionName);

  var collectionPath = "data/" + dbName + "/" + collectionName;

  mkdirp(collectionPath, 0777, function(err) {
    if(err) { console.log("Failed to create path" + collectionPath); }
    else {
      console.log("path "+collectionPath+" exists");

      // note that the write is async
      _writeData(socket, header, collectionPath, message_data);

      // Create an op header containing a reply header
      // These are intermediary objects and may be removed later
      var replyHeader = { requestID: header.requestID, responseTo: header.requestID, opCode: constants.OP_REPLY };
      var opHeader = { header: replyHeader , responseFlags:4, cursorID:0, startingFrom:0, numberReturned:1 };

      var serialized_response = serverUtilities.GenerateResponseForHeaderAndBson(opHeader, "");

      socketWriterCallback(serialized_response);
    }
  });
}

var _writeData = function(socket, header, collectionPath, message_data){

  // Ensure that an ID is defined (or create one)
  if(!message_data._id) { message_data._id = new objectid(); }

  var file_name = collectionPath + "/" + message_data._id + ".js";
  var binary_data = bson.serialize(message_data);

  fs.writeFile(file_name, binary_data, 'UTF-8', function(err){
    var lastError = { n: 1, ok: false, err: null };
    
    if(err) {
      lastError = { n: 0, ok: false, err: err };
	  }

    // Write the last error on the socket and then emit an update
    socket.lastErrors[header.requestID] = lastError;
    socket.emit("lastErrorUpdated", lastError);

  });
};
