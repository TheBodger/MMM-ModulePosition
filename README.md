
# MMM-ModulePosition

This magic mirror module will enable the user to dynamically select, drag and resize any module defined in their magic mirror configuration. When the desired layout is reached, the settings can be saved. These are saved as a custom CSS and custom config. The preferred way to is to use the custom CSS 

### Example
![Example of MMM-ModulePosition resizing modules](images/screenshot_edit.png?raw=true "Example screenshot")

### Dependencies

This module requires MMM-FeedUtilities to be installed.

Before installing this module;
		use https://github.com/TheBodger/MMM-FeedUtilities to setup the MMM-Feed... dependencies and  install all modules.

## Installation
To install the module, use your terminal to:
1. Navigate to your MagicMirror's modules folder. If you are using the default installation directory, use the command:<br />`cd ~/MagicMirror/modules`
2. Clone the module:<br />`git clone https://github.com/TheBodger/MMM-ModulePosition`

## Using the module

### MagicMirror² Configuration

To use this module, add the following minimum configuration block to the END of the modules array in the `config/config.js` file:
```js
		{
			module: "MMM-ModulePosition",
			position: "fullscreen_below",
		},
```
This module uses the names allocated by the MM process, which will change depending on their absolute order within the config files. MAke sure that this module is the last in the configuration file to ensure all modules have the correct name when the new layout is saved.

If the module is added to the config, it will use the previous layout saved if still available.

Once the layout is saved, using the SAVE button, then apply them as follows so that they are used by the MM and you can remove this module from the configuration file.


### Configuration Options

| Option                  | Details
|------------------------ |--------------
| `text`                | *Optional* - <br><br> **Possible values:** Any string.<br> **Default value:** "... loading"
| `easeAmount`            | *Required* - the percentage of the total delta to move an object during each frame<br><br> **Possible values:** a numeric value where 1 = 100%<br> **Default value:** 0.3
| `FPS`         | *Required* - frames per second of the animation of objects during resizing and dragging<br><br> **Possible values:** a whole numeric value between 5 and 60 <br> **Default value:** 15
| `minimum_size`            | *Required* - minimum size in pixels that the resizer will allow an objects width and height to be.<br><br> **Possible values:** a whole number of pixels <br> **Default value:** 50 
| `canvasid`        | *Required* - the name of the dom element within the MM display to use as a relative container for any movements. If not set then the window is used.<br><br> **Possible values:** any dom element defined within the current MM display <br> **Default value:** `"body"`
| `grid`            |*Required* -  the size of a grid in pixels to snap modules to when dragging and resizing<br><br> **Possible values:** a whole number of pixels. <br> **Default value:** 10

### Additional Notes

This is a WIP; changes are being made all the time to improve the compatibility across the modules. 

Leave settings as the default for best results, minimum size is probably the only setting that may need amending depening on the size of the MM2 display
