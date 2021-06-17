require('dotenv').config();
const Joi = require('joi');
const { NETWORKS } = require('./constants');

const networksObject = Object.keys(NETWORKS).reduce(
  (r, networkName) => ({
    ...r,
    [`${networkName.toUpperCase()}_URI`]: Joi.string().uri().required(),
  }),
  {}
);
const schema = Joi.object({
  IPFS_URI: Joi.string().uri().required(),
  ...networksObject,
}).unknown();

const { error } = schema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}
