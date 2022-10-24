const { init, call, respond } = require('./async-call.js');
const { expect } = require('chai');

class CloudTasksMock {
    tasks = [];
    queuePath(project, location, queue) {
        return `projects/${project}/locations/${location}/queues/${queue}`
    }
    createTask(req) {
        req.task.name = req.parent + '/tasks/taskId';
        this.tasks.push(req);
        return Promise.resolve([req.task]);
    }
    getTask(req) {
        const task = this.tasks.find((t) => t.task.name === req.name);
        if (task) {
            const newTask = JSON.parse(JSON.stringify(task.task));
            newTask.httpRequest.body = Buffer.from(newTask.httpRequest.body, 'base64').toString('ascii');
            return Promise.resolve([newTask]);
        }
        return Promise.reject('task not found');
    }
};

describe('call/respond tests', () => {
    const client = new CloudTasksMock();
    init({ client: client, projectId: 'project', locationId: 'location', 'pollingInterval': 100 });
    it('Test request response path', async () => {
        const pendingResponse = call('test-url', '123', 'request-queue', 'response-queue');
        const fakeRequest = {
            headers: {
                'X-CloudTasks-TaskName': client.queuePath('project', 'location', 'request-queue') + '/tasks/taskId'
            }
        }
        await respond('unuused', '456', fakeRequest, 'response-queue')
        const response = await pendingResponse;
        expect(response.body).to.equal('456');
    });
});