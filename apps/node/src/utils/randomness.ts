import https from 'https';

const url = 'https://drand.cloudflare.com/8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce/public/latest';

export function fetchRandomness(): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';

            // Listen for data events to collect the chunks of data
            res.on('data', (chunk) => {
                data += chunk;
            });

            // Once the response is complete, parse the data and resolve the randomness
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    resolve(parsedData.randomness);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}
