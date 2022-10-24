const { CloudTasksClient } = require('@google-cloud/tasks');
const { randomUUID } = require('crypto');

const CLOUD_TASKS_HEADER_TASK_NAME = 'X-CloudTasks-TaskName';
let client = new CloudTasksClient();
let PROJECT = 'ekaramad-playground';
let LOCATION = 'us-central1';
let POLLING_INTERVAL = 2000;

exports.init = (config) => {
    PROJECT = config.projectId || PROJECT;
    LOCATION = config.locationId || LOCATION;
    POLLING_INTERVAL = config.pollingInterval || pollingInterval;
    client = config.client || client;
};

function replaceQueueId(taskName, queueId) {
    const parts = taskName.split('/');
    parts[5] = queueId;
    return parts.join('/');
}

exports.respond = (url, payload, incomingRequest, respQueueId) => {
    const reqTaskName = incomingRequest.headers[CLOUD_TASKS_HEADER_TASK_NAME];
    const taskName = replaceQueueId(reqTaskName, respQueueId);
    return client.createTask({
        parent: client.queuePath(PROJECT, LOCATION, respQueueId),
        task: {
            name: taskName,
            httpRequest: {
                url: url,
                body: Buffer.from(JSON.stringify(payload)).toString('base64')
            },
            scheduleTime: {
                seconds: Math.floor(Date.now() / 1000) + 1800000, // 30 min from now
            }
        }
    });
};

exports.call = (url,
    payload,
    outboundQueue,
    inboundQueue,
    oidcToken) => {
    return new Promise((resolve) => {
        client.createTask({
            parent: client.queuePath(PROJECT, LOCATION, outboundQueue),
            task: {
                httpRequest: {
                    url: url,
                    body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                    oidcToken: oidcToken
                }
            }
        }).then(createdTask => {
            const taskName = replaceQueueId(createdTask[0].name, inboundQueue);
            const interval = setInterval(async () => {
                try {
                    const response = await client.getTask({ name: taskName });
                    response[0].httpRequest.body = JSON.parse(response[0].httpRequest.body);
                    resolve(response[0].httpRequest);
                    clearInterval(interval);
                } catch (e) {
                    // Ignore errors.
                    console.log(`Waiting for task: ${taskName}`);
                }
            }, POLLING_INTERVAL);
        });
    });
};
