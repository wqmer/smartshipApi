const ticket = require("./ticket");
const carrier = require("./carrier");
const service = require("./service");
const user = require("./user");
const ledgers = require("./ledgers");

module.exports = {
  ...ticket,
  ...carrier,
  ...service,
  ...user,
  ...ledgers
};
