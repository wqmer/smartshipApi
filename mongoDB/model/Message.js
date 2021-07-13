const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const moment = require("moment");
const { Schema } = mongoose;

var message = new mongoose.Schema(
  {
    body : String,
    user : { type: Schema.Types.ObjectId, ref: "User" },
    supporter: { type: Schema.Types.ObjectId, ref: "Forwarder" },
    created_at: {
      type: String,
      default: () => moment().format("YYYY-MM-DD HH:mm:ss"),
    },
  },
  { versionKey: false }
);
message.plugin(mongoosePaginate);
module.exports = mongoose.model("Message", message);