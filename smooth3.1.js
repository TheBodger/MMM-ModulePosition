// JavaScript source code

//each element carries 3 sets of information:
//1) where am i (x,y,w,h) (current/also obtainable from the element itself)
//2) where am i going (x,y,w,h) (target)
//3) how do i get there (xstep,ystep,wstep,hstep) the value towards target controlled by the easing %

// 0 - all locations held in the element relate to its centre, so need to be adjusted for showing
// 1 - initialise all elements with current,target and steps
// 2 - add the resizing stuff to the element, and make it absolute
// 3 - listen for mousedown on an element and reset the details for the element(or parent)
// 4 - listen for mousedown on an elements resizer (how do we know ? ask the parent) ditto
// 5 - start timer, tell the world we are dragging, do some javascript stuff and set window level event listeners for move and up
// 6 - and may be add a mouse out for the canvas to capture when some one goes awol
// 7 - on each mouse move, update the target, recalc the steps from the current using easing %
// 8 - the timer simply draws where we are based on current + step and adjusts current
// 9 - on mouseup we stop dragging and let the timer take the element to its target, one step at a time

//global variables

var easeAmount = 0.30 // percentage of delta to step
var FPS = 15 // frames per second

var interval = 1000 / FPS //how long each frame lasts for

var minimum_size = 50;

var theCanvas = document.getElementById("canvas");


//testing variables

var bounddiv = document.createElement("div");
bounddiv.id = "bound";
bounddiv.style.borderColor = "red";
bounddiv.style.borderWidth = "1px";
bounddiv.style.borderStyle = "solid";
bounddiv.style.visibility = "hidden"
bounddiv.style.position = "absolute"

var xydiv = document.createElement("div");
xydiv.id = "xy";
xydiv.style.visibility = "hidden"
xydiv.style.position = "absolute"
xydiv.style.backgroundColor = "green"
xydiv.style.width = "5px"
xydiv.style.height = "5px"
theCanvas.appendChild(bounddiv);
theCanvas.appendChild(xydiv);


var currentelement;

var timers = {};

var dragging = false;
var resizing = false;

function setmeta(element, current, target, step) {

element.dataset.meta = JSON.stringify({ current: current, target: target, step: step });
	
}

function setmousemeta(element, mousemeta) {
element.dataset.mousemeta = JSON.stringify({ mousemeta: mousemeta });
}

function getmeta(element) {

return JSON.parse(element.dataset.meta);
//({ current: current, target: target, step: step });

}

function getmousemeta(element) {

return JSON.parse(element.dataset.mousemeta);

}

function getcurrentmeta(element) {


//adjust the x,y to the centre of the element
//x,y this is its apparent absolute position, taking into account margins etc

var temp = { x: 0, y: 0, w: 0, h: 0 };

var trueoffset = getmouseposition({ clientX: element.offsetLeft, clientY: element.offsetTop });

temp.x = element.offsetLeft + element.getBoundingClientRect().width / 2;
temp.y = element.offsetTop  + element.getBoundingClientRect().height / 2;

temp.w = element.getBoundingClientRect().width;
temp.h = element.getBoundingClientRect().height;

return  temp;

}

function makedraggable(element) {

	element.classList.add("dragme");
	element.addEventListener("mousedown", mouseDownListener, false);

	setmeta(element, getcurrentmeta(element), getcurrentmeta(element), {x:0,y:0,w:0,h:0});
	
}

function makeresizable(element) {

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

	divtl.addEventListener("mousedown", mouseDownListener, false);
	divtr.addEventListener("mousedown", mouseDownListener, false);
	divbl.addEventListener("mousedown", mouseDownListener, false);
	divbr.addEventListener("mousedown", mouseDownListener, false);

	setmeta(element, getcurrentmeta(element), getcurrentmeta(element), { x: 0, y: 0, w: 0, h: 0 });

}

//get the actual element not the resizer
function getelement(element,getparent=false) {

	if (element.classList == null) { //must be over the body or elsewhere if this fires
		return currentelement;
	}

	if (element.classList.contains('dragme')) {
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

}

function getmouseposition(mouseevent) {

	//additional support for a canvas that hasn't yet been populated (like body)
	//it takes a default value of the window

	var defaultheight = window.innerHeight;
	var defaultwidth = window.innerWidth;

	//getting mouse position correctly 
	var bRect = theCanvas.getBoundingClientRect();
	mouseX = (mouseevent.clientX - bRect.left) * (((theCanvas.clientWidth == 0) ? defaultwidth : theCanvas.clientWidth)  / ((bRect.width == 0) ? defaultwidth : bRect.width) );
	mouseY = (mouseevent.clientY - bRect.top) * (((theCanvas.clientHeight == 0) ? defaultheight : theCanvas.clientHeight) / ((bRect.height == 0) ? defaultheight : bRect.height));

	return { mouseX: mouseX, mouseY: mouseY };

}

//mousedown supports both resize and draggable
//theCanvas is whatever element is used to constrain the action

function mouseDownListener(event) {

	//try and stop a resizer click from bubbling up to the parent and vice versa

	event.stopPropagation();

	var mouse = getmouseposition(event);

	var mouseX = mouse.mouseX;
	var mouseY = mouse.mouseY;

	//determine if we are dragging or resizing

	dragging = true; //we found something to drag //this should always be true as the mousedown events are only linked to draggable and re-sizable elements

	//but, if there is an outstanding timer, (about to be orphaned) , don't let the action start

	if (Object.keys(timers).length > 0) {
		dragging = false;
	}

	if (dragging) {

		event.target.removeEventListener("mousedown", mouseDownListener, false);

		//determine who we are dealing with

		var element = getelement(event.target);
		var parentelement = getelement(event.target, true);

		//check if we are actually resizing 

		if (element != parentelement) {
			resizing = true;
        }

		if (!resizing) {
			document.body.style.cursor = "move";
		};

		//store the current element
		currentelement = element;

		window.addEventListener("mousemove", mouseMoveListener, false);
		window.addEventListener("mouseup", mouseUpListener, false);

		//store the current mouse position
		setmousemeta(element, { x: mouseX, y: mouseY, deltaX: 0, deltaY: 0 });

		//adjust the element target to be same as location (it should be anyway)
		var currentmeta = getmeta((resizing) ? parentelement : element);
		setmeta((resizing) ? parentelement :element, currentmeta.current, currentmeta.current, currentmeta.step);

		timer = setInterval(onTimerTick, 1000 / interval);
		timers[timer]=timer;

		//code below prevents the mouse down from having an effect on the main browser window:
		if (event.preventDefault) {
			event.preventDefault();
		} //standard
		else if (event.returnValue) {
			event.returnValue = false;
		} //older IE
		return false;
	}
}

function mouseMoveListener(event) {

	//work out the delta of mouse
	//new mouse becomes target
	//after clamping to the canvas

	//because we are moving we stick with the current element and dont try to determine who we are moving over
	//otherwise the mouseover finds another valid element

	var element = currentelement; //was getelement(event.target);

	//resizing works differently to dragging so we have to split the repositioning and clamping

	if (resizing) {

		var currentmeta = getmeta(element.parentElement);
	}
	else {
		var currentmeta = getmeta(element);
	}

	var checkmeta = { target: currentmeta.target };

	//get new mouse position
	var mouse = getmouseposition(event);
	var mouseX = mouse.mouseX;
	var mouseY = mouse.mouseY;

	//determine if new target is in bounds
	//test is based on the existing target being adjusted by the delta NOT the current location of the element as that is being ticked
	//we need to take into account that resizing adjusts x or y and h or w as deltaX an deltaY change by creating a temporary new target before testing it
	//delta(x,y) applied to oldtarget (x,y) must be between min(x,y) and max(x,y)
	//otherwise clamp the delta to a value to adhere to the above rule

	//mouse delta, try this first
	var deltaX = mouseX - getmousemeta(element).mousemeta.x;
	var deltaY = mouseY - getmousemeta(element).mousemeta.y;


	if (resizing) {

		//calculate the new element size and centre
		checkmeta.target = getresizedelement(element, deltaX, deltaY, true);

	}

	//calculate the bounds based on the new target size 
	var minX = (checkmeta.target.w / 2);
	var maxX = (((theCanvas.clientWidth == 0) ? window.innerWidth : theCanvas.clientWidth) - (checkmeta.target.w / 2));
	var minY = (checkmeta.target.h / 2);
	var maxY = (((theCanvas.clientHeight == 0) ? window.innerHeight : theCanvas.clientHeight) - (checkmeta.target.h / 2));

	//check the centre fits within the bounds

	if (resizing) {
		//checkmax returns a -value if out of bounds
		//checkmin returns a +value if out of bounds
		var checkmaxX = (maxX - checkmeta.target.x);
		var checkmaxY = (maxY - checkmeta.target.y);
		var checkminX = (minX - checkmeta.target.x);
		var checkminY = (minY - checkmeta.target.y);
	}
	else {

		var checkmaxX = Math.round(maxX - (checkmeta.target.x + deltaX));
		var checkmaxY = Math.round(maxY - (checkmeta.target.y + deltaY));
		var checkminX = Math.round(minX - (checkmeta.target.x + deltaX));
		var checkminY = Math.round(minY - (checkmeta.target.y + deltaY));
    }

	//adjust the new mouse position to take into account any out of bounds amounts
	//if any neg max values or pos min values
	mouseX = mouseX + ((checkminX > 0) ? checkminX : 0) + ((checkmaxX < 0) ? checkmaxX : 0);
	mouseY = mouseY + ((checkminY > 0) ? checkminY : 0) + ((checkmaxY < 0) ? checkmaxY : 0);

	//recalculate the mouse delta based on the revised mouse position
	var deltaX = mouseX - getmousemeta(element).mousemeta.x;
	var deltaY = mouseY - getmousemeta(element).mousemeta.y;

	//store the new mouse location
	setmousemeta(element, { x: mouseX, y: mouseY, deltaX: deltaX, deltaY: deltaY });

	if (resizing)
	//store the new target
	{
		currentmeta.target = getresizedelement(element, deltaX, deltaY);
		setmeta(element.parentElement, currentmeta.current, currentmeta.target, currentmeta.step);
	}
	else {
	//store the new mouse location
		//the target is the current target + the calculated delta, 
		//as the currentX represents some position between originalx and the target, we add the delta to the target
		currentmeta.target.x = Math.round(currentmeta.target.x + deltaX);
		currentmeta.target.y = Math.round(currentmeta.target.y + deltaY);

		//store the new target
		setmeta(element, currentmeta.current, currentmeta.target, currentmeta.step);
	}



	bounddiv.style.left = minX + "px";
	bounddiv.style.top = minY + "px";
	bounddiv.style.width = maxX - minX + "px";
	bounddiv.style.height = maxY - minY + "px";
	//bounddiv.style.visibility = "visible";
	bounddiv.style.color = "pink";
	bounddiv.innerHTML = `${minX}<br>${minY}<br>${maxX}<br>${maxY}<br>${checkmeta.target.x}<br>${checkmeta.target.y}<br>DX${deltaX}<br>DY${deltaY}<br>`

	xydiv.style.left = checkmeta.target.x + "px";
	xydiv.style.top = checkmeta.target.y + "px";
	xydiv.style.visibility = "visible";
	bounddiv.innerHTML += `${checkmaxX}<br>${checkmaxY}<br>${checkminX}<br>${checkminY}`

}

function getresizedelement(element, deltaX, deltaY,roundvalues=false) {

	var currentmeta = getmeta(element.parentElement);
	var tempmeta = currentmeta.target;

	if (element.classList.contains('bottom-right')) {
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
			tempmeta.x = currentmeta.target.x + (deltaX/2);
		}
		if (height > minimum_size) {
			tempmeta.h = height;
			tempmeta.y = currentmeta.target.y + (deltaY/2);
		}
	}

	if (roundvalues) {
		tempmeta.w = Math.round(tempmeta.w);
		tempmeta.h = Math.round(tempmeta.h);
		tempmeta.x = Math.round(tempmeta.x);
		tempmeta.y = Math.round(tempmeta.y);
    }

	return tempmeta;

}

function onTimerTick() {  

	//get the correct element to action

	var actionelement = (resizing) ? currentelement.parentElement : currentelement;

	var currentmeta = getmeta(actionelement);

	//calculate the step
	currentmeta.step.x = easeAmount * (currentmeta.target.x - currentmeta.current.x);
	currentmeta.step.y = easeAmount * (currentmeta.target.y - currentmeta.current.y);
	currentmeta.step.w = easeAmount * (currentmeta.target.w - currentmeta.current.w);
	currentmeta.step.h = easeAmount * (currentmeta.target.h - currentmeta.current.h);

	//adjust the current location
	currentmeta.current.x = currentmeta.current.x + currentmeta.step.x;
	currentmeta.current.y = currentmeta.current.y + currentmeta.step.y;
	currentmeta.current.w = currentmeta.current.w + currentmeta.step.w;
	currentmeta.current.h = currentmeta.current.h + currentmeta.step.h;

	//stop the timer when the target position is reached (close enough)
	if (
		(!dragging) &&
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

			delete timers[timer];

			clearInterval(timer);
		}

	//save the new location
	setmeta(actionelement, currentmeta.current, currentmeta.target, currentmeta.step)

	//move the element
	actionelement.style.top = Math.round(currentmeta.current.y - (currentmeta.current.h / 2)).toString() + 'px';
	actionelement.style.left = Math.round(currentmeta.current.x - (currentmeta.current.w / 2)).toString() + 'px';

	actionelement.style.width = Math.round(currentmeta.current.w).toString() + 'px';
	actionelement.style.height = Math.round(currentmeta.current.h).toString() + 'px';

}

function mouseUpListener(event) {

	bounddiv.style.visibility = "hidden";
	xydiv.style.visibility = "hidden";

	//because we were moving we stick with the current element and dont try to determine who we are moving over
	//otherwise the mouseover finds another valid dragme and attachs the mouse down to the wrong element
	var element = currentelement; //getelement(event.target);
	
	element.addEventListener("mousedown", mouseDownListener, false);
	window.removeEventListener("mouseup", mouseUpListener, false);
	if (dragging) {
		dragging = false;
		if (resizing) {
			resizing = false;
			currentelement = currentelement.parentElement; // as we loose the resizer indicator, we need to let tick tock know which element to actually ease out
		}
		document.body.style.cursor = "default"
		window.removeEventListener("mousemove", mouseMoveListener, false);
	}
}
















////global element that contains All elements

//var theCanvas = document.getElementById("canvasOne");
//var dragging = false;

//var targetX;
//var targetY;
//var targetH;
//var targetW;


///*Make resizable div by Hung Nguyen*/
//function makeResizableDiv(div) {

//	const element = document.querySelector(div);
//	const resizers = document.querySelectorAll(div + ' .resizer')

//	const minimum_size = 20;
//	let original_width = 0;
//	let original_height = 0;
//	let original_x = 0;
//	let original_y = 0;
//	let original_mouse_x = 0;
//	let original_mouse_y = 0;


//	for (let i = 0; i < resizers.length; i++) { //for each of the handles in resizable
//		const currentResizer = resizers[i];
//		currentResizer.addEventListener('mousedown', function (e) {
//			e.preventDefault()
//			//getting mouse position correctly 
//			var bRect = theCanvas.getBoundingClientRect();
//			mouseX = (e.clientX - bRect.left) * (theCanvas.clientWidth / bRect.width);
//			mouseY = (e.clientY - bRect.top) * (theCanvas.clientHeight / bRect.height);

//			original_width = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
//			original_height = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
//			dragme.dataset.w = original_width;
//			dragme.dataset.h = original_height;
//			original_x = element.getBoundingClientRect().left;
//			original_y = element.getBoundingClientRect().top;
//			original_mouse_x = mouseX;
//			original_mouse_y = mouseY;
//			window.addEventListener('mousemove', resize)
//			window.addEventListener('mouseup', stopResize)
//			dragging = true;
//			timer = setInterval(onTimerTick, 1000 / 30);
//			//console.log("created resize timer ", timer);

//		})

//		function resize(e) {

//			//as the dimensions increase, the calculation of the left /top need to take into account the change as
//			//these represent the middle of the element

//			//getting mouse position correctly 
//			var bRect = theCanvas.getBoundingClientRect();
//			mouseX = (e.clientX - bRect.left) * (theCanvas.clientWidth / bRect.width);
//			mouseY = (e.clientY - bRect.top) * (theCanvas.clientHeight / bRect.height);

//			var deltaX = (mouseX - original_mouse_x);
//			var deltaY = (mouseY - original_mouse_y);

//			//console.log('resize move', targetX, targetY, deltaX, deltaY);

//			if (currentResizer.classList.contains('bottom-right')) {
//				const width = original_width + deltaX;
//				const height = original_height + deltaY;
//				if (width > minimum_size) {
//					//          element.style.width = width + 'px'
//					dragme.dataset.w = width;
//					dragme.dataset.x = original_x + (deltaX / 2);
//				}
//				if (height > minimum_size) {
//					//          element.style.height = height + 'px'
//					dragme.dataset.h = height;
//					dragme.dataset.y = original_mouse_y + (deltaY / 2);
//				}
//			}
//			else if (currentResizer.classList.contains('bottom-left')) {
//				const height = original_height + deltaY;
//				const width = original_width - deltaX;
//				if (height > minimum_size) {
//					//          element.style.height = height + 'px'
//					dragme.dataset.h = height;
//				}
//				if (width > minimum_size) {
//					//          element.style.width = width;
//					dragme.dataset.w = width + 'px'
//					//          element.style.left = original_x + (mouseX - original_mouse_x) + 'px'
//					dragme.dataset.x = original_x + deltaX;
//				}
//			}
//			else if (currentResizer.classList.contains('top-right')) {
//				const width = original_width + (mouseX - original_mouse_x)
//				const height = original_height - deltaY;
//				if (width > minimum_size) {
//					//          element.style.width = width + 'px'
//					dragme.dataset.w = width + 'px'
//				}
//				if (height > minimum_size) {
//					//          element.style.height = height + 'px'
//					dragme.dataset.h = height;
//					//          element.style.top = original_y + (mouseY - original_mouse_y) + 'px'
//					dragme.dataset.y = original_y + deltaY;
//				}
//			}
//			else {
//				const width = original_width - deltaX;
//				const height = original_height - deltaY;
//				if (width > minimum_size) {
//					//          element.style.width = width + 'px'
//					dragme.dataset.w = width;
//					//          element.style.left = original_x + (mouseX - original_mouse_x) + 'px'
//					dragme.dataset.x = original_x + deltaX;
//				}
//				if (height > minimum_size) {
//					//          element.style.height = height + 'px'
//					dragme.dataset.h = height;
//					//          element.style.top = original_y + (mouseY - original_mouse_y) + 'px'
//					dragme.dataset.y = original_y + deltaY;
//				}
//			}


//			targetX = dragme.dataset.x;
//			targetY = dragme.dataset.y;
//			targetH = dragme.dataset.h;
//			targetW = dragme.dataset.w;


//			//console.log("Resized", dragme.dataset);
//		}

//		function stopResize() {
//			dragging = false;
//			window.removeEventListener('mousemove', resize)
//			window.removeEventListener('mouseup', stopResize)
//		}
//	}
//}

//makeResizableDiv('.dragme')



//init();

//var numShapes;
//var shapes;
//var dragIndex;
////var dragging;
//var mouseX;
//var mouseY;
//var dragHoldX;
//var dragHoldY;
//var timer;
//var easeAmount;
//var bgColor;

//function init() {
//	numShapes = 10;
//	easeAmount = 0.65;

//	bgColor = "#000000";

//	theCanvas.addEventListener("mousedown", mouseDownListener, false);

//	dragme.dataset.y = dragme.offsetTop + dragme.getBoundingClientRect().height / 2;
//	dragme.dataset.x = dragme.offsetLeft + dragme.getBoundingClientRect().width / 2;

//	dragme.dataset.w = dragme.getBoundingClientRect().width;
//	dragme.dataset.h = dragme.getBoundingClientRect().height;

//	targetX = parseInt(dragme.dataset.x);
//	targetY = parseInt(dragme.dataset.y);

//	targetW = parseInt(dragme.dataset.w);
//	targetH = parseInt(dragme.dataset.h);

//	dragme.style.position = "absolute";
//}


//function mouseDownListener(evt) {

//	//make sure we have a dragme

//	if (evt.target.id != 'dragme') { return; }

//	var i;

//	document.body.style.cursor = "move";

//	//getting mouse position correctly 
//	var bRect = theCanvas.getBoundingClientRect();
//	mouseX = (evt.clientX - bRect.left) * (theCanvas.clientWidth / bRect.width);
//	mouseY = (evt.clientY - bRect.top) * (theCanvas.clientHeight / bRect.height);

//	//console.log('mouse down', mouseX, mouseY);

//	dragging = true; //we found something to drag

//	if (dragging) {
//		window.addEventListener("mousemove", mouseMoveListener, false);

//		//shape to drag is now last one in array. We read record the point on this object where the mouse is "holding" it:
//		dragHoldX = mouseX - parseInt(dragme.dataset.x);
//		dragHoldY = mouseY - parseInt(dragme.dataset.y);

//		//The "target" position is where the object should be if it were to move there instantaneously. But we will
//		//set up the code so that this target position is approached gradually, producing a smooth motion.
//		targetX = mouseX - dragHoldX;
//		targetY = mouseY - dragHoldY;

//		//console.log('target down', targetX, targetY);

//		//start timer
//		timer = setInterval(onTimerTick, 1000 / 30);
//		//console.log("created timer ", timer);
//	}
//	theCanvas.removeEventListener("mousedown", mouseDownListener, false);
//	window.addEventListener("mouseup", mouseUpListener, false);

//	//code below prevents the mouse down from having an effect on the main browser window:
//	if (evt.preventDefault) {
//		evt.preventDefault();
//	} //standard
//	else if (evt.returnValue) {
//		evt.returnValue = false;
//	} //older IE
//	return false;
//}

//function onTimerTick() {
//	/*
//	Because of reordering, the dragging shape is the last one in the array.
//	The code below moves this shape only a portion of the distance towards the current "target" position, and 
//	because this code is being executed inside a function called by a timer, the object will continue to
//	move closer and closer to the target position.
//	The amount to move towards the target position is set in the parameter 'easeAmount', which should range between
//	0 and 1. The target position is set by the mouse position as it is dragging.		
//	*/

//	(dragme.dataset.x) = parseInt(dragme.dataset.x) + easeAmount * (targetX - parseInt(dragme.dataset.x));
//	(dragme.dataset.y) = parseInt(dragme.dataset.y) + easeAmount * (targetY - parseInt(dragme.dataset.y));

//	(dragme.dataset.h) = parseInt(dragme.dataset.h) + easeAmount * (targetH - parseInt(dragme.dataset.h));
//	(dragme.dataset.w) = parseInt(dragme.dataset.w) + easeAmount * (targetW - parseInt(dragme.dataset.w));

//	//stop the timer when the target position is reached (close enough)
//	//console.log("check for easing x,x,y,y,x=x,y=y",
//		parseInt(dragme.dataset.x),
//		targetX,
//		parseInt(dragme.dataset.y),
//		targetY,
//		(Math.abs(parseInt(dragme.dataset.x) - targetX) < 1.1),
//		(Math.abs(parseInt(dragme.dataset.y) - targetY) < 1.1));
//	//console.log("check for easing w,w,w-w,w=w,h=h",
//		parseInt(dragme.dataset.w),
//		targetW,
//		parseInt(dragme.dataset.w) - targetW,
//		(Math.abs(parseInt(dragme.dataset.w) - targetW) < 1.1),
//		(Math.abs(parseInt(dragme.dataset.h) - targetH) < 1.1));
//	//console.log("check for easing h,h", parseInt(dragme.dataset.h), targetH);

//	if ((!dragging) &&
//		(Math.abs(parseInt(dragme.dataset.x) - targetX) < 1.1) && (Math.abs(parseInt(dragme.dataset.y) - targetY) < 1.1) &&
//		(Math.abs(parseInt(dragme.dataset.h) - targetH) < 1.1) && (Math.abs(parseInt(dragme.dataset.w) - targetW) < 1.1)

//	) {
//		(dragme.dataset.x) = targetX;
//		(dragme.dataset.y) = targetY;
//		(dragme.dataset.h) = targetH;
//		(dragme.dataset.w) = targetW;

//		//stop timer:
//		//console.log("clearing timer ", timer);
//		clearInterval(timer);
//	}

//	if ((!dragging)) { //console.log("easing to end"); } else { "still draggin"; }

//	//all positions relate to the centre of the element
//	//for absolue positioning, adjust from centre to top left corner
//	//which will be interesting as we can also resize

//	//apply the width and height first as we use the actual measurments to determine the new position in the followign step

//	dragme.style.width = parseInt(dragme.dataset.w) + 'px';
//	dragme.style.height = parseInt(dragme.dataset.h) + 'px';

//	//we adjust the actual position as we track x,y using the centre of the element

//	//console.log("position x,w,newx", parseInt(dragme.dataset.x), dragme.getBoundingClientRect().width, (parseInt(dragme.dataset.y) - dragme.getBoundingClientRect().height / 2))

//	dragme.style.top = (parseInt(dragme.dataset.y) - dragme.getBoundingClientRect().height / 2).toString() + 'px';
//	dragme.style.left = (parseInt(dragme.dataset.x) - dragme.getBoundingClientRect().width / 2).toString() + 'px';
//}

//function mouseUpListener(evt) {
//	theCanvas.addEventListener("mousedown", mouseDownListener, false);
//	window.removeEventListener("mouseup", mouseUpListener, false);
//	if (dragging) {
//		dragging = false;
//		document.body.style.cursor = "default"
//		window.removeEventListener("mousemove", mouseMoveListener, false);
//	}
//}

//function mouseMoveListener(evt) {
//	var posX;
//	var posY;

//	var halfwidth = dragme.getBoundingClientRect().width / 2;
//	var minX = halfwidth;
//	var maxX = theCanvas.clientWidth - halfwidth;

//	var halfheight = dragme.getBoundingClientRect().height / 2;
//	var minY = halfheight;
//	var maxY = theCanvas.clientHeight - halfheight;

//	//getting mouse position correctly 
//	var bRect = theCanvas.getBoundingClientRect();
//	mouseX = (evt.clientX - bRect.left) * (theCanvas.clientWidth / bRect.width);
//	mouseY = (evt.clientY - bRect.top) * (theCanvas.clientHeight / bRect.height);


//	//clamp x and y positions to prevent object from dragging outside of canvas
//	posX = mouseX - dragHoldX;
//	posX = (posX < minX) ? minX : ((posX > maxX) ? maxX : posX);
//	posY = mouseY - dragHoldY;
//	posY = (posY < minY) ? minY : ((posY > maxY) ? maxY : posY);

//	targetX = posX;
//	targetY = posY;

//	//console.log('target move', targetX, targetY);
//}