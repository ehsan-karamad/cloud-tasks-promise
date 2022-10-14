
function getResponseResourceNames(origTaskName, responseQueueName) {
    const parts = origTaskName.split('/');
    if (parts.length !== 8) {
        throw new Error("Invalid task name.")
    }
    parts[7] = `resp-${parts[7]}`;
    parts[5] = responseQueueName;
    return {
        taskName: parts.join('/'),
        taskId: parts[7],
        queueName: parts.reverse().slice(2).reverse().join('/') 
    };
}


exports.getResponseResourceNames = getResponseResourceNames;