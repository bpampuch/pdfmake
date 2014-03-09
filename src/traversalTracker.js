/* jslint node: true */
'use strict';

/**
* Creates an instance of TraversalTracker
*
* @constructor
*/
function TraversalTracker() {
	this.events = {};
}

TraversalTracker.prototype.startTracking = function(event, cb) {
	var callbacks = (this.events[event] || (this.events[event] = []));

	if (callbacks.indexOf(cb) < 0) {
		callbacks.push(cb);
	}
};

TraversalTracker.prototype.stopTracking = function(event, cb) {
	var callbacks = this.events[event];

	if (callbacks) {
		var index = callbacks.indexOf(cb);
		if (index >= 0) {
			callbacks.splice(index, 1);
		}
	}
};

TraversalTracker.prototype.emit = function(event) {
	var args = Array.prototype.slice.call(arguments, 1);

	var callbacks = this.events[event];

	if (callbacks) {
		callbacks.forEach(function(cb) {
			cb.apply(this, args);
		});
	}
};

TraversalTracker.prototype.auto = function(event, cb, innerBlock) {
	this.startTracking(event, cb);
	innerBlock();
	this.stopTracking(event, cb);
};

module.exports = TraversalTracker;
