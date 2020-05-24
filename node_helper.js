/* global Module, MMM-ModulePosition */

/* Magic Mirror
 * Module: node_helper
 *
 * By Neil Scott
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");

var moment = require("moment");
fs = require('fs');

//pseudo structures for commonality across all modules
//obtained from a helper file of modules

var LOG = require('../MMM-FeedUtilities/LOG');
var RSS = require('../MMM-FeedUtilities/RSS');

//// get required structures and utilities

//const structures = require("../MMM-ChartUtilities/structures");
//const utilities = require("../MMM-ChartUtilities/common");

//const JSONutils = new utilities.JSONutils();
//const configutils = new utilities.configutils();

module.exports = NodeHelper.create({

	start: function () {

		this.debug = true;

		console.log(this.name + ' is started!');
		this.consumerstorage = {}; // contains the config and feedstorage

		this.currentmoduleinstance = '';
		this.logger = {};

	},

	setconfig: function (aconfig) {

		var moduleinstance = aconfig.moduleinstance;
		var config = aconfig.config;

		//store a local copy so we dont have keep moving it about

		this.consumerstorage[moduleinstance] = { config: config, feedstorage: {} };

		//additional work to simplify the config for use in the module
	},

	showstatus: function (moduleinstance) {
		//console.log("MMM Module: " + moduleinstance);
		console.log('============================ start of status ========================================');

		console.log('config for consumer: ' + moduleinstance);

		console.log(this.consumerstorage[moduleinstance].config);

		console.log('============================= end of status =========================================');

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

	stop: function () {
		console.log("Shutting down node_helper");
	},

	socketNotificationReceived: function (notification, payload) {
		//console.log(this.name + " NODE_HELPER received a socket notification: " + notification + " - Payload: " + payload);

		//we will receive a payload with the moduleinstance of the consumerid in it so we can store data and respond to the correct instance of
		//the caller - i think that this may be possible!!

		if (this.logger[payload.moduleinstance] == null) {

			this.logger[payload.moduleinstance] = LOG.createLogger("logfile_" + payload.moduleinstance + ".log", payload.moduleinstance);

		};

		this.currentmoduleinstance = payload.moduleinstance;

		switch (notification) {
			case "CONFIG": this.setconfig(payload); break;
			case "RESET": this.reset(payload); break;
			case "WRITE_THIS":this.writethis(payload); break;
			case "STATUS": this.showstatus(payload); break;
		}
	},

	writethis: function (payload) {

		//1) create a custom_css set of entries at the module and actual names levels if a duplicate
		//using IDs not classes
		//ignore all ignorable modules and any not active or amended

		var modules = payload.payload;
		var css = '';

		for (var module in modules) {

			var thismod = modules[module];

			//may need to have them next to each other not a space, a space means any ? 

			if (!thismod.ignore && thismod.state.active && thismod.state.amended) {

				css = css + '.' + thismod.name +
					((thismod.duplicate) ? '#' + module : '') + 
					' {' +
					'\n\tleft:' + thismod.modpos.x + "px;" +
					'\n\ttop:' + thismod.modpos.y + "px;" +
					'\n\twidth:' + thismod.modpos.w + "px;" +
					'\n\theight:' + thismod.modpos.h + "px;" +
					'\n\tposition:' + 'absolute' + ";" +
					'\n}' + "\r\n"
				
            }
        }

		// dont check if there are no modpos ! just write it

		//create a directory to store these - not under modpos or add the directory as a gitignore

		//alert("BANG");

		var cssfilename = 'custom.css.' + new Date().getTime(); //simplest format though smelly

		fs.writeFile(cssfilename, css, 'utf8', (err) => {
			if(err) console.error(err);
			console.log('The file has been saved!');
		});

	},

	sendNotificationToMasterModule: function(stuff, stuff2){
		this.sendSocketNotification(stuff, stuff2);
	}

});