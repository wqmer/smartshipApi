const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;

var service = new mongoose.Schema(
  {
    carrier: { type: Schema.Types.ObjectId, ref: "Carrier" },
    mail_class: String,
    name: String,
    type: String,
    description: String,
    ship_parameters: {
      weight_min: Number,
      weight_max: Number,
      weight_unit: { type: String, default: "lb" },
      length_unit: String,
      delivery_days_min: Number,
      delivery_days_max: Number,
      dimension_weight_factor: Number,
      is_sender_lock: Boolean,
    },
    rate: [{ type: Schema.Types.ObjectId, ref: "Rate" }],
    auth_group: [{ type: Schema.Types.ObjectId, ref: "User" }],
    forwarder: { type: Schema.Types.ObjectId, ref: "Forwarder" },
    status: { type: String, default: "activated" },
  },
  { versionKey: false }
);
module.exports = mongoose.model("Service", service);
