// JavaScript source code
interact('.resize-drag')
    .resizable({
        // resize from all edges and corners
        edges: { left: true, right: true, bottom: true, top: true },
        onmove: resizeListener,
        restrict: {
            restriction: "parent",
            endOnly: true,
            elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
        },

        inertia: true
    })
    .draggable({
        onmove: dragMoveListener,
        inertia: true,
        restrict: {
            restriction: "parent",
            endOnly: true,
            elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
        },
    })

interact('.save-button')
    .draggable({
        onmove: dragMoveListener,
        inertia: true,
        restrict: {
            endOnly: true,
            restriction: "parent",
            elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
        },
    })

function dragMoveListener(event) {
    console.log('dragMoveListener');
    var target = event.target,
        // keep the dragged position in the data-x/data-y attributes
        x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
        y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    // translate the element
    target.style.webkitTransform =
        target.style.transform =
        'translate(' + x + 'px, ' + y + 'px)';

    // update the position attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);

    if (target.nodeName.toLowerCase() == 'div') { // only report the DIVs we are moving around
        target.innerHTML = getMeta(event, target);
    }
}

function resizeListener(event) {
    console.log('resizeListener');

    var target = event.target
    var x = (parseFloat(target.getAttribute('data-x')) || 0)
    var y = (parseFloat(target.getAttribute('data-y')) || 0)

    // update the element's style
    target.style.width = event.rect.width + 'px'
    target.style.height = event.rect.height + 'px'

    // translate when resizing from top or left edges
    x += event.deltaRect.left
    y += event.deltaRect.top

    target.style.webkitTransform = target.style.transform =
        'translate(' + x + 'px,' + y + 'px)'

    target.setAttribute('data-x', x)
    target.setAttribute('data-y', y)

    target.innerHTML = getMeta(event, target);
}

function getMeta(event, target) {

    //id="module_5_newsfeed" of class:

    var textContent = "ID: " + target.id //+ "...dx:" + Math.round(event.dx) + '...dy:' + Math.round(event.dy)
    textContent +=  '...x:' + Math.round(target.getAttribute('data-x')) + '...y:' + Math.round(target.getAttribute('data-y'))
    textContent +=  '...w:' + Math.round(target.clientWidth) + '...h:' + Math.round(target.clientHeight)

    //determine if we are out of bounds // will also need a check of overlapping modules

    document.getElementById('save-button').innerText = "Save " + textContent;

    //get computed target details and its parents - is it available from interact ??

    var classnames = target.className.split(" ");
    var thismodulename = '';
    var thisconfigposition = '';

    //get the class we want (must be loaded into the modules array)

    if (classnames.includes('module')) {//we probably have a valid module entry to (re)position
        //class="module MMM-FeedDisplay MMM-FeedDisplay"

        //now find which module this is from the preload configs

        classnames.forEach(function (classname,index) {
            if (modules.indexOf(classname) > -1) {//found a module (may be one of many - need to add a selection option/use parents/use precedence ?)
                thismodulename = classname;
                thisconfigposition = configpositions[index];
            }
        })	

        var newx = parseFloat(target.getAttribute('data-x'));
        var newy = parseFloat(target.getAttribute('data-y'));
        var neww = target.clientWidth;
        var newh = target.clientHeight;

        var modpos = { modpos: { x: newx, y: newy, w: neww, h: newh }, displaypos: thisconfigposition };

        //for each div moved, we store it's details in an array to be used later when we save the data

        modulepositions[thismodulename] = modpos;

    }

    return textContent;
}
