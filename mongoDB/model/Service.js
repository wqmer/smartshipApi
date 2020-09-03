const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const { Schema } = mongoose;

var service = new mongoose.Schema({
    name: String,
    code: String,
    logo_url: String,
    description:String,
    is_api_rate: Boolean,
    ship_parameters:{   
        weight_min:Number,
        weight_max:Number,
        delivery_days_min:Number,  
        delivery_days_max:Number, 
        dimension_weight_factor:Number,
        is_sender_lock:Boolean,
    },
    api_parameters:{
     request_url:String,
     account_information:Object,
    },
    rate: [{ type: Schema.Types.ObjectId, ref: 'Rate' }],
    carrier: String,
    forwarder:{ type: Schema.Types.ObjectId, ref: 'Forwarder'},
    auth_group:[{type: Number,ref: 'User'}],
    type:{type:String,default:"default"},
    status:{type:String,default:"unactivated"}

}, { versionKey: false });
module.exports = mongoose.model('Service', service);