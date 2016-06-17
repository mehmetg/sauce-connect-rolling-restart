# Sauce Connect HA Rolling Restart Example

##Purpose: 
Sample node.js command line tool to start/stop and rolling restart SC tunnels.
I am no Javascript expert, if there is a better way of doing it make pull request or write your own and comment here.

##License and Warranties: 

MIT License with **NO** implied or explicit warranties.

##Support: 

Ask here and I'll answer when I can, if not support@saucelabs.com is the best place to go.

##Usage:

###Set Credentials:
Either export to shell using: 
```
> export SAUCE_USERNAME=<username>
> export SAUCE_ACCESS_KEY=<access key>
```
or set it in the ```optionsTemplate``` configuration blob.

###Port and Tunnel Numbers:
Adjust the tunnel number and ports setting the following constants.
```
const MAX_PORT = 5000;
const MIN_PORT = 4500;
const NUMBER_OF_TUNNELS = 2;
```

###Run:
```> node sc_ha.js [start|stop|restart]```
