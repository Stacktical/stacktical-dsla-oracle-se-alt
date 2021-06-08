const axios = require("axios");
const { HARMONY_URI } = process.env;

async function getEndingEpoch(params) {
  const currentEpoch = await getCurrentEpoch();
  // up to 30 epochs of information
  for (let index = 1; index < 29; index++) {
    const targetEpoch = currentEpoch - index;
    const lastBlock = await getEpochLastBlock(targetEpoch);
    const { timestamp } = await getBlockByNumber(lastBlock);
    if (timestamp <= params.sla_monitoring_end) return targetEpoch;
  }
}

async function getStartingEpoch(params) {
  const currentEpoch = await getCurrentEpoch();
  // up to 30 epochs of information
  for (let index = 29; index > 0; index--) {
    const targetEpoch = currentEpoch - index;
    const lastBlock = await getEpochLastBlock(targetEpoch);
    const { timestamp } = await getBlockByNumber(lastBlock);
    if (timestamp >= params.sla_monitoring_start) return targetEpoch + 1;
  }
}

async function getCurrentEpoch() {
  const {
    data: { result: currentEpoch },
  } = await axios.post(HARMONY_URI, {
    jsonrpc: "2.0",
    id: 1,
    method: "hmyv2_getEpoch",
    params: [],
  });
  return currentEpoch;
}

async function getEpochLastBlock(epochNumber) {
  const {
    data: { result: lastBlockNumber },
  } = await axios.post(HARMONY_URI, {
    jsonrpc: "2.0",
    id: 1,
    method: "hmy_epochLastBlock",
    params: [epochNumber],
  });
  return lastBlockNumber;
}

async function getValidatorInformation(validatorAddress) {
  const {
    data: { result: validatorInformation },
  } = await axios.post(HARMONY_URI, {
    jsonrpc: "2.0",
    id: 1,
    method: "hmyv2_getValidatorInformation",
    params: [validatorAddress],
  });
  return {
    address: validatorInformation.validator.address,
    name: validatorInformation.validator.name,
    apr: validatorInformation.lifetime["epoch-apr"],
  };
}

async function getBlockByNumber(blockNumber) {
  const {
    data: { result: currentBlock },
  } = await axios.post(HARMONY_URI, {
    jsonrpc: "2.0",
    id: 1,
    method: "hmyv2_getBlockByNumber",
    params: [
      blockNumber,
      {
        fullTx: false,
        inclTx: false,
        InclStaking: false,
      },
    ],
  });
  return currentBlock;
}

module.exports = {
  getStartingEpoch,
  getEndingEpoch,
  getValidatorInformation,
};
