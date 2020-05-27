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
		grid: 10, //the size of a grid to snap modules to when dragging and resizing which is enabled within the running MM2
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
			'smoothpositioning.3.4.js'
		]
	},

	getStyles: function () {
		return [
			'MMM-ModulePosition.3.4.css'
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
			self.moduletracking[module.identifier]['modpos'] = { x: 0, y: 0, w: 0, h: 0 };
		});

		//share the global variables from the config
		//must be done before setting up the modules

		smoothpositioninginit(this.config);

		//now we search the completed dom module looking for all the divs we need to amend

		for (var module in self.moduletracking) {

			if (!self.moduletracking[module].ignore) {

				var modulediv = document.getElementById(module);

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

		setgrid(event.currentTarget.id, getmeta(event.currentTarget).current);
	},

	showout: function () {

		setgrid('No Selected Module', { x: 0, y: 0, w: 0, h: 0 });

	},

	isduplicatemodule: function (modulename) {
		var isit = false;
		for (identifier in this.moduletracking) {
			isit = (this.moduletracking[identifier].name == modulename);
			if (isit) {
				this.moduletracking[identifier].duplicate = true;  //set the one in moduletracking that is now a duplicate.
				return isit;
			}
		}

		return isit;

	},

	getDom: function () {

		var self = this;

		this.wrapper = document.createElement("div");
		this.wrapper.className = "currentmodulemeta";
		this.wrapper.id = "currentmodulemeta";
		this.wrapper.style.position = 'absolute'
		this.wrapper.style.left = '100px';
		this.wrapper.style.top = '100px';

		//add the save button

		this.savebutton = document.createElement("button");
		this.savebutton.className = 'save-button glass';
		this.savebutton.id = 'save-button';
		this.savebutton.innerHTML = "Save Positions";

		//add the grid toggle

		this.gridtoggle = document.createElement("label");
		this.gridtoggle.className = "switch";
		this.gridtoggle.id = "gridtoggle";
		this.gridtoggle.innerHTML = '<input id="s1" type="checkbox" checked onchange="togglegrid()">< span class="slider round"></span>';

		//add the current item meta display

		this.modulemeta = document.createElement('div');
		this.modulemeta.className = "metagrid";

		this.modulemetaname = document.createElement('div');
		this.modulemetaname.className = "metagridname";
		this.modulemetaname.id = "metagridname";
		this.modulemetaname.innerHTML = "Module Name";

		this.modulemetax = document.createElement('div');
		this.modulemetax.className = "metagridx";
		this.modulemetax.id = "metagridx";
		this.modulemetax.innerHTML = "X:";

		this.modulemetay = document.createElement('div');
		this.modulemetay.className = "metagridy";
		this.modulemetay.id = "metagridy";
		this.modulemetay.innerHTML = "Y:";

		this.modulemetaw = document.createElement('div');
		this.modulemetaw.className = "metagridw";
		this.modulemetaw.id = "metagridw";
		this.modulemetaw.innerHTML = "W:";

		this.modulemetah = document.createElement('div');
		this.modulemetah.className = "metagridh";
		this.modulemetah.id = "metagridh";
		this.modulemetah.innerHTML = "H:";

		this.modulemeta.appendChild(this.modulemetaname);
		this.modulemeta.appendChild(this.modulemetax);
		this.modulemeta.appendChild(this.modulemetaw);
		this.modulemeta.appendChild(this.modulemetay);
		this.modulemeta.appendChild(this.modulemetah);

		this.wrapper.appendChild(this.savebutton);
		this.wrapper.appendChild(this.gridtoggle);
		this.wrapper.appendChild(this.modulemeta);
		
		if (this.savebutton.addEventListener) {
			this.savebutton.addEventListener('click', function () {
				self.saveFunction();
			});
		} else if (this.savebutton.attachEvent) {
			this.savebutton.attachEvent('onclick', function () {
				self.saveFunction();
			});
		}

		return this.wrapper;
	},

	saveFunction: function() {

		//get all the modules current positions

		for (var module in this.moduletracking){
			if (!this.moduletracking[module].ignore) {
				var element = document.getElementById(module);
				var modposcurrent = getmeta(element).current;
				var modposoriginal = getmeta(element).original;
				var modposcssoffset = getcss(element);

				//calculate the modpos that will work when we apply absolute positioning to the element in the custom.css
				//all calcs are at the top left and not middle
				//delta is the difference between the initial location and the final location
				//the offset is the difference between pre and post absolute positioning

				//var deltax = modposoriginal.x -  modposcurrent.x  ;
				//var deltay = modposoriginal.y -  modposcurrent.y  ;

				this.moduletracking[module].modpos.x = (modposcurrent.x - (modposcurrent.w / 2)) + modposcssoffset.offsetX;
				this.moduletracking[module].modpos.y = (modposcurrent.y - (modposcurrent.h / 2)) + modposcssoffset.offsetY;

				this.moduletracking[module].modpos.w = modposcurrent.w;
				this.moduletracking[module].modpos.h = modposcurrent.h;

				this.moduletracking[module]['state'] = getstate(element);
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

