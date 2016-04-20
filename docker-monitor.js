// simple script to monitor a docker engine
// 14 March 2016
// https://docs.docker.com/engine/reference/api/docker_remote_api_v1.22/#monitor-docker-s-events
const https = require('https');
const fs = require('fs');

// for now we use a dummy registry, but we could link this to consul, etcd etc..
var registry = {};

// setup TLS config to be able to talk to docker, when run in a container we
// could use the unix socket as well avoiding the need for TLS
const certdir = process.env.HOME + '/.docker/machine/certs/';
const URL = process.env.DOCKER_HOST;
const hostparams = URL.match(/tcp:\/\/(.+):(\d+)/);

const options = {
    hostname: hostparams[1],
    port: hostparams[2],
    method: 'GET',
    key: fs.readFileSync(certdir + 'key.pem'),
    cert: fs.readFileSync(certdir + 'cert.pem'),
    ca: fs.readFileSync(certdir + 'ca.pem')
};

// how to pickup events, we are only interested in container events of type "start" and "die"
// clone the options and add specific items
const eventsOptions = Object.assign({}, options, {
    path: '/events?filters={"event":{"start":true,"die":true},"type":{"container":true}}',
    agent: false
});

// clone the options to use them for docker inspect
const inspectOptions = Object.assign({}, options);

// start picking up events
const req = https.request(eventsOptions, (res) => {
    //console.log('statusCode: ', res.statusCode);
    //console.log('headers: ', res.headers);

    res.on('data', (d) => {
        const data = JSON.parse(d.toString());
        if (data.status == "start") {
            handleStart(data.id);
        }
        if (data.status == "die") {
            // remove the item from the registry
            registry[data.id] = undefined;
            // and show the registry
            console.log("Registry:", JSON.stringify(registry));
        }
    });
});
req.end();

// we are interested in SERVICE_* items passed to the enviroment at startup
function filterEnv(envData) {
    var envObj = {};
    envData.forEach((item) => {
        if (item.match(/^SERVICE_/)) {
            var arr = item.split("=", 2);
            envObj[arr[0]] = arr[1];
        }
    });
    return envObj;
}

// change "80/TCP" into 80
function normalizePort(portData) {
    return Number(portData.split("/")[0]);
}

// when a start event is detected, inspect the container to find the data we need
function handleStart(id) {
    inspectOptions.path = `/containers/${id}/json`;
    const iReq = https.request(inspectOptions, (res) => {
        res.on('data', (d) => {
            const data = JSON.parse(d.toString());
            const envData = filterEnv(data.Config.Env);
            const item = {
                "ID": data.Config.Hostname,
                "Name": envData.SERVICE_NAME,
                "Tags": [envData.SERVICE_TAGS],
                "Port": normalizePort(Object.keys(data.Config.ExposedPorts)[0]),
                "Address": data.NetworkSettings.Networks.bridge.IPAddress
            }
            // add the results to the registry
            registry[id] = item;
            // and show the registry
            console.log("Registry:", JSON.stringify(registry));
        });
    });
    iReq.end();
    iReq.on('error', (e) => {
        console.error(e);
    });
}


req.on('error', (e) => {
    console.error(e);
});
