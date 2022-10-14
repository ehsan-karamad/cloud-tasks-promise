const { CloudTasksClient } = require('@google-cloud/tasks');
const { randomUUID } = require('crypto');


class AsyncCall {
    #projectId;
    #locationId;
    #client;
    constructor(projectId, locationId) {
        this.#projectId = projectId;
        this.#locationId = locationId;
        this.#client = new CloudTasksClient();
    }

    // Makes an outbound asynchronous HttpCall.
    async call(httpCall, queueId, responseQueue) {
        const client = this.#client;
        const projectId = this.#projectId;
        const locationId = this.#locationId;
        const opId = randomUUID();
        const headers = httpCall.headers || {}
        headers['Content-Type'] = 'application/json';
        const body = httpCall.body || {};
        if (!httpCall.url) {
            throw new Error('URL is missing.');
        } 
        const scheduleTime = {}
        if (httpCall.delaySec) {
            scheduleTime.seconds = Math.round(Date.now() / 1000) + delaySec;
        }
        queueId = queueId || 'default';
        responseQueue = responseQueue || 'default';
        return new Promise(async (resolve, reject) => {
            const taskName = client.taskPath(projectId, locationId, queueId, opId);
            const respTaskId = `resp-${opId}`;
            const responseTaskName = client.taskPath(projectId, locationId, responseQueue, respTaskId);
            const queueName = client.queuePath(projectId, locationId, queueId);
            await client.createTask({parent: queueName, task : {
                httpRequest : {
                    url: httpCall.url,
                    headers: httpCall.headers,
                    body: httpCall.body
                },
                scheduleTime : scheduleTime,
                name: taskName
            }});
            setInterval( async () => {
                try {
                    const response = await client.getTask({name: responseTaskName, responseView: 'FULL'});
                    resolve({
                        body: response[0].httpRequest.body.toString(),
                        headers: response[0].httpRequest.headers
                    });
                } catch(e) {
                    // Ignore;
                    console.log(`Still no resposne for ${opId}...`);
                }
            }, 1000);
        });
    }
}

exports.AsyncCall = AsyncCall;