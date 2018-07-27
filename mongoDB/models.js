const mongoose = require ('mongoose')

var asset =  new mongoose.Schema({
    name:String ,
    amount:Number
}, { versionKey: false });

module.exports =  mongoose.model('asset',asset,'asset');