const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
require("mongoose-double")(mongoose);
const moment = require("moment");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const beautifyUnique = require("mongoose-beautiful-unique-validation");
const { Schema } = mongoose;

var SchemaTypes = mongoose.Schema.Types;
var order = new mongoose.Schema(
  {
    order_id: {
      type: String,
      unique: "order_id must be unique !",
    },
    customer_order_id: {
      type: String,
      unique: "customer_order_id must be unique !",
    },
    type: { type: String, default: "Domestic_ship" },
    status: { type: String, default: "draft" },
    server_status: { type: String, default: "default" },
    service: {
      carrier: { type: Schema.Types.ObjectId, ref: "Carrier" },
      carrier_type: String,
      mail_class: String,
      asset: {
        logo_url: String,
        description: String,
        code: String,
      },
    },

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
      phone_number: String,
    },

    parcel: {
      label: String,
      sku: String,
      weight: { type: SchemaTypes.Double },
      isParcels: Boolean,
      parcelList: [
        {
          label: [String],
          sku: String,
          weight: { type: SchemaTypes.Double },
          length: { type: SchemaTypes.Double },
          width: { type: SchemaTypes.Double },
          height: { type: SchemaTypes.Double },
          tracking_numbers: [String],
          transfer_number: String,
          postage: {
            billing_amount: Object,
          },
        },
      ],
    },
    postage: {
      zone: { type: Number },
      estimate_amount: { type: SchemaTypes.Double },
      billing_amount: Object,
    },

    ledger: [{ type: Schema.Types.ObjectId, ref: "Ledger" }],

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    forwarder: {
      type: Schema.Types.ObjectId,
      ref: "Forwarder",
    },
    created_at: {
      type: String,
      default: () => moment().format("YYYY-MM-DD HH:mm:ss"),
    },
  },
  { versionKey: false }
);
order.plugin(mongoosePaginate);
// order.plugin(AutoIncrement, {
//     inc_field: 'order_counter',
//     start_seq: '00001',
//     inc_amount: 1
// });
// order.plugin(beautifyUnique);
// order.plugin(aggregatePaginate);
order.index({ "$**": "text" });
module.exports = mongoose.model("Order", order);
