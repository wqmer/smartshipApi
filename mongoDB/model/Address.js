const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const { Schema } = mongoose;
const moment = require('moment');
var address = new mongoose.Schema({
    type: { type: String, default: "sender" },
    nickname: String,
    first_name: String,
    last_name: String,
    company: String,
    phone_number: String,
    address_one: String,
    address_two: String,
    zip_code: String,
    city: String,
    state: String,
    is_residential: Boolean,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    created_at: { type: String, default: () => moment().format('YYYY-MM-DD HH:mm') },
}, { versionKey: false });
address.plugin(mongoosePaginate);
module.exports = mongoose.model('Address', address);


// {        
//     type: String,
//     nickname:String,
//     first_name: String,
//     last_name: String,
//     company:String,
//     address_one: String,
//     address_two: String,
//     city:String,
//     state: String,
//     is_residential:Boolean,
// }