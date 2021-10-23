const mongoose = require("mongoose");
const { Schema } = mongoose;
const AutoIncrement = require("mongoose-sequence")(mongoose);
const moment = require("moment");
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
// const { Schema } = mongoose;

// const userSchema = new Schema({
//   googleId: String,
//   displayName: String
// });

// mongoose.model('User', userSchema);
const r = Math.floor(Math.random() * 5) + 1;
var user = new mongoose.Schema(
  {
    googleId: String,
    displayName: String,
    first_name: String,
    last_name: String,
    password: String,
    user_name: String,
    phone_number: String,
    date_registered: {
      type: String,
      default: () => moment().format("YYYY-MM-DD HH:mm"),
    },
    balance: { type: Number, default: 0 },
    status: { type: String, default: "activated" },
    forwarder: { type: Schema.Types.ObjectId, ref: "Forwarder" },
    type: { type: String, default: "regular" },
    billing_type: { type: String, default: "prepaid" },
    carrier: [{ type: Schema.Types.ObjectId, ref: "Carrier" }],
    service: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    tracking_watchlist: [{ type: String }],
  },
  { versionKey: false }
);
user.plugin(AutoIncrement, {
  inc_field: "user_id",
  start_seq: "300001",
  inc_amount: r,
});

user.plugin(mongoosePaginate);
user.index({ "$**": "text" });
module.exports = mongoose.model("User", user);
