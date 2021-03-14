const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const { Schema } = mongoose;

var service = new mongoose.Schema({
    carrier: String,
    mail_class:String,
    asset: {
        name: String,
        logo_url: String,
        description: String, 
        code: String,
    },
    agent:{ type: String, default: "default" },
    ship_parameters: {
        weight_min: Number,
        weight_max: Number,
        weight_unit:String,
        length_unit:String,
        delivery_days_min: Number,
        delivery_days_max: Number,
        dimension_weight_factor: Number,
        is_sender_lock: Boolean,
    },
    api_parameters: {
        is_api_rate: Boolean,
        request_url: String,
        account_information: Object,
    },
    rate: [{ type: Schema.Types.ObjectId, ref: 'Rate' }],
  
    forwarder: { type: Schema.Types.ObjectId, ref: 'Forwarder' },
    auth_group: [{ type: Number, ref: 'User' }],
    type: { type: String, default: "default" },
    status: { type: String, default: "unactivated" }

}, { versionKey: false });
module.exports = mongoose.model('Service', service);