var crypto = require('crypto')

module.exports = {
    MD5_SUFFIX: 'dsfsdssdeckdkekekkcckckckcckodododc,sdmeoeeoidjs~kEWICCJD',
    md5: function (pwd) {
        let md5 = crypto.createHash('md5');
        return md5.update(pwd).digest('hex')
    },
    responseClient(res, httpCode = 500, code = 3, message = 'internal error', data = {}) {
        let responseData = {};
        responseData.code = code;
        responseData.message = message;
        responseData.data = data;
        res.status(httpCode).json(responseData)
    },

    error_message_handle : function(){

    }

    // address_format: {
    //     Company,
    //     sender_name,
    //     add1,
    //     add2,
    //     state,
    //     city,
    //     zipcode,
    //     country,
    //     phone_number
    // }
}