
const mock_submit_orders = (request_body) => {
    const mock_response_success = {
        code : 0 ,
        message :'order created successfully',
        data: {
            order_id: request_body.order_id,
            tracking_number: '123456789',
            label_url: 'xxx/exmaple/123.png'
        }
    }
    const mock_response_error = {
        code : 1,
        message :'Can not create shipment due to ....',
        data: {
            order_id: request_body.order_id,
        },
    }
    let timeout_pool = [5000, 10000, 13000, 20000]
    let time_out = timeout_pool[Math.floor(Math.random() * timeout_pool.length)]
    console.log(timeout_pool)
    console.log(time_out)
    // delay random timeout ms to return response
    return new Promise(function (resolve, reject) {
        if (Math.floor(Math.random() * 10) > 2) {
            setTimeout(() => resolve(mock_response_success), time_out)
        } else {
            setTimeout(() => reject(mock_response_error), time_out)
        }
    });
}



module.exports = mock_submit_orders;