const { CloudTasksClient } = require('@google-cloud/tasks');

const CLOUD_TASKS_HEADER_TASK_NAME = 'X-CloudTasks-TaskName';
let client = new CloudTasksClient();
let PROJECT = 'ekaramad-playground';
let LOCATION = 'us-central1';
let REQUEST_QUEUE = 'default';
let RESPONSE_QUEUE = 'response-default';
let POLLING_INTERVAL = 2000;

exports.initAsyncCall = (config) => {
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

/**
 * Respond through a task queue.
 *
 * Stores the payload as the contents of a Cloud Tasks task which is destined to endpoint "url".
 * @param {*} url Address of the endpoint (Receiver).
 * @param {*} payload Response payload, stored as the body component of a POST request.
 * @param {*} incomingRequest The orignal incoming request from the endpoint. It is used to deduce the original task name.
 * @param {*} respQueueId The queue used for sending the response.
 * @return {*} The created task in the response queue. 
 */
exports.respond = (url, payload, incomingRequest) => {
    const taskId = incomingRequest.headers['x-cloudtasks-taskname'];
    const taskName = client.taskPath(PROJECT, LOCATION, RESPONSE_QUEUE, taskId);
    console.log(`Responding as ${taskName}`);
    return client.createTask({
        parent: client.queuePath(PROJECT, LOCATION, RESPONSE_QUEUE),
        task: {
            name: taskName,
            httpRequest: {
                headers: {
                    'content-type': 'application/json'
                },
                url: url,
                body: Buffer.from(JSON.stringify(payload)).toString('base64')
            },
            scheduleTime: {
                seconds: Math.floor(Date.now() / 1000) + 1800000, // 30 min from now
            }
        }
    });
};


/**
 * Performs an Asynchronous HTTP call through a message queue and waits for response.
 *
 * @param {*} url Target URL for the message destination.
 * @param {*} payload Paload, passed as a POST requests body.
 * @param {*} outboundQueue The task queue name used for the request.
 * @param {*} inboundQueue The task queue name used for the repsonse.
 * @param {*} oidcToken Optionally provided for authenticated endpoints.
 * @return {*} The response from the endpoint as an HTTP request (i.e., an object with body, header, and url).
 */
exports.call = (url, payload) => {
    return new Promise((resolve) => {
        client.createTask({
            parent: client.queuePath(PROJECT, LOCATION, REQUEST_QUEUE),
            task: {
                httpRequest: {
                    headers: {
                        'content-type': 'application/json'
                    },
                    url: url,
                    body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                }
            }
        }).then(createdTask => {
            const taskName = replaceQueueId(createdTask[0].name, RESPONSE_QUEUE);
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

let durableCallId = 1;
exports.durableCall = (url, payload, req) => {
    const callId = durableCallId++;
    const context = req.body._context || {};
    if (context.durableCallId) {
        return Promise.resolve(context);
    };
    return exports.call(url, payload);
}