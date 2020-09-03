const rp = require('request-promise');

// const get_tracking_fedx = (tracking_array) => {
//     let options = {
//         method: 'POST',
//         uri: 'http://api.posttestserver.com/post',
//         body: {
//             some: 'payload'
//         },
//         json: true // Automatically stringifies the body to JSON
//     };

//     rp(options)
//         .then(function (parsedBody) {
//             // POST succeeded...
//         })
//         .catch(function (err) {
//             // POST failed...
//         });
// }


const fedex_tracking = (request_body) => {
    return (
        {
            method: 'POST',
            uri: 'https://chukoula-api-test.herokuapp.com/trackShipmentFEDEX',
            body: request_body,        
            json: true // Automatically stringifies the body to JSON
        })
}

module.exports = {fedex_tracking}

