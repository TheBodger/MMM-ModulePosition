/* global Module, MMM-ModulePosition */

/* Magic Mirror
 * Module: MMM-ModulePosition
 *
 * By Neil Scott
 * MIT Licensed.
 */

var startTime = new Date(); //use for getting elapsed times during debugging
var interactmodules = {};


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

		//TODO - support null canvasid = viewable window
		this.theCanvas = document.getElementById(this.config.canvasid);

		//some working variables that are used during dragging/resizing
		this.currentelement;

		this.timers = {};
		this.timer = null;;

		this.dragging = false;
		this.resizing = false;

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

		//now we search the completed dom module looking for all the divs we need to amend

		for (var module in self.moduletracking) {

			if (!self.moduletracking[module].ignore) {

				var modulediv = document.getElementById(module);

				this.makedraggable(modulediv);
				this.makeresizable(modulediv);

				//and we need to add a couple of events so we can track the mouse over the modules

				modulediv.onmouseover = function () { self.showover() };
				modulediv.onmouseout = function () { self.showout() };

				//if we are cropping add the class to one with cropping on

			}
		}
	},


	//functions to setup the module for dragging and resizing

	makedraggable: function (element) {

		element.classList.add("drag");
		element.addEventListener("mousedown", this.mouseDownListener, false);

		this.setmeta(element, this.getcurrentmeta(element), this.getcurrentmeta(element), { x: 0, y: 0, w: 0, h: 0 });
	
	},

	makeresizable: function (element) {

		element.classList.add("resizable");

		var divtl = document.createElement('div');
		divtl.classList.add("resizer");
		divtl.classList.add("top-left");
		element.appendChild(divtl);

		var divtr = document.createElement('div');
		divtr.classList.add("resizer");
		divtr.classList.add("top-right");
		element.appendChild(divtr);

		var divbl = document.createElement('div');
		divbl.classList.add("resizer");
		divbl.classList.add("bottom-left");
		element.appendChild(divbl);

		var divbr = document.createElement('div');
		divbr.classList.add("resizer");
		divbr.classList.add("bottom-right");
		element.appendChild(divbr);

		divtl.addEventListener("mousedown", this.mouseDownListener, false);
		divtr.addEventListener("mousedown", this.mouseDownListener, false);
		divbl.addEventListener("mousedown", this.mouseDownListener, false);
		divbr.addEventListener("mousedown", this.mouseDownListener, false);

		this.setmeta(element, this.getcurrentmeta(element), this.getcurrentmeta(element), { x: 0, y: 0, w: 0, h: 0 });

	},

	//functions to drag,resize,end drag, resize

	mouseDownListener: function (event) {

		//try and stop a resizer click from bubbling up to the parent and vice versa

		event.stopPropagation();

		var mouse = this.getmouseposition(event);

		var mouseX = mouse.mouseX;
		var mouseY = mouse.mouseY;

		//determine if we are dragging or resizing

		this.dragging = true;	//we found something to drag 
								//this should always be true as the mousedown events are only linked to draggable and re-sizable elements

		//but, if there is an outstanding timer, (about to be orphaned) , don't let the action start
		if (Object.keys(this.timers).length > 0) {
			this.dragging = false;
		}

		if (this.dragging) {

			event.target.removeEventListener("mousedown", this.mouseDownListener, false);

			//determine who we are dealing with

			var element = this.getelement(event.target);
			var parentelement = this.getelement(event.target, true);

			//check if we are actually resizing 

			if (element != parentelement) {
				this.resizing = true;
			}

			if (!this.resizing) {
				document.body.style.cursor = "move";
			};

			//store the current element
			currentelement = element;

			window.addEventListener("mousemove", this.mouseMoveListener, false);
			window.addEventListener("mouseup", this.mouseUpListener, false);

			//store the current mouse position
			this.setmousemeta(element, { x: mouseX, y: mouseY, deltaX: 0, deltaY: 0 });

			//adjust the element target to be same as location (it should be anyway)
			var currentmeta = this.getmeta((this.resizing) ? parentelement : element);
			this.setmeta((this.resizing) ? parentelement : element, currentmeta.current, currentmeta.current, currentmeta.step);

			this.timer = setInterval(this.onTimerTick, 1000 / this.config.interval);
			this.timers[this.timer] = this.timer;

			//code below prevents the mouse down from having an effect on the main browser window:
			if (event.preventDefault) {
				event.preventDefault();
			} //standard
			else if (event.returnValue) {
				event.returnValue = false;
			} //older IE
			return false;
		}
	},

	mouseMoveListener: function(event) {

		//work out the delta of mouse
		//new mouse becomes target
		//after clamping to the canvas

		//because we are moving we stick with the current element and dont try to determine who we are moving over
		//otherwise the mouseover finds another valid element

		var element = currentelement; //was getelement(event.target);

		//resizing works differently to dragging so we have to split the repositioning and clamping

		if (this.resizing) {

			var currentmeta = this.getmeta(element.parentElement);
		}
		else {
			var currentmeta = this.getmeta(element);
		}

		var checkmeta = { target: currentmeta.target };

		//get new mouse position
		var mouse = this.getmouseposition(event);
		var mouseX = mouse.mouseX;
		var mouseY = mouse.mouseY;

		//determine if new target is in bounds
		//test is based on the existing target being adjusted by the delta NOT the current location of the element as that is being ticked
		//we need to take into account that resizing adjusts x or y and h or w as deltaX an deltaY change by creating a temporary new target before testing it
		//delta(x,y) applied to oldtarget (x,y) must be between min(x,y) and max(x,y)
		//otherwise clamp the delta to a value to adhere to the above rule

		//mouse delta, try this first
		var deltaX = mouseX - this.getmousemeta(element).mousemeta.x;
		var deltaY = mouseY - this.getmousemeta(element).mousemeta.y;

		if (this.resizing) {

			//calculate the new element size and centre
			checkmeta.target = this.getresizedelement(element, deltaX, deltaY, true);

		}

		//calculate the bounds based on the new target size 
		var minX = (checkmeta.target.w / 2);
		var maxX = (((this.theCanvas.clientWidth == 0) ? window.innerWidth : this.theCanvas.clientWidth) - (checkmeta.target.w / 2));
		var minY = (checkmeta.target.h / 2);
		var maxY = (((this.theCanvas.clientHeight == 0) ? window.innerHeight : this.theCanvas.clientHeight) - (checkmeta.target.h / 2));

		//check the centre fits within the bounds

		if (this.resizing) {
			//checkmax returns a -value if out of bounds
			//checkmin returns a +value if out of bounds
			var checkmaxX = (maxX - checkmeta.target.x);
			var checkmaxY = (maxY - checkmeta.target.y);
			var checkminX = (minX - checkmeta.target.x);
			var checkminY = (minY - checkmeta.target.y);
		}
		else {

			var checkmaxX = (maxX - (checkmeta.target.x + deltaX));
			var checkmaxY = (maxY - (checkmeta.target.y + deltaY));
			var checkminX = (minX - (checkmeta.target.x + deltaX));
			var checkminY = (minY - (checkmeta.target.y + deltaY));
		}

		//adjust the new mouse position to take into account any out of bounds amounts
		//if any neg max values or pos min values
		mouseX = mouseX + ((checkminX > 0) ? checkminX : 0) + ((checkmaxX < 0) ? checkmaxX : 0);
		mouseY = mouseY + ((checkminY > 0) ? checkminY : 0) + ((checkmaxY < 0) ? checkmaxY : 0);

		//recalculate the mouse delta based on the revised mouse position
		var deltaX = mouseX - this.getmousemeta(element).mousemeta.x;
		var deltaY = mouseY - this.getmousemeta(element).mousemeta.y;

		//store the new mouse location
		this.setmousemeta(element, { x: mouseX, y: mouseY, deltaX: deltaX, deltaY: deltaY });

		if (resizing)
		//store the new target
		{
			currentmeta.target = this.getresizedelement(element, deltaX, deltaY);
			this.setmeta(element.parentElement, currentmeta.current, currentmeta.target, currentmeta.step);
		}
		else {
			//store the new mouse location
			//the target is the current target + the calculated delta, 
			//as the currentX represents some position between originalx and the target, we add the delta to the target
			currentmeta.target.x = (currentmeta.target.x + deltaX);
			currentmeta.target.y = (currentmeta.target.y + deltaY);

			//store the new target
			this.setmeta(element, currentmeta.current, currentmeta.target, currentmeta.step);
		}

	},

	mouseUpListener: function(event) {

		//because we were moving we stick with the current element and dont try to determine who we are moving over
		//otherwise the mouseover finds another valid dragme and attachs the mouse down to the wrong element
		var element = currentelement;

		element.addEventListener("mousedown", this.mouseDownListener, false);
		window.removeEventListener("mouseup", this.mouseUpListener, false);
		if (this.dragging) {
			this.dragging = false;
			if (this.resizing) {
				this.resizing = false;
				currentelement = currentelement.parentElement; // as we loose the resizer indicator, we need to let tick tock know which element to actually ease out
			}
			document.body.style.cursor = "default"
			window.removeEventListener("mousemove", this.mouseMoveListener, false);
		}
	},

	getresizedelement: function (element, deltaX, deltaY, roundvalues = false) {

		var currentmeta = this.getmeta(element.parentElement);
		var tempmeta = currentmeta.target;

		if(element.classList.contains('bottom-right')) {
			const width = currentmeta.target.w + deltaX;
			const height = currentmeta.target.h + deltaY;
			if (width > minimum_size) {
				tempmeta.w = width;
				tempmeta.x = currentmeta.target.x + (deltaX / 2);

			}
			if (height > minimum_size) {
				tempmeta.h = height;
				tempmeta.y = currentmeta.target.y + (deltaY / 2);
			}
		}

		else if (element.classList.contains('bottom-left')) {
			const height = currentmeta.target.h + deltaY;
			const width = currentmeta.target.w - deltaX;
			if (height > minimum_size) {
				tempmeta.h = height;
				tempmeta.y = currentmeta.target.y + (deltaY / 2);
			}
			if (width > minimum_size) {
				tempmeta.w = width;
				tempmeta.x = currentmeta.target.x + (deltaX / 2);
			}
		}

		else if (element.classList.contains('top-right')) {
			const width = currentmeta.target.w + deltaX;
			const height = currentmeta.target.h - deltaY;
			if (width > minimum_size) {
				tempmeta.w = width;
				tempmeta.x = currentmeta.target.x + (deltaX / 2);
			}
			if (height > minimum_size) {
				tempmeta.h = height;
				tempmeta.y = currentmeta.target.y + (deltaY / 2);

			}
		}

		else {//top-left
			const width = currentmeta.target.w - deltaX;
			const height = currentmeta.target.h - deltaY;
			if (width > minimum_size) {
				tempmeta.w = width;
				tempmeta.x = currentmeta.target.x + (deltaX / 2);
			}
			if (height > minimum_size) {
				tempmeta.h = height;
				tempmeta.y = currentmeta.target.y + (deltaY / 2);
			}
		}

		if (roundvalues) {
			tempmeta.w = Math.round(tempmeta.w);
			tempmeta.h = Math.round(tempmeta.h);
			tempmeta.x = Math.round(tempmeta.x);
			tempmeta.y = Math.round(tempmeta.y);
		}

		return tempmeta;

	},

	onTimerTick: function () {

		//get the correct element to action

		var actionelement = (this.resizing) ? currentelement.parentElement : currentelement;

		var currentmeta = this.getmeta(actionelement);

		//calculate the step
		currentmeta.step.x = this.config.easeAmount * (currentmeta.target.x - currentmeta.current.x);
		currentmeta.step.y = this.config.easeAmount * (currentmeta.target.y - currentmeta.current.y);
		currentmeta.step.w = this.config.easeAmount * (currentmeta.target.w - currentmeta.current.w);
		currentmeta.step.h = this.config.easeAmount * (currentmeta.target.h - currentmeta.current.h);

		//adjust the current location
		currentmeta.current.x = currentmeta.current.x + currentmeta.step.x;
		currentmeta.current.y = currentmeta.current.y + currentmeta.step.y;
		currentmeta.current.w = currentmeta.current.w + currentmeta.step.w;
		currentmeta.current.h = currentmeta.current.h + currentmeta.step.h;

		//stop the timer when the target position is reached (close enough)
		if(
			(!this.dragging) &&
				(Math.abs(currentmeta.current.x - currentmeta.target.x) < 0.1) &&
				(Math.abs(currentmeta.current.y - currentmeta.target.y) < 0.1)
				&&
				(Math.abs(currentmeta.current.w - currentmeta.target.w) < 0.1) &&
				(Math.abs(currentmeta.current.h - currentmeta.target.h) < 0.1)
			)
			{
				currentmeta.current.x = currentmeta.target.x;
				currentmeta.current.y = currentmeta.target.y;
				currentmeta.current.w = currentmeta.target.w;
				currentmeta.current.h = currentmeta.target.h;

				//stop timer:

			delete this.timers[this.timer];

			clearInterval(this.timer);
		}

		//save the new location
		this.setmeta(actionelement, currentmeta.current, currentmeta.target, currentmeta.step)

		//move the element
		actionelement.style.top = Math.round(currentmeta.current.y - (currentmeta.current.h / 2)).toString() + 'px';
		actionelement.style.left = Math.round(currentmeta.current.x - (currentmeta.current.w / 2)).toString() + 'px';

		actionelement.style.width = Math.round(currentmeta.current.w).toString() + 'px';
		actionelement.style.height = Math.round(currentmeta.current.h).toString() + 'px';

	},


	//-----------------------------------


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

	// a bunch of helper functions

	setmeta: function (element, current, target, step) {

		element.dataset.meta = JSON.stringify({ current: current, target: target, step: step });

	},

	setmousemeta: function setmousemeta(element, mousemeta) {
		element.dataset.mousemeta = JSON.stringify({ mousemeta: mousemeta });
	},

	getmeta: function (element) {

		return JSON.parse(element.dataset.meta);
		//({ current: current, target: target, step: step });

	},

	getmousemeta: function (element) {

		return JSON.parse(element.dataset.mousemeta);

	},

	getcurrentmeta: function (element) {

		//adjust the x,y to the centre of the element
		//x,y this is its apparent absolute position, taking into account margins etc

		var temp = { x: 0, y: 0, w: 0, h: 0 };

		var trueoffset = getmouseposition({ clientX: element.offsetLeft, clientY: element.offsetTop });

		temp.x = element.offsetLeft + element.getBoundingClientRect().width / 2;
		temp.y = element.offsetTop + element.getBoundingClientRect().height / 2;

		temp.w = element.getBoundingClientRect().width;
		temp.h = element.getBoundingClientRect().height;

	return temp;

	},


	//get the actual element not the resizer
	getelement:function (element, getparent = false) {

		if(element.classList == null) { //must be over the body or elsewhere if this fires
			return currentelement;
		}

		if (element.classList.contains('drag')) {
			return element;
		}

		if (element.classList.contains('resizer')) {  // we manage all movement based on the resizer circles, only redrawing is at parent level
			if (getparent) {
				return element.parentElement;
			}
			else {
				return element;
			}
		}

		//must be over the body or elsewhere

		return currentelement;

	},

	getmouseposition:function (mouseevent) {

		//additional support for a canvas that hasn't yet been populated (like body)
		//it takes a default value of the window

		var defaultheight = window.innerHeight;
		var defaultwidth = window.innerWidth;

		//getting mouse position correctly 
		var bRect = this.theCanvas.getBoundingClientRect();
		mouseX = (mouseevent.clientX - bRect.left) * (((this.theCanvas.clientWidth == 0) ? defaultwidth : this.theCanvas.clientWidth) / ((bRect.width == 0) ? defaultwidth : bRect.width));
		mouseY = (mouseevent.clientY - bRect.top) * (((this.theCanvas.clientHeight == 0) ? defaultheight : this.theCanvas.clientHeight) / ((bRect.height == 0) ? defaultheight : bRect.height));

		return { mouseX: mouseX, mouseY: mouseY };

	},


});

