const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;
const moment = require("moment");
var ledger = new mongoose.Schema(
  {
    type: String,
    order_id: String,
    balance: Number,
    amount: Number,
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
      default: () => moment().format("YYYY-MM-DD HH:mm"),
    },
  },
  { versionKey: false }
);
ledger.plugin(mongoosePaginate);
module.exports = mongoose.model("Ledger", ledger);
