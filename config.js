/* Magic Mirror Config Sample
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 *
 * For more information how you can configurate this file
 * See https://github.com/MichMich/MagicMirror#configuration
 *
 */

var config = {
	address: "localhost", // Address to listen on, can be:
	// - "localhost", "127.0.0.1", "::1" to listen on loopback interface
	// - another specific IPv4/6 to listen on a specific interface
	// - "", "0.0.0.0", "::" to listen on any interface
	// Default, when address config is left out, is "localhost"
	port: 8080,
	ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"], // Set [] to allow all IP addresses
	// or add a specific IPv4 of 192.168.1.5 :
	// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.1.5"],
	// or IPv4 range of 192.168.3.0 --> 192.168.3.15 use CIDR format :
	// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.3.0/28"],

	language: "en",
	timeFormat: 24,
	units: "metric",
	// serverOnly:  true/false/"local" ,
	// local for armv6l processors, default 
	//   starts serveronly and then starts chrome browser
	// false, default for all  NON-armv6l devices
	// true, force serveronly mode, because you want to.. no UI on this device

	//  module position can be any of the following:

	//top_bar, top_left, top_center, top_right, 
	//upper_third, middle_center, lower_third, 
	//bottom_left, bottom_center, bottom_right, bottom_bar, 
	//fullscreen_above, and fullscreen_below

	modules: [
		//if using MMM-carousel, add/update the ignoreModules line to include module position
		//{
		//	module: 'MMM-Carousel',
		//	config: {
		//		ignoreModules:['MMM-ModulePosition'],
		//      }
		//},

		{
			module: "alert",
		},
		{
			module: "updatenotification",
			position: "top_bar",
		},
		{
			module: "clock",
			position: "top_left",
			config: {
				displayType: "digital",

			}
		},
		{
			module: "clock",
			position: "top_right",
			config: {
				displayType: "analog",
			}
		},
		{
			module: "compliments",
			position: "lower_third",
		},
		{
			module: "weather",
			position: "top_center",
			config: {
				type: "current",
				weatherProvider: "ukmetoffice",
				apiBase: "http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/",
				locationID: 350153, //Ascot http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/sitelist?key=2acecf0e-fb12-4870-b1e0-975b728172f7
				apiKey: "ADD YOUR API KEY HERE", // met office datapoints
			}
		},

		{
			module: "weather",
			position: "bottom_center",
			config: {
				type: "forecast",
				weatherProvider: "ukmetoffice",
				apiBase: "http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/",
				locationID: 350153, //Ascot http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/sitelist?key=2acecf0e-fb12-4870-b1e0-975b728172f7
				apiKey: "ADD YOUR API KEY HERE", // met office datapoints
			}
		},
		{
			module: "newsfeed",
			position: "bottom_bar",
			config: {
				feeds: [
					{
						title: "BBC UK",
						url: "https://feeds.bbci.co.uk/news/uk/rss.xml",
					},

					{
						title: "sky news",
						url: "https://feeds.skynews.com/feeds/rss/home.xml",
					},
				],
				showSourceTitle: true,
				showPublishDate: true,
				showDescription: true,
				broadcastNewsFeeds: false,
				broadcastNewsUpdates: false
			}
		},
		{
			module: "MMM-ModulePosition",
			position: "fullscreen_below",
		},
	]

};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") { module.exports = config; }

