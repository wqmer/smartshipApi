const ticket = require("./ticket");
const carrier = require("./carrier");

module.exports = {
  ...ticket,
  ...carrier,
};
