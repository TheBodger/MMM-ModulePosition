// JavaScript source code

//this must be declared first to ensure that the setconfig is run before the
//code in script1 tries to use the variables

//will need to get the instance divs from the array of all modules + their identity

var modules = [];
var modulepositions = [];
var configpositions = [];

function setconfig(config) {

    //find all the modules in the config

    var configmodules = config.modules;

    configmodules.forEach(module =>
        modules.push(module.module)
    );
    configmodules.forEach(module =>
        configpositions.push(module.position)
    );
    configmodules.forEach(module =>
        modulepositions[module.module] = {}
    );

}

//button handler

function saveFunction() {

    console.log("saving config");

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

}

//config handler

// need to get access to the full config so we load it as a script which might break something

setconfig(config);
