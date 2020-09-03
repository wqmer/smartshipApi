const mongoose = require('mongoose');
const { Schema } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);
// const { Schema } = mongoose;

// const userSchema = new Schema({
//   googleId: String,
//   displayName: String
// });

// mongoose.model('User', userSchema);
const r = Math.floor(Math.random() * 5) + 1
var forwarder = new mongoose.Schema({
    googleId: String,
    displayName: String,
    first_name: String,
    last_name: String,
    password: String,
    forwarder_name: String,
    phone_number: String,
    date_registered:Date,
    type:{type:String , default:'chef'},
},{ versionKey: false });
forwarder.plugin(AutoIncrement, {
    inc_field: 'forwarder_id',
    start_seq: '900001',
    inc_amount: r
   
});
module.exports = mongoose.model('Forwarder', forwarder);