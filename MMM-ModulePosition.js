/* global Module, MMM-ModulePosition */

/* Magic Mirror
 * Module: MMM-ModulePosition
 *
 * By Neil Scott
 * MIT Licensed.
 */

var startTime = new Date(); //use for getting elapsed times during debugging
var interactmodules = {};
var theCanvas;
var currentelement;

Module.register("MMM-ModulePosition", {

	// Default module config.
	// WARNING - added 2 layers of config, so make sure you have a display and an article section as parents to the settings
	//in config.js

	defaults: {
		text: "... loading",
		easeAmount : 0.30, // percentage of delta to step
		FPS: 15 ,// frames per second
		minimum_size: 50, //minimum size in px that the resizer will  go down to
		canvasid:"body", //the overall parent for all movement constraints, any named DOM element, or if null a canvas is created from the visible window
	},

	start: function () {

		Log.log(this.name + ' is started!');

		var self = this;

		this.sendNotificationToNodeHelper("CONFIG", { moduleinstance: this.identifier, config: this.config });

		this.sendNotificationToNodeHelper("STATUS", this.identifier);

		this.moduletracking = {};

		this.interval = 1000 / this.config.FPS; //how long each frame lasts for

		//some working variables that are used during dragging/resizing

		this.timers = {};
		this.timer = null;;

		this.dragging = false;
		this.resizing = false;

		var self = this;

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

		if (notification == 'DOM_OBJECTS_CREATED') {

			// start amending the current DOM to add the drag and resize Class

			this.setupconfig();

		}

	},

	socketNotificationReceived: function (notification, payload) {
		var self = this;
		Log.log(self.identifier + " " + this.identifier + "hello, received a socket notification @ " + this.showElapsed() + " " + notification + " - Payload: " + payload);

	},

	setupconfig: function () {

		//get all the modules
		//set up instances based on the identifier
		//make explicit where the entry is within the config array of modules so 
		//if multpiple entries of the same type are found we can track this and where we write back into the 
		//copy of the config

		//need a tracking list called moduletracking of modules based on the module identifier
		//use position to determine if we ignore it when setting up the classes on the divs
		//name is the MMM- or defaults type of module

		//{identifier:{index:index in modules array,duplicate:false,ignore:false,name:'',modpos:{modpos}}}

		var self = this;

		MM.getModules().forEach(function (module, index) {
			self.moduletracking[module.identifier] = {};
			self.moduletracking[module.identifier]['index'] = index;
			self.moduletracking[module.identifier]['ignore'] = (module.name == self.name || module.data.position == null || module.data.position == 'fullscreen_above' || module.data.position == 'fullscreen_below');
			self.moduletracking[module.identifier]['duplicate'] = self.isduplicatemodule(module.name);
			self.moduletracking[module.identifier]['name'] = module.name; // add after check for duplicate
			self.moduletracking[module.identifier]['modpos'] = { modpos: { x: 0, y: 0, w: 0, h: 0 } };;
		});

		//TODO - support null canvasid = viewable window
		if (this.config.canvasid.toLowerCase() == 'body') {
			theCanvas = document.body;
		}
		else {
			theCanvas = document.getElementById(this.config.canvasid);
		}

		//now we search the completed dom module looking for all the divs we need to amend

		for (var module in self.moduletracking) {

			if (!self.moduletracking[module].ignore) {

				var modulediv = document.getElementById(module);

				makedraggable(modulediv);
				makeresizable(modulediv);

				//and we need to add a couple of events so we can track the mouse over the modules

				modulediv.onmouseover = function () { self.showover() };
				modulediv.onmouseout = function () { self.showout() };

				//if we are cropping add the class to one with cropping on

			}
		}

	},

	


	showover: function () {

		this.savebutton.innerText = "Over";

	},
	showout: function () {

		this.savebutton.innerText = "Out";

	},

	isduplicatemodule: function (modulename) {
		var isit = false;
		for (identifier in this.moduletracking) {
			isit = (this.moduletracking[identifier].name == modulename);
			if (isit) { return isit; }
		}

		return isit;

	},

	getDom: function () {

		var self = this;
		var wrapper = document.createElement("div");
		wrapper.classname = "currentmodulemeta";
		wrapper.id = "currentmodulemeta";
		this.savebutton = document.createElement("a");
		this.savebutton.className = 'save-button glass';
		this.savebutton.id = 'save-button';
		this.savebutton.href = '#';
		this.savebutton.onclick =  function() { self.saveFunction() };

		wrapper.appendChild(this.savebutton);

		return wrapper;
	},

	saveFunction: function() {

		console.log("saving config");
		console.log(document.getElementById('save-button').innerText);
		console.log(this.moduletracking);
		console.log(interactmodules);


	//we want to save a revised config with the new modpos values
	//as opposed to using CSS ?? 
	//it is more flexible (if modpos exists, use them to setup the position of the class/module name)
	//though CSS might be a good way to do it initially 
	//so
	//can we read the custom.css to merge the new details as a module css entry 
	//or overwrite an existing one

	//here we will need to write the file out useing the nodehelper
	// custom.css.timestamp
	// config.js.timestamp

},

	sendNotificationToNodeHelper: function (notification, payload) {
		this.sendSocketNotification(notification, payload);
	},

	
});

