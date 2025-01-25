
# MMM-ModulePosition

This magic mirror module will enable the user to dynamically select, drag and resize any module defined in their magic mirror configuration. When the desired layout is reached, the settings can be saved. These are saved as a custom CSS.

### Examples:

Showing before and after changing the layout, with text honoring the new size and the grid turned on to enable snapping, and the final layout with the module removed from the config file
![Example of MMM-ModulePosition resizing modules](images/screenshot_edit.png?raw=true "Example screenshot")
![Example of MMM-ModulePosition resizing modules](images/screenshot_edit2.png?raw=true "Example screenshot")
![Example of MMM-ModulePosition resizing modules](images/screenshot_edit3.png?raw=true "Example screenshot")
![Example of MMM-ModulePosition resizing modules](images/screenshot_save.png?raw=true "Alert message on Save")

### Dependencies

This module requires MMM-FeedUtilities to be installed.

Before installing this module;
		use https://github.com/TheBodger/MMM-FeedUtilities to setup the MMM-Feed... dependencies and  install all modules.

## Installation
To install the module, use your terminal to:
1. Navigate to your MagicMirror's modules folder. If you are using the default installation directory, use the command:<br />`cd ~/MagicMirror/modules`
2. Clone the module:<br />`git clone https://github.com/TheBodger/MMM-ModulePosition `

## Using the module

### MagicMirror² Configuration

To use this module, add the following minimum configuration block to the END of the modules array in the `config/config.js` file:
```js
		{
			module: "MMM-ModulePosition",
			position: "fullscreen_below",
		},
```
### Not quite WYSIWYG

When repositioning modules, their contents may left justify. This is only in the positioner and when the custom.css is applied and the postioning module removed from the config, the correct justification will be shown on you magic mirror.
### MMM-Carousel compatability

if using MMM-carousel, add/update the ignoreModules line to include module position otherwise the module wont operate correctly
```js
		{
			module: 'MMM-Carousel',
			config: {
				ignoreModules:['MMM-ModulePosition'],
				//rest of config
		      }
		},
```
If you are using the carousel arrow keys that appear on the screen, these wil be disabled when running this module. there is a simple workaround.

If the carousel transitioninterval is set to 0, temporarily change it to 10000 ~(10 seconds) which will ensure each slide is shown whilst this module is running. Any changes made on any of the slides during an edit session will be captured in the save file and can be used in custom.css as described below.

This also works if you already have the slides changing automatically.

### Saving and using custom.css

This module uses the names allocated by the MM process, which will change depending on their absolute order within the config files. Make sure that this module is the last in the configuration file to ensure all modules have the correct name when the new layout is saved.

Drag and /or resize the modules displayed on the MM display. Some module contents will resize to fit the new module size, others will ignore the size set due to how that particular module is coded.

Once the layout is saved, using the SAVE button, it can be found in the css sub folder of the MMM-ModulePosition folder (it should be here: modules/MMM-ModulePosition/css/)

Each save is given the name of custom.css.timestamp, where timestamp is a numeric representation of the time when the file is saved and will always be unique. This is to allow multiple saves within one positioning session without overwriting each save.

To use the saved custom css file, simply copy all the contents and paste into the bottom of the custom.css file found in the magic mirror css folder, normally found as a sub folder to the MagicMirror folder. Remove this module from the config file and restart MM2.

If any new modules are added to the MM config, to maintain the validity of the new custom CSS, ensure they are added at the end of the modules list. If a module is removed, then the custom CSS may not behave as expected and a new custom CSS will need to be created.


### Configuration Options

| Option                  | Details
|------------------------ |--------------
| `text`                | *Optional* - <br><br> **Possible values:** Any string.<br> **Default value:** "... loading"
| `easeAmount`            | *Optional* - the percentage of the total delta to move an object during each frame<br><br> **Possible values:** a numeric value where 1 = 100%<br> **Default value:** 0.3
| `FPS`         | *Optional* - frames per second of the animation of objects during resizing and dragging<br><br> **Possible values:** a whole numeric value between 5 and 60 <br> **Default value:** 15
| `minimum_size`            | *Optional* - minimum size in pixels that the resizer will allow an objects width and height to be.<br><br> **Possible values:** a whole number of pixels <br> **Default value:** 50 
| `canvasid`        | *Optional* - the name of the dom element within the MM display to use as a relative container for any movements. If not set then the window is used.<br><br> **Possible values:** any dom element defined within the current MM display <br> **Default value:** `"body"`
| `grid`            |*Optional* -  the size of a grid in pixels to snap modules to when dragging and resizing<br><br> **Possible values:** a whole number of pixels. <br> **Default value:** 10
| `showAlerts`            |*Optional* -  display javscript alerts on the screen that are created for events such as custom css file save<br><br> **Possible values:** true,false <br> **Default value:** true

### Additional Notes

This is a WIP; changes are being made all the time to improve the compatibility across the modules. 

Leave settings as the default for best results, minimum size is probably the only setting that may need amending depending on the size of the MM2 display

This has been tested with a number of different MM layouts and layout options. It may however not cater for all combinations and may have problems with modules that adjust the modules displayed in the MM display or that swap between sets of visible modules. Try it out to see if it works ok with your favorite layout. Raise an issue in Github if it doesnt work as expected.
