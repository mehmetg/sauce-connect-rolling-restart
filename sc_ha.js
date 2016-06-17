var sauceConnectLauncher = require('sauce-connect-launcher');
var async = require('async');
var path = require('path');
var fs = require('fs');
var jsonfile = require('jsonfile');
var extend = require('extend');

var tempPath = path.resolve(__dirname, 'tmp');
var tunnelFilePath = path.resolve(tempPath, 'tunnels.json');
var tunnelInfo;

const MAX_PORT = 5000;
const MIN_PORT = 4500;
const NUMBER_OF_TUNNELS = 2;

var optionsTemplate = {

    // Sauce Labs username.  You can also pass this through the
    // SAUCE_USERNAME environment variable
    //username: null,

    // Sauce Labs access key.  You can also pass this through the
    // SAUCE_ACCESS_KEY environment variable
    //accessKey: null,

    // Log output from the `sc` process to stdout?
    verbose: false,

    // Enable verbose debugging (optional)
    verboseDebugging: false,

    // Port on which Sauce Connect's Selenium relay will listen for
    // requests. Default 4445. (optional)
    port: null,

    // Proxy host and port that Sauce Connect should use to connect to
    // the Sauce Labs cloud. e.g. "localhost:1234" (optional)
    proxy: null,

    // Change sauce connect logfile location (optional)
    logfile: null,

    // Period to log statistics about HTTP traffic in seconds (optional)
    logStats: null,

    // Maximum size before which the logfile is rotated (optional)
    maxLogsize: null,

    // Set to true to perform checks to detect possible misconfiguration or problems (optional)
    doctor: null,

    // Identity the tunnel for concurrent tunnels (optional)
    tunnelIdentifier: null,

    // an array or comma-separated list of regexes whose matches
    // will not go through the tunnel. (optional)
    fastFailRexegps: null,

    // an array or comma-separated list of domains that will not go
    // through the tunnel. (optional)
    directDomains: null,

    // A function to optionally write sauce-connect-launcher log messages.
    // e.g. `console.log`.  (optional)
    logger: function (message) {
    },

    // an optional suffix to be appended to the `readyFile` name.
    // useful when running multiple tunnels on the same machine,
    // such as in a continuous integration environment. (optional)
    readyFileId: null,

    waitTunnelShutdown: true,

    noRemoveCollidingTunnels: true,

    pidfile: null
};


function startSauceConnect(options) {
    return new Promise(function (resolve, reject) {
        sauceConnectLauncher(options, function (err, sauceConnectProcess) {
            if (err) {
                console.error(err.message);
                reject(err.message);
            } else {
                console.log("Started Sauce Connect Process.");
                resolve(sauceConnectProcess);
            }
        });
    });
}
function startTunnels(startPort, numTunnels) {
    return new Promise(function (resolve, reject) {
        var port = startPort,
            portEnd = port + numTunnels;
        var tunnelInfo = [];

        fs.mkdir(tempPath, function (e) {
            if (!e || (e && e.code === 'EEXIST')) {
                async.whilst(
                    function () {
                        return port < portEnd;
                    },
                    function (next) {
                        optionsTemplate['port'] = port;
                        optionsTemplate['readyFileId'] = port.toString();
                        optionsTemplate['pidfile'] = path.resolve(tempPath, port.toString() + '.pid');
                        startSauceConnect(optionsTemplate).then(function (p) {
                            //console.log(p);
                            tunnelInfo.push({pid: p.pid, port: port});
                            p.unref();
                            port++;
                            next();
                        });
                    },
                    function (err) {
                        console.log(tunnelInfo);
                        jsonfile.writeFileSync(tunnelFilePath, tunnelInfo);
                        resolve(true);
                    }
                );
            } else {
                //debug
                console.error(e.message);
                reject(e);
            }
        });
    })
}
function readTunnels() {
    return new Promise(function (resolve, reject) {
        try {
            resolve(jsonfile.readFileSync(tunnelFilePath));
        } catch (err) {
            reject([]);
        }
    });
}
function termTunnels(tunnelData) {

}
function stopTunnels(fromFile) {
    return new Promise(function (resolve, reject) {
        readTunnels().then(function (tunnelData) {
            if(fromFile) {
                tunnelInfo = tunnelData;
            }
            //console.log('+++++++');
            //console.log(tunnelInfo);
            //console.log('+++++++');
            async.whilst(
                function () {
                    return tunnelInfo.length > 0;
                },
                function (next) {
                    var tunnelDatum = tunnelInfo.pop();
                    //console.log(tunnelInfo);
                    var pidFile = path.resolve(tempPath, tunnelDatum['pid'] + '.pid');
                    try {
                        process.kill(tunnelDatum['pid'], 'SIGTERM');
                        if (path.existsSync('foo.txt')) {
                            tunnelData.push(tunnelDatum);
                        }
                    } catch (err) {
                        //no proc found
                    }
                    next();
                },
                function (err) {
                    resolve(true);
                }
            );
        });

    })
}
function getStartPort() {
    return new Promise(function (resolve, reject) {
        var upperLimit = 0;
        readTunnels().then(function (tunnelData) {
            tunnelInfo = extend(true, [], tunnelData);
            //console.log('----');
            //console.log(tunnelInfo);
            //console.log('----');
            if (tunnelData.length > 0) {
                tunnelData.forEach(function (item, index) {
                    if (item['port'] > upperLimit) {
                        upperLimit = item['port'];
                    }
                });
                if (++upperLimit > MAX_PORT) {
                    upperLimit = MIN_PORT;
                }
                resolve(upperLimit);
            } else {
                reject(0);
            }

        })
    })
}

if (process.argv[2] === 'start') {
    startTunnels(MIN_PORT, NUMBER_OF_TUNNELS).then(function (e) {
            console.log("All tunnels successfully launched!");
            process.kill(process.pid, 'SIGTERM')
        }
    );
} else if (process.argv[2] === 'stop') {
    stopTunnels(true).then(function (r) {
        if (r === true) {
            console.log("Tunnels stopped successfully!");
        } else {
            console.error("Error: Tunnels may have not been stopped successfully!");
        }
    })
    //get existing tunnels
    //kill existing tunnels
    //clean up pid files.
} else if (process.argv[2] === 'restart') {
    //get existing tunnels
    //get new port range
    //start tunnels
    //kill existing tunnels.
    //clean up pid files
    getStartPort().then(function (port) {
        //console.log(port);
        startTunnels(port, NUMBER_OF_TUNNELS).then(function (e) {
            console.log("New tunnels successfully launched!");
            stopTunnels(false).then(function (r) {
                if (r === true) {
                    console.log("Old tunnels stopped successfully!");
                } else {
                    console.error("Error: Old tunnels may have not been stopped successfully!");
                }
                process.kill(process.pid, 'SIGTERM')
            })
        })

    })
} else {
    console.error('Usage: node sc_ha.js [start|stop|restart]');
}





