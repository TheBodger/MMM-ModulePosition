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
	//x,y this is its apparent absolute position, manually taking  into account margins etc
	//we know this is relative to the body 

	var temp = { x: 0, y: 0, w: 0, h: 0 };

	var trueoffset = getmouseposition({ clientX: element.offsetLeft, clientY: element.offsetTop });

	//get the style information 
	var tempstyle = theCanvas.currentStyle || window.getComputedStyle(theCanvas);

	temp.x = -parseFloat(tempstyle.marginLeft.replace('px', '')) + (element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2);
	temp.y = -parseFloat(tempstyle.marginTop.replace('px', '')) + (element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2);

	temp.w = element.getBoundingClientRect().width;
	temp.h = element.getBoundingClientRect().height;

	return  temp;

}

function makedraggable(element) {

	element.classList.add("drag");
	element.addEventListener("mousedown", mouseDownListener, false);

	setmeta(element, getcurrentmeta(element), getcurrentmeta(element), { x: 0, y: 0, w: 0, h: 0 });

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

	//stop a resizer mousedown from bubbling up to the parent and vice versa

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

		event.currentTarget.removeEventListener("mousedown", mouseDownListener, false);

		//determine who we are dealing with

		var element = getelement(event.currentTarget);
		var parentelement = getelement(event.currentTarget, true);

		//pop the div to the top level so absolute actual works
		//and make it absolute here so we have correct initial positioning
		//before we do this we set the location so it doesn't jump around the screen
		//and we get the latest values for w/h/x/y because they have changed since last we were here for this element

		setmeta(parentelement,getcurrentmeta(parentelement), getcurrentmeta(parentelement), {x:0,y:0,w:0,h:0})
		var currentmeta = getmeta(parentelement);

		//move the element
		parentelement.style.top = Math.round(currentmeta.current.y - (currentmeta.current.h / 2)).toString() + 'px';
		parentelement.style.left = Math.round(currentmeta.current.x - (currentmeta.current.w / 2)).toString() + 'px';

		parentelement.style.width = Math.round(currentmeta.current.w).toString() + 'px';
		parentelement.style.height = Math.round(currentmeta.current.h).toString() + 'px';

		parentelement.style.position = 'absolute';
		document.body.append(parentelement);

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
		currentmeta = getmeta((resizing) ? parentelement : element);
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





