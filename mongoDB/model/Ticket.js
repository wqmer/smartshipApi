const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { Schema } = mongoose;
const moment = require("moment");

var ticket = new mongoose.Schema(
  {
    ticket_id: {
      type: String,
      unique: "order_id must be unique !",
    },
    type: String,
    status: { type: String, default: "created" },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    messages: [{ type: Schema.Types.ObjectId, ref: "Message" }],
    reference: {
      order: { type: Schema.Types.ObjectId, ref: "Order" },
    },
    created_at: {
      type: String,
      default: () => moment().format("YYYY-MM-DD HH:mm:ss"),
    },
    update_at: {
      type: String,
      default: () => moment().format("YYYY-MM-DD HH:mm:ss"),
    },
  },
  { versionKey: false }
);
ticket.plugin(mongoosePaginate);
module.exports = mongoose.model("Ticket", ticket);
