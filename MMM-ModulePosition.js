/* global Module, MMM-ModulePosition */

/* Magic Mirror
 * Module: MMM-ModulePosition
 *
 * By Neil Scott
 * MIT Licensed.
 */

var startTime = new Date(); //use for getting elapsed times during debugging

Module.register("MMM-ModulePosition", {

	// Default module config.
	// WARNING - added 2 layers of config, so make sure you have a display and an article section as parents to the settings
	//in config.js

	defaults: {
		text: "... loading",
		id: null, // the unique id of this consumer.ie MMCD1
	},

	start: function () {

		Log.log(this.name + ' is started!');

		var self = this;

		this.sendNotificationToNodeHelper("CONFIG", { moduleinstance: this.identifier, config: this.config });

		this.sendNotificationToNodeHelper("STATUS", this.identifier);

	},

	showElapsed: function () {
		endTime = new Date();
		var timeDiff = endTime - startTime; //in ms
		// strip the ms
		timeDiff /= 1000;

		// get seconds 
		var seconds = Math.round(timeDiff);
		return (" " + seconds + " seconds");
	},

	getScripts: function () {
		return [
			'moment.js',
			'https://cdnjs.cloudflare.com/ajax/libs/interact.js/1.2.8/interact.min.js',
			'configscripts.js',
			'interactscripts.js',
		]
	},

	getStyles: function () {
		return [
			'MMM-ModulePosition.css'
		]
	},

	notificationReceived: function (notification, payload, sender) {

		var self = this;

		if (sender) {
			Log.log(self.identifier + " " + this.name + " received a module notification: " + notification + " from sender: " + sender.name);
		} else {
			Log.log(self.identifier + " " + this.name + " received a system notification: " + notification);
		}

		if (notification == 'ALL_MODULES_STARTED') {

			// start amending the current DOM to add the drag and resize Class

			this.addclass();

		}

	},

	socketNotificationReceived: function (notification, payload) {
		var self = this;
		Log.log(self.identifier + " " + this.identifier + "hello, received a socket notification @ " + this.showElapsed() + " " + notification + " - Payload: " + payload);

	},

	addclass: function () {

		//get all the modules

		var allmodules = MM.getModules();

    },

	getDom: function () {
		//only define the wrapper once as the chart will do the business
		//inside it

		var wrapper = document.createElement("div");
		wrapper.classname = "currentmodulemeta";
		wrapper.id = "currentmodulemeta";
		wrapper.innerHTML = '<a id="save-button" class="save-button glass" href="#" onclick="saveFunction()">Save </a>';

		return wrapper;
	},

	sendNotificationToNodeHelper: function (notification, payload) {
		this.sendSocketNotification(notification, payload);
	},

});

