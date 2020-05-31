
//create 3.3. 
//calculate the offset of the current element/module from its parent(or we need to find a parent positioned element)
//use this offset to amend the final location so that we adjust back from being relative to body to being relative to its real parent

//create 3.4
//add snap to grid and toggle switches to enable grid snapping
//uses grid to control size of grid - 1 should ensure current activity
//applied when calculating the new target. uses code from  fabricjs

// create 3.5
//target location is calculated absolute
//new target = (adjusted) mouse = mousedown delta
//mousedown delta = mousedown - current
//rename stallmeta to mousedown
//adjust mouse to grid before resizing
//todo - move grid snapping to edges - leading edge(s) 
//todo - stop the grid allowing elements to go out of bounds for certain values

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

//default local variables

var easeAmount = 0.30 // percentage of delta to step
var FPS = 15 // frames per second
var interval = 1000 / FPS //how long each frame lasts for
var minimum_size = 50;
var grid = 10; // needs to be low otherwise dragging can stall

//----------------

var usegrid = false;
var currentelement;
var timers = {};
var dragging = false;
var resizing = false;
var mousedown = { element: { x: 0, y: 0, w: 0, h: 0 }, mouse: { x: 0, y: 0 }, mousemoved: { x: 0, y: 0 }}

function smoothpositioninginit(smoothpositioningconfig) {

	//add verification that the config has been set
	//TODO - support null canvasid = viewable window

	if (smoothpositioningconfig.canvasid.toLowerCase() == 'body') {
		theCanvas = document.body;
	}
	else {
		theCanvas = document.getElementById(smoothpositioningconfig.canvasid);
	}

	//set the local variables

	easeAmount = smoothpositioningconfig.easeAmount;
	FPS = smoothpositioningconfig.FPS;
	interval = 1000 / FPS;
	minimum_size = smoothpositioningconfig.minimum_size;
	grid = smoothpositioningconfig.grid;

}

function setmeta(element, original, current, target, step) {
	element.dataset.meta = JSON.stringify({ original:original, current: current, target: target, step: step });	
}

function setstate(element, amended, active, absolute) {
	element.dataset.state = JSON.stringify({ amended: amended, active: active, absolute: absolute});
}

function setcss(element, offsetX, offsetY) {
	element.dataset.cssoffset = JSON.stringify({ offsetX: offsetX, offsetY: offsetY });
}

function getcss(element) {
	return JSON.parse(element.dataset.cssoffset);
}

function setmousemeta(element, mousemeta) {
	element.dataset.mousemeta = JSON.stringify({ mousemeta: mousemeta });
}

function getmeta(element) {
	return JSON.parse(element.dataset.meta);
	//({ original:original, current: current, target: target, step: step });
}

function getstate(element) {
	return JSON.parse(element.dataset.state);
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

	//alert(JSON.stringify(element.offsetLeft));

	//get the style information 
	var tempstyle = theCanvas.currentStyle || window.getComputedStyle(theCanvas);

	temp.x = -parseFloat(tempstyle.marginLeft.replace('px', '')) + (element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2);
	temp.y = -parseFloat(tempstyle.marginTop.replace('px', '')) + (element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2);

	temp.w = element.getBoundingClientRect().width;
	temp.h = element.getBoundingClientRect().height;

	return  temp;
}

function togglegrid() {

	if (grid > 0) {
		usegrid = document.getElementById('gridtoggle').checked;
    }
}

function setgrid(name, meta) {
	var t;
	t = document.getElementById('metagridname')
	t.innerHTML = name;
	t = document.getElementById('metagridx')
	t.innerHTML = 'X: ' + meta.x.toFixed(2);
	t = document.getElementById('metagridy')
	t.innerHTML = 'Y: ' + meta.y.toFixed(2);
	t = document.getElementById('metagridw')
	t.innerHTML = 'W: ' + meta.w.toFixed(2);
	t = document.getElementById('metagridh')
	t.innerHTML = 'H: ' + meta.h.toFixed(2);
}

function makedraggable(element) {

	element.classList.add("drag");
	element.addEventListener("mousedown", mouseDownListener, false);

	//get the original location based on whatever the CSS is at the time of loading the element
	var origmeta = getcurrentmeta(element);

	var origLeft = (origmeta.x - (origmeta.w / 2));
	var origTop = (origmeta.y - (origmeta.h / 2));

	setmeta(element, origmeta, origmeta, origmeta, { x: 0, y: 0, w: 0, h: 0 });

	////console.log("ox", origmeta.x, origmeta.w);
	////console.log("oy", origmeta.y, origmeta.h);

	//apply absolute, store the new location and reset to the original positioning
	//this gives us any positioning deltas we need to apply to the CSS when we create the custom CSS

	//need to only handle inline styles !!
	//so we access the element.style AND NOT THE computed style
	//this shows style entries that are actually inline and ignores those from stylesheets

	var originalposition = element.style.position;

	element.style.position = 'absolute';

	var absmeta = getcurrentmeta(element);

	if (originalposition == '') {
		element.style.removeProperty('position');
	}
	else {
		element.style.position = originalposition;
	}

	var absdeltaLeft = (absmeta.x - (absmeta.w / 2)) - origLeft;
	var absdeltaTop = (absmeta.y - (absmeta.h / 2)) - origTop;

	var offsetX = element.offsetLeft - origLeft -  absdeltaLeft;
	var offsetY = element.offsetTop - origTop - absdeltaTop;

	//and store them in the element

	setcss(element, offsetX, offsetY);

	//add a couple of tracking elements and check if this is absolute positioned at any specificity

	setstate(element, false, false, (window.getComputedStyle(element, null).position == 'absolute'));

	//add an observer to catch a change to the position (made by the main.js as part of hiding/showing modules, animating transitions)
	//so we can override and keep them visible at all times

	// Select the node that will be observed for mutations
	const targetNode = element;

	// Options for the observer (which mutations to observe)
	const config = { attributes: true, attributeFilter: ["style"], attributeOldValue: true,};

	// Callback function to execute when mutations are observed
	// only actually fire once the target element is active
	const callback = function (mutationsList, observer) {
		// Use traditional 'for loops' for IE 11
		for (let mutation of mutationsList) {
			if (mutation.target.dataset != null) {
				var state = getstate(mutation.target);
				// start this as soon as we have loaded as we need to show the module in the location we want and not have 
				// the static position override the absolute if we need it
				if (state.active || state.absolute) {
					var oldvalue = getstyleasjson(mutation.oldValue);
					if (oldvalue != null) {
						////console.log('The ' + mutation.attributeName + ' attribute of element ' + mutation.target.id + ' was modified. Old value was ' + oldvalue.position);
						////console.log('The new position is ' + mutation.target.style.position);
						if (mutation.target.style.postion != 'absolute') {
							mutation.target.style.position = 'absolute'
						};
					}
                }
            }
		}
	};

	function getstyleasjson(stylestring) {
		if (stylestring == null) { return null };
		var temp = '';
		var obj = stylestring.split(";");
		obj.forEach(function (pair) {
			if (pair != "") {
				var jpair = pair.split(":");
				temp = temp + '"' + jpair[0].trim() + '":"' + jpair[1].trim() + '",';
			}
		})
		temp = "{" + temp.substr(0, temp.length - 1) + "}"
		return JSON.parse(temp);
	}

	// Create an observer instance linked to the callback function
	const observer = new MutationObserver(callback);

	// Start observing the target node for configured mutations
	observer.observe(targetNode, config);

	// Later, you can stop observing
	//observer.disconnect();

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

	setmeta(element, getcurrentmeta(element), getcurrentmeta(element), getcurrentmeta(element), { x: 0, y: 0, w: 0, h: 0 });

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

	//store the meta for the mousedown and element and the mouse movement direction calculations (mousemoved)

	mousedown.mouse.x = mouseX;
	mousedown.mouse.y = mouseY;

	//store the new mouse location

	mousedown.mousemoved.x = mouseX;
	mousedown.mousemoved.y = mouseY;

	//determine if we are dragging or resizing

	dragging = true; //we found something to drag //this should always be true as the mousedown events are only linked to draggable and re-sizable elements

	//but, if there is an outstanding timer, (about to be orphaned) , don't let the action start

	if (Object.keys(timers).length > 0) {
		dragging = false;
	}

	if (dragging) {

		event.currentTarget.removeEventListener("mousedown", mouseDownListener, false);

		//determine who we are dealing with
		//element is the mousedown, that may be a resizer, in which case we need the parent

		var element = getelement(event.currentTarget);
		var parentelement = getelement(event.currentTarget, true);

		//pop the div to the top level so absolute actual works
		//and make it absolute here so we have correct initial positioning
		//before we do this we set the new location to the original location before we apply the positioning
		//absolute positioning will override certain #CSS settings and the element may move when it is made absolute
		//and we get the latest values for w/h/x/y because they have changed since last we were here for this element
		//and depending on its contents the w/h may change

		setmeta(parentelement, getmeta(parentelement).original, getcurrentmeta(parentelement), getcurrentmeta(parentelement), {x:0,y:0,w:0,h:0})
		var currentmeta = getmeta(parentelement);

		//store the location for mousedown delta calculation and resizing
		mousedown.element.x = currentmeta.current.x;
		mousedown.element.y = currentmeta.current.y;
		mousedown.element.w = currentmeta.current.w;
		mousedown.element.h = currentmeta.current.h;

		//move the element
		parentelement.style.top = (currentmeta.current.y - (currentmeta.current.h / 2)).toString() + 'px';
		parentelement.style.left = (currentmeta.current.x - (currentmeta.current.w / 2)).toString() + 'px';

		parentelement.style.width = (currentmeta.current.w).toString() + 'px';
		parentelement.style.height = (currentmeta.current.h).toString() + 'px';

		parentelement.style.position = 'absolute';

		setstate(parentelement, getstate(parentelement).amended, true, getstate(parentelement).absolute,); //set active to true
		
		document.body.append(parentelement);

		//tell the mutation observer for this element to start observing.

		//parentelement.

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
		setmeta((resizing) ? parentelement : element, getmeta((resizing) ? parentelement : element).original, currentmeta.current, currentmeta.current, currentmeta.step);

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

	//because we are moving we stick with the current element and don't try to determine who we are moving over
	//otherwise the mouseover finds another valid element

	//added detection of the leading edge(s) when using the grid.
	//the leading edge(s) will snap to the nearest grid - in the direction of travel only
	//so the snap only occurs if the move/resize of the element will be in the expected direction

	var element = currentelement; 

	//as the element has been moved, we assume it has been amended
	//resizing works differently to dragging so we have to split the parts of the code - really !

	if (resizing) {
		var currentmeta = getmeta(element.parentElement);
		setstate(element, true, getstate(element.parentElement).active, getstate(element.parentElement).absolute); //set amended true
	}
	else {
		var currentmeta = getmeta(element);
		setstate(element, true, getstate(element).active, getstate(element).absolute); //set amended true
	}

	//warning dont assign objects to variables, it links them !!

	var checkmeta = {target: { x: currentmeta.target.x, y: currentmeta.target.y, w: currentmeta.target.w, h: currentmeta.target.h} };

	//get new mouse position
	var mouse = getmouseposition(event);
	var mouseX = mouse.mouseX;
	var mouseY = mouse.mouseY;

	//determine if new target is in bounds
	//test is based on the existing target being moved to the new mouse location (-mousedown delta)
	//otherwise clamp the mouse to a value to adhere to the above rule
	//takes into account that a  grid snap may take the element out of bounds

	//the following are used to track the leading edge(s) by determining travel direction
	//0 = no travel - ignore
	//+ve towards right/down
	//-ve towards left/top

	//calculate direction and stores as -1 0 or +1
	//calculates each time there is a new move, relative to the last move, NOT the mouse down location

	var dx = mouseX - mousedown.mousemoved.x;
	var dy = mouseY - mousedown.mousemoved.y;

	dx = (dx < 0) ? -1 : (dx > 0 ? 1 : 0);
	dy = (dy < 0) ? -1 : (dy > 0 ? 1 : 0);

	if (resizing) {

		checkmeta.target = getresizedelement(element, mouseX, mouseY);

	}
	else
	{
		checkmeta.target.x = mouseX - (mousedown.mouse.x - mousedown.element.x);
		checkmeta.target.y = mouseY - (mousedown.mouse.y - mousedown.element.y);

		if (usegrid) {

			//only try and snap the edges that are leading and only in the direction of travel
			//if snap is +ve and travel -ve ignore and vice versa
			//requires calculating the edge location now we have done first move but not checked for bounds

			//calculate the new leading edge(s) x and y 

			var lex = checkmeta.target.x + ((currentmeta.current.w / 2) * dx);
			var ley = checkmeta.target.y + ((currentmeta.current.h / 2) * dy);

			//check if a snap is in the right direction
			//and then calculate a new target to make the element move the leading edge to the correct position

			console.log(dx, dy, lex, ley, checkmeta.target.x, checkmeta.target.y, currentmeta.current.w, currentmeta.current.h);

			if ((dx == -1 && lex > Math.round(lex / grid) * grid) || (dx == 1 && lex < Math.round(lex / grid) * grid)) {
				checkmeta.target.x = (Math.round(lex / grid) * grid) - ((currentmeta.current.w / 2) * dx);
			}

			if ((dy == -1 && ley > Math.round(ley / grid) * grid) || (dy == 1 && ley < Math.round(ley / grid) * grid)) {
				checkmeta.target.y = (Math.round(ley / grid) * grid) - ((currentmeta.current.h / 2) * dy);
			}
			console.log(0,0,0,0, checkmeta.target.x, checkmeta.target.y);
        }

	}

	//calculate the bounds based on the new target size 
	var minX = (checkmeta.target.w / 2);
	var maxX = (((theCanvas.clientWidth == 0) ? window.innerWidth : theCanvas.clientWidth) - (checkmeta.target.w / 2));
	var minY = (checkmeta.target.h / 2);
	var maxY = (((theCanvas.clientHeight == 0) ? window.innerHeight : theCanvas.clientHeight) - (checkmeta.target.h / 2));

	//check the centre fits within the bounds

	//checkmax returns a -value if out of bounds
	//checkmin returns a +value if out of bounds
	var checkmaxX = (maxX - checkmeta.target.x);
	var checkmaxY = (maxY - checkmeta.target.y);
	var checkminX = (minX - checkmeta.target.x);
	var checkminY = (minY - checkmeta.target.y);

	//adjust the new mouse position to take into account any out of bounds amounts
	//if any neg max values or pos min values
	mouseX = mouseX + ((checkminX > 0) ? checkminX : 0) + ((checkmaxX < 0) ? checkmaxX : 0);
	mouseY = mouseY + ((checkminY > 0) ? checkminY : 0) + ((checkmaxY < 0) ? checkmaxY : 0);

	//store the new mouse location
	setmousemeta(element, { x: mouseX, y: mouseY, deltaX: 0, deltaY: 0 });

	if (resizing)
	//store the new target after grid adjusting
	{
		currentmeta.target = getresizedelement(element, mouseX,mouseY);

		setmeta(element.parentElement, getmeta(element.parentElement).original, currentmeta.current, currentmeta.target, currentmeta.step);
		setgrid(element.parentElement.id, getmeta(element.parentElement).current);
	}
	else {

		//the target is the adjusted mouse inbounds
		//use grid calculation to adjust the target to snap to the grid
		//adjust to snap if active

		//recalculate the target based on the revised mouse position

		checkmeta.target.x = mouseX - (mousedown.mouse.x - mousedown.element.x);
		checkmeta.target.y = mouseY - (mousedown.mouse.y - mousedown.element.y);

		if (usegrid) {

			//recalculate the new leading edge(s) x and y 

			var lex = checkmeta.target.x + ((currentmeta.current.w / 2) * dx);
			var ley = checkmeta.target.y + ((currentmeta.current.h / 2) * dy);

			//check if a snap is in the right direction
			//and then calculate a new target to make the element move the leading edge to the correct position

			console.log(dx, dy, lex, ley, (Math.round(lex / grid) * grid), (Math.round(ley / grid) * grid), checkmeta.target.x, checkmeta.target.y, currentmeta.current.w, currentmeta.current.h);

			if ((dx == -1 && lex > Math.round(lex / grid) * grid) || (dx == 1 && lex < Math.round(lex / grid) * grid)) {
				currentmeta.target.x = (Math.round(lex / grid) * grid) - ((currentmeta.current.w / 2) * dx);
				console.log(0, 0, 0, 0, currentmeta.target.x, currentmeta.target.y);
			}

			if ((dy == -1 && ley > Math.round(ley / grid) * grid) || (dy == 1 && ley < Math.round(ley / grid) * grid)) {
				currentmeta.target.y = (Math.round(ley / grid) * grid) - ((currentmeta.current.h / 2) * dy);
				console.log(0, 0, 0, 0, currentmeta.target.x, currentmeta.target.y);
			}

		}
		else {

			//no grid so just use the new location
			currentmeta.target.x = checkmeta.target.x;
			currentmeta.target.y = checkmeta.target.y;
        }

		//store the new target
		setmeta(element, getmeta(element).original, currentmeta.current, currentmeta.target, currentmeta.step);
		setgrid(element.id, getmeta(element).current);
	}

	//store the new mouse location

	mousedown.mousemoved.x = mouseX;
	mousedown.mousemoved.y = mouseY;

}

function getresizedelement(element, mouseX, mouseY, roundvalues = false) {

	//we get the resize element and the new mouse location
	//we know the original mouse location and the centre of the element at mousedown

	//calculate new resizer locations based on the delta between mouse new and mouse down
	//applied to the current location	

	var deltaX = (mouseX - mousedown.mouse.x)
	var deltaY = (mouseY - mousedown.mouse.y)

	//variables that hold the direction of the moose movement towards 0 relative height/size

	var dx = 0;
	var dy = 0;

	var dxt = (deltaX < 0) ? -1 : (deltaX > 0 ? 1 : 0);
	var dyt = (deltaY < 0) ? -1 : (deltaY > 0 ? 1 : 0);

	var currentmeta = getmeta(element.parentElement);
	var tempmeta = currentmeta.target;

	var width=0, height=0;

	if (element.classList.contains('bottom-right')) {

		dx = 1;
		dy = 1;

		//if usegrid adjust the delta to snap to the nearest grid,
		//based on travel direction

		if (usegrid) {

			// calc new leading edge positions 
			var lex = (mousedown.element.x + (mousedown.element.w / 2) * dx) + (deltaX * dx);
			var ley = (mousedown.element.y + (mousedown.element.h / 2) * dy) + (deltaY * dy);

			if ((dxt == -1 && lex > Math.round(lex / grid) * grid) || (dxt == 1 && lex < Math.round(lex / grid) * grid)) {
				console.log("M", dx, dy, dxt, dyt, lex, ley, deltaX, deltaY, mouseX, mousedown.mousemoved.x);
				deltaX = deltaX + (((Math.round(lex / grid) * grid) - lex) * dxt);
			}
			else { //leave the edge where it is - no movement
				

				var snaptox = Math.round(lex / grid) * grid;

				console.log("B", dx, dy, dxt, dyt, lex, ley, deltaX, deltaY, mouseX, mousedown.mousemoved.x,snaptox);

				if (Math.abs(deltaX) < grid/2) {
					deltaX = 0;
				}
				else {
					deltaX = deltaX - ((lex - snaptox) * dxt);
				}

            }

			if ((dyt == -1 && ley > Math.round(ley / grid) * grid) || (dyt == 1 && ley < Math.round(ley / grid) * grid)) {
				deltaY = deltaY + (((Math.round(ley / grid) * grid) - ley) * dyt);
			}
			else {
				var snaptoy = Math.round(ley / grid) * grid;

				if (Math.abs(deltaY) < grid / 2) { 
					deltaY = 0;
				}
				else {
					deltaY = deltaY - ((ley - snaptoy) * dyt);
				}
            }

			console.log("A",deltaX, deltaY);

        }

		width = mousedown.element.w + deltaX;
		height = mousedown.element.h + deltaY;

		if (width >= minimum_size) {
			tempmeta.w = width;
			tempmeta.x = mousedown.element.x + (deltaX / 2);
		}

		if (height >= minimum_size) {
			tempmeta.h = height;
			tempmeta.y = mousedown.element.y + (deltaY / 2);
		}
	}

	else if (element.classList.contains('bottom-left')) {

		dx = -1;
		dy = 1;

		if (usegrid) {

			// calc new leading edge positions 
			var lex = (mousedown.element.x + (mousedown.element.w / 2) * dx) + (deltaX * dx);
			var ley = (mousedown.element.y + (mousedown.element.h / 2) * dy) + (deltaY * dy);

			if ((dxt == -1 && lex > Math.round(lex / grid) * grid) || (dxt == 1 && lex < Math.round(lex / grid) * grid)) {
				console.log("M", dx, dy, dxt, dyt, lex, ley, deltaX, deltaY, mouseX, mousedown.mousemoved.x);
				deltaX = deltaX + (((Math.round(lex / grid) * grid) - lex) * dxt);
			}
			else { //leave the edge where it is - no movement


				var snaptox = Math.round(lex / grid) * grid;

				console.log("B", dx, dy, dxt, dyt, lex, ley, deltaX, deltaY, mouseX, mousedown.mousemoved.x, snaptox);

				if (Math.abs(deltaX) < grid / 2) {
					deltaX = 0;
				}
				else {
					deltaX = deltaX - ((lex - snaptox) * dxt);
				}

			}

			if ((dyt == -1 && ley > Math.round(ley / grid) * grid) || (dyt == 1 && ley < Math.round(ley / grid) * grid)) {
				deltaY = deltaY + (((Math.round(ley / grid) * grid) - ley) * dyt);
			}
			else {
				var snaptoy = Math.round(ley / grid) * grid;

				if (Math.abs(deltaY) < grid / 2) {
					deltaY = 0;
				}
				else {
					deltaY = deltaY - ((ley - snaptoy) * dyt);
				}
			}

			console.log("A", deltaX, deltaY);

		}

		width = mousedown.element.w - deltaX;
		height = mousedown.element.h + deltaY;

			if (height >= minimum_size) {
				tempmeta.h = height;
				tempmeta.y = mousedown.element.y + (deltaY / 2);
			}
			if (width >= minimum_size) {
				tempmeta.w = width;
				tempmeta.x = mousedown.element.x + (deltaX / 2);
			}
	}

	else if (element.classList.contains('top-right')) {
			dx = 1;
			dy = -1;

		if (usegrid) {

			// calc new leading edge positions 
			var lex = (mousedown.element.x + (mousedown.element.w / 2) * dx) + (deltaX * dx);
			var ley = (mousedown.element.y + (mousedown.element.h / 2) * dy) + (deltaY * dy);

			if ((dxt == -1 && lex > Math.round(lex / grid) * grid) || (dxt == 1 && lex < Math.round(lex / grid) * grid)) {
				console.log("M", dx, dy, dxt, dyt, lex, ley, deltaX, deltaY, mouseX, mousedown.mousemoved.x);
				deltaX = deltaX + (((Math.round(lex / grid) * grid) - lex) * dxt);
			}
			else { //leave the edge where it is - no movement


				var snaptox = Math.round(lex / grid) * grid;

				console.log("B", dx, dy, dxt, dyt, lex, ley, deltaX, deltaY, mouseX, mousedown.mousemoved.x, snaptox);

				if (Math.abs(deltaX) < grid / 2) {
					deltaX = 0;
				}
				else {
					deltaX = deltaX - ((lex - snaptox) * dxt);
				}

			}

			if ((dyt == -1 && ley > Math.round(ley / grid) * grid) || (dyt == 1 && ley < Math.round(ley / grid) * grid)) {
				deltaY = deltaY + (((Math.round(ley / grid) * grid) - ley) * dyt);
			}
			else {
				var snaptoy = Math.round(ley / grid) * grid;

				if (Math.abs(deltaY) < grid / 2) {
					deltaY = 0;
				}
				else {
					deltaY = deltaY - ((ley - snaptoy) * dyt);
				}
			}

			console.log("A", deltaX, deltaY);

		}

			width = mousedown.element.w + deltaX;
			height = mousedown.element.h - deltaY;

			if (width >= minimum_size) {
				tempmeta.w = width;
				tempmeta.x = mousedown.element.x + (deltaX / 2);
			}
			if (height >= minimum_size) {
				tempmeta.h = height;
				tempmeta.y = mousedown.element.y + (deltaY / 2);

			}
		}

	else {//top-left
			dx = -1;
		dy = -1;

		if (usegrid) {

			// calc new leading edge positions 
			var lex = (mousedown.element.x + (mousedown.element.w / 2) * dx) + (deltaX * dx);
			var ley = (mousedown.element.y + (mousedown.element.h / 2) * dy) + (deltaY * dy);

			if ((dxt == -1 && lex > Math.round(lex / grid) * grid) || (dxt == 1 && lex < Math.round(lex / grid) * grid)) {
				console.log("M", dx, dy, dxt, dyt, lex, ley, deltaX, deltaY, mouseX, mousedown.mousemoved.x);
				deltaX = deltaX + (((Math.round(lex / grid) * grid) - lex) * dxt);
			}
			else { //leave the edge where it is - no movement


				var snaptox = Math.round(lex / grid) * grid;

				console.log("B", dx, dy, dxt, dyt, lex, ley, deltaX, deltaY, mouseX, mousedown.mousemoved.x, snaptox);

				if (Math.abs(deltaX) < grid / 2) {
					deltaX = 0;
				}
				else {
					deltaX = deltaX - ((lex - snaptox) * dxt);
				}

			}

			if ((dyt == -1 && ley > Math.round(ley / grid) * grid) || (dyt == 1 && ley < Math.round(ley / grid) * grid)) {
				deltaY = deltaY + (((Math.round(ley / grid) * grid) - ley) * dyt);
			}
			else {
				var snaptoy = Math.round(ley / grid) * grid;

				if (Math.abs(deltaY) < grid / 2) {
					deltaY = 0;
				}
				else {
					deltaY = deltaY - ((ley - snaptoy) * dyt);
				}
			}

			console.log("A", deltaX, deltaY);

		}

		width = mousedown.element.w - deltaX; height = mousedown.element.h - deltaY;

			if (width >= minimum_size) {
				tempmeta.w = width;
				tempmeta.x = mousedown.element.x + (deltaX/2);
			}
			if (height >= minimum_size) {
				tempmeta.h = height;
				tempmeta.y = mousedown.element.y + (deltaY/2);
			}
		}


	if (width < minimum_size) {
		tempmeta.w = minimum_size;
		var adjustx = minimum_size - width;
		tempmeta.x = mousedown.element.x + ((deltaX + adjustx * dx) / 2);
	}

	if (height < minimum_size) {
		tempmeta.h = minimum_size;
		var adjusty = minimum_size - height;
		tempmeta.y = mousedown.element.y + ((deltaY + adjusty * dy) / 2);
	}

	return tempmeta;

}

function onTimerTick() {  

	//get the correct element to action

	var actionelement = (resizing) ? currentelement.parentElement : currentelement;

	var currentmeta = getmeta(actionelement);

	//console.log("tick", currentmeta.target.x, currentmeta.target.y);

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
	setmeta(actionelement, getmeta(actionelement).original, currentmeta.current, currentmeta.target, currentmeta.step)

	//console.log("tock", currentmeta.target.x, currentmeta.target.y);

	//move the element
	actionelement.style.top = (currentmeta.current.y - (currentmeta.current.h / 2)).toString() + 'px';
	actionelement.style.left = (currentmeta.current.x - (currentmeta.current.w / 2)).toString() + 'px';

	actionelement.style.width =(currentmeta.current.w).toString() + 'px';
	actionelement.style.height = (currentmeta.current.h).toString() + 'px';

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
		document.body.style.cursor = "auto"
		window.removeEventListener("mousemove", mouseMoveListener, false);
	}
}


