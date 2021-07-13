const Service = require("./model.js");
const axios = require("axios");
const SandboxEndPoint = require("../../../config/dev.js").IBSandBoxEndpoint;
const usps = require("./usps");
const InternationalBridge = require("./InternationalBridge");
const DeftShip = require("./DeftShip");
const UPS = require("./UPS");
const FEDEX = require("./fedEx");

const classes = { ...InternationalBridge, ...DeftShip, ...UPS , ...FEDEX};

module.exports = function (name) {
  return classes[name];
};
