const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { Schema } = mongoose;

var carrier = new mongoose.Schema(
  {
    type: String,
    service: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    asset: {
      nick_name: String,
      logo_url: String,
      code: String,
      request_url: String,
      account_information: Object,
    },
    agent: { type: String, default: "default" },
    forwarder: { type: Schema.Types.ObjectId, ref: "Forwarder" },
    auth_group: [{ type: Schema.Types.ObjectId, ref: "User" }],
    user: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, default: "unactivated" },
  },
  { versionKey: false }
);
carrier.plugin(mongoosePaginate);
module.exports = mongoose.model("Carrier", carrier);
