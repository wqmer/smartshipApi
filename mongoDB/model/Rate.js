const mongoose = require('mongoose');
const { Schema } = mongoose;
var rate = new mongoose.Schema({
    type:{type:String,default:"default"},
    user_id: {
        type: Number,
        ref: 'User'
    },
    base_zone: {
        one: [Number],
        two: [Number],
        three: [Number],
        four: [Number],
        five: [Number],
        six: [Number],
        eight: [Number],
        nine: [Number],
        extra: [Number],
    },
    surcharge: [{
        name: String,
        amount: String
    }]
});

module.exports = mongoose.model('Rate', rate);