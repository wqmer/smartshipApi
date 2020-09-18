const Service = require('./model.js')
const axios = require('axios');
const SandboxEndPoint = require('../../../config/dev.js').IBSandBoxEndpoint;
const usps = require("./usps")


const classes = {...usps};


module.exports = function(name) { return classes[name]; }