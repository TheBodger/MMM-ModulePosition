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

add option to save to custom css or confiog later


MM.getModules()