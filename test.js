const {AsyncCall} = require('./async-call');

const URL = 'https://www.google.ca';

const stub = new AsyncCall('ekaramad-playground', 'us-central1');

async function main() {
    const response = await stub.call(
        {
            url: URL,
            headers : {
                'foo' : 'bar'
            },
            body: { name: "Ehsan"},
        },
        'default',
        'response-default'
    );
    console.log('response');
}

main().then( () => console.log("done"));