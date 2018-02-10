'use strict';

class TraversalTracker {
	constructor() {
		this.events = {};
	}

	startTracking(event, callback) {
		var callbacks = this.events[event] || (this.events[event] = []);

		if (callbacks.indexOf(callback) < 0) {
			callbacks.push(callback);
		}
	}

	stopTracking(event, callback) {
		var callbacks = this.events[event];

		if (!callbacks) {
			return;
		}

		var index = callbacks.indexOf(callback);
		if (index >= 0) {
			callbacks.splice(index, 1);
		}
	}

	emit(event) {
		var args = Array.prototype.slice.call(arguments, 1);
		var callbacks = this.events[event];

		if (!callbacks) {
			return;
		}

		callbacks.forEach(function (callback) {
			callback.apply(this, args);
		});
	}

	auto(event, callback, innerFunction) {
		this.startTracking(event, callback);
		innerFunction();
		this.stopTracking(event, callback);
	}
}

module.exports = TraversalTracker;
