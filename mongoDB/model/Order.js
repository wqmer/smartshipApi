const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');
require('mongoose-double')(mongoose);
const moment = require('moment');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const { Schema } = mongoose;

var SchemaTypes = mongoose.Schema.Types;
var order = new mongoose.Schema({
    service_class: { type: String, default: 'Domestic_ship' },
    order_id: {
        type: String,
        unique: "order_id must be unique !"
    },
    customer_order_id: {
        type: String,
        unique: "customer_order_id must be unique !"
    },
    status: { type: String, default: 'draft' },
    server_status: { type: String, default: 'default' },
    sender: {
        Company: String,
        sender_name: String,
        add1: String,
        add2: String,
        state: String,
        city: String,
        zipcode: String,
        country: String,
        phone_number: String,
    },
    recipient: {
        Company: String,
        recipient_name: String,
        add1: String,
        add2: String,
        state: String,
        city: String,
        zipcode: String,
        country: String,
        phone_number: String
    },
    parcel: {
        sku: String,
        weight: { type: SchemaTypes.Double },
        length: { type: SchemaTypes.Double },
        width: { type: SchemaTypes.Double },
        height: { type: SchemaTypes.Double },
        phone_number: String,
        tracking_number: String,
        transfer_number: String,
    },
    postage: {
        estimate_amount: { type: SchemaTypes.Double },
        billing_amount: Number,
    },
    carrier: String,
    user : {
        type: Schema.Types.ObjectId, 
        ref: 'User'
    },  
    forwarder: {
        type: Schema.Types.ObjectId, 
        ref: 'Forwarder'
    },  
    // forwarder_id: { type: Number },

    // user_id: { type: Number  },
    // user_object_id: {
    //     type: Schema.Types.ObjectId, 
    //     ref: 'User'
    // },   

    created_at: { type: String, default: () => moment().format('YYYY-MM-DD HH:mm') },
}, { versionKey: false });
order.plugin(mongoosePaginate);
// order.plugin(AutoIncrement, {
//     inc_field: 'order_counter',
//     start_seq: '00001',
//     inc_amount: 1
// });
// order.plugin(beautifyUnique);
// order.plugin(aggregatePaginate);
order.index({ '$**': 'text' });
module.exports = mongoose.model('Order', order);