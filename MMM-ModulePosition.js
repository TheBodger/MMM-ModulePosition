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
		canvasid: "body", //the overall parent for all movement constraints, any named DOM element, or if null a canvas is created from the visible window
		useproxydiv:true, //encapsulate all the choosen divs contents in a proxy div that will be used for positioning/ overcomes the transitioning style used by MM2
	},

	start: function () {

		Log.log(this.name + ' is started!');

		var self = this;

		this.sendNotificationToNodeHelper("CONFIG", { moduleinstance: this.identifier, config: this.config });

		this.sendNotificationToNodeHelper("STATUS", this.identifier);

		this.moduletracking = {};

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
			'smoothpositioning.3.2.js'
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

		//share the global variables from the config
		//must be done before setting up the modules

		smoothpositioninginit(this.config);

		//now we search the completed dom module looking for all the divs we need to amend

		for (var module in self.moduletracking) {

			if (!self.moduletracking[module].ignore) {

				var modulediv = document.getElementById(module);

				if (self.config.useproxydiv) {
					//get the actual divs details move to a proxy and then use the proxy instead for movement and tracking

					//var proxydiv = document.createElement('div');
		
					//var cloned = modulediv.cloneNode(true);
					//proxydiv.innerHTML = cloned.innerHTML;

					//modulediv.innerHTML = '';
					//modulediv.appendChild(proxydiv);

					//modulediv = proxydiv;
				}

				makedraggable(modulediv);
				makeresizable(modulediv);

				//and we need to add a couple of events so we can track the mouse over the modules

				modulediv.onmouseover = function () { self.showover(event) };
				modulediv.onmouseout = function () { self.showout(event) };

				//if we are cropping add the class to one with cropping on

			}
		}

	},

	showover: function (event) {

		this.savebutton.innerText = event.currentTarget.id;

	},
	showout: function () {

		this.savebutton.innerText = "";

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
		wrapper.style.position = 'absolute'
		wrapper.style.left = '100px';
		wrapper.style.top = '100px';

		this.savebutton = document.createElement("a");
		this.savebutton.className = 'save-button glass';
		this.savebutton.id = 'save-button';
		this.savebutton.href = '#';
		this.savebutton.style.position = 'absolute'

		if (this.savebutton.addEventListener) {
			this.savebutton.addEventListener('click', function () {
				self.saveFunction();
			});
		} else if (this.savebutton.attachEvent) {
			this.savebutton.attachEvent('onclick', function () {
				self.saveFunction();
			});
		}

		wrapper.appendChild(this.savebutton);

		return wrapper;
	},

	saveFunction: function() {

		//get all the modules current positions

		for (var module in this.moduletracking){
			if (!this.moduletracking[module].ignore) {
				this.moduletracking[module].modpos = getmeta(document.getElementById(module)).current;
				this.moduletracking[module]['state'] = getstate(document.getElementById(module));
			};
		}

		//send them to the nodehelper to write out 

		this.sendNotificationToNodeHelper("WRITE_THIS", { moduleinstance: this.identifier, payload: this.moduletracking });

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

