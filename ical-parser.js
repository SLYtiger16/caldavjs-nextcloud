'use strict';
var async = require("async"),
	Readable = require("stream").Readable,
	readline = require("readline"),
	lineReader,
	stream;

function convert(fileData, logging, callback) {
	if(typeof callback !== "function") {
		throw new Error("iCAL-PARSER: No callback provided. Aborting!!");
		return console.error("No callback provided. Aborting!!");
	}

	if(typeof fileData !== "string") {
		return callback(new Error("iCAL-PARSER: Invalid file data passed. Aborting!!"));
	}

	prepare(fileData, logging, callback);
}

function prepare(fileData, logging, callback) {
	var _obj = {},
		SPACE = " ",
		lines = fileData.split(/\r\n|\n|\r/),
		prevKey = null,
		startKeys = [],
		objArr = [],
		endKeys = [];

	var parseLine = function(line, cb) {
		var keys = line.split(":"),
			isMultiLine = (line[0] === SPACE),
			key = keys[0],
			value = keys[1];

		prevKey = isMultiLine && prevKey || key;
		switch(key) {
			case "BEGIN":
				if(startKeys.length) {
					objArr.push(_obj);
				}
				_obj = {};
				startKeys.push(value);
				break;
			case "END":
				endKeys.push(value);
				break;
			default:
				if(isMultiLine) {
					_obj[prevKey] += line.substring(1);
				} else {
					_obj[key] = value;
				}
		}
		cb();
	};

	async.each(lines, async.ensureAsync(parseLine), function() {
		if(startKeys.length) {
			objArr.push(_obj);
		}
		process(startKeys, endKeys, objArr, logging, callback);
	});
}

function process(startKeys, endKeys, objArr, logging, callback) {
	var result = {},
		len = startKeys.length,
		startIdx = -1,
		i = 0;	

		if (logging) console.log("processing..");
	var iterator = function() {
		return i < len;
	};	

	var iteratee = function(cb) {		
		startIdx = startKeys.indexOf(endKeys[0]);
		if(startIdx > 0) {
			try {
				result = objArr[startIdx - 1];

				if(!result.hasOwnProperty(startKeys[startIdx])) {
					result[startKeys[startIdx]] = [];
				}

				result[startKeys[startIdx]].push(objArr[startIdx]);
				objArr.splice(startIdx, 1);
				objArr[startIdx - 1] = result;
				startKeys.splice(startIdx, 1);
				endKeys.shift();

			} catch(err) {
				cb(err);
			}
		}	
		i++;
		cb(null);			
	};

	var onComplete = function(err) {
		if(err) {
			return callback(err);
		}

		result = {};
		result[startKeys[0]] = [objArr[0]];

		if(objArr.length && objArr[0].VEVENT && objArr[0].VEVENT.length) {
			if (logging) console.info("iCAL-PARSER:", objArr[0].VEVENT.length, "events parsed");
		} else {
			if (logging) console.info("iCAL-PARSER: 0 events found");
		}
		
		return callback(err, result);
	};

	async.whilst(iterator, iteratee, onComplete);	
}

module.exports = {
	convert: convert
}
