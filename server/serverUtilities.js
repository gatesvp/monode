

exports.GenerateResponseForHeaderAndBson = function(opHeader, responseBson) {
  // Figure out the buffer size and then instantiate it.
  opHeader.header.messageLength = (16 + 20 + responseBson.length); // reply header + op header + serialized documents
  var serializedResponse = new Buffer(opHeader.header.messageLength);

  // Populate response buffer with header data
  serializedResponse.writeInt32LE(opHeader.header.messageLength, 0);
  serializedResponse.writeInt32LE(opHeader.header.requestID, 4);
  serializedResponse.writeInt32LE(opHeader.header.responseTo, 8);
  serializedResponse.writeInt32LE(opHeader.header.opCode, 12);
  serializedResponse.writeInt32LE(opHeader.responseFlags, 16);
  serializedResponse.writeInt64LE(opHeader.cursorID, 20);
  serializedResponse.writeInt32LE(opHeader.startingFrom, 28);
  serializedResponse.writeInt32LE(opHeader.numberReturned, 32);

  if(responseBson.length > 0){
    // Populate response buffer with command data.
    responseBson.copy(serializedResponse, 36, 0);
  }

  //console.log("Response length %s", serializedResponse.length);
  return serializedResponse;
}