# ModulePosition

when all modules dom objects loaded

get a list of all the modules using the setconfig process

and get the dom gertelement by class name of all the module elements and store these in an array

now add the drag class to all the modeul elements

add the button di at the very top (do this through a normal getdom)

tell the nodehelper to store the config

each time the user presses save, create a timstamped copy of the config and custom css

write them via nodehelper to disk

add them to custom css it is automatic and always changes the positions BUT removes anything
that is already there AND AND wont work for multipel instances of the same module
SO we have to add modpos to config and the user has to add code to position accordingly


MM.getModules()

ignore modeules positioned in fullscreen above and below

add a crop option button to the control panel with the save button and meta data - have it normally transparent and only opaque when mouse over the div

track movement of the modules by their indentifier ; the location in the config should match the identifier number - so if i need to add two weathers new modpos to the config, i should be able to match on location or if not some unique part of each config to determine which config entry relates to wich modeul identifier

if multiple copies of ther same module are foun dont write out to the CSS, just the config - add a note to the CSS that multpiple entries ofound and css cant be used

