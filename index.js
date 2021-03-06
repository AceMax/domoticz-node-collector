/**
 * Script used to update Domoticz with power usage collected from
 * easee and Nibe cloud API.
 * Author: Max Lindqvist 2021
 */

const fs      = require('fs');
const conf    = JSON.parse(fs.readFileSync(__dirname + '/conf/config.json'));
const logging = require("./modules/logging");
const easee   = require("./easeejs/modules/easee");
const dz      = require("./domoticzjs/modules/domoticz");
const nibe    = require("./nibejs/modules/nibe");

var chargeAmps = 10;

logging.addLog('system', "Domoticz Node Collector starting.");

async function main() {
  logging.addLog('easee', 'Fetching all chargers');
  let chargers = await easee.getChargers();

  for(let i = 0; i < chargers.length; i++) {
    var chargerState = await easee.getChargerState(chargers[i].id);

    let idx     = conf.devices.charger1;
    let power   = Math.round((chargerState.totalPower * 1000));
    let update  = await dz.updateUdevice(idx, 0, power);
    if (update) {
      logging.addLog('domoticz', 'Sucessfully updated device: ' + idx + ' with value: ' + power + 'W');
    } else {
      logging.addLog('domoticz', 'Failed to update device: ' + idx + ' with value: ' + power + 'W');
    }
  }

  logging.addLog('nibe', 'Fetching currents');
  let householdConsumption = await nibe.householdConsumption(conf.nibe.systemId);
  let hc = await dz.updateUdevice(conf.nibe.currents, 0, householdConsumption.p1current + ';' + householdConsumption.p2current + ';' + householdConsumption.p3current)
  if (hc) {
    logging.addLog('domoticz', 'Sucessfully updated device: ' + conf.nibe.currents + ' with values: ' + householdConsumption.p1current + 'A, ' + householdConsumption.p2current + 'A, ' + householdConsumption.p3current + 'A');

    // Adjust easee charging
    const mainFuse = 16;
    const cReserve = 1;;

    logging.addLog('easee', 'Fetching charge current limits');
    let currentLimits = await easee.getSiteCurrentLimits(conf.easee.siteId, conf.easee.circuitId);
    logging.addLog('easee', 'Current charge current limit: ' + currentLimits.maxCircuitCurrentP3 + 'A');

    if (chargerState.totalPower > 0) {
      logging.addLog('easee', 'Charging in progress using: ' + chargerState.totalPower + 'W');
      if (Math.ceil(householdConsumption.p3current) > (mainFuse - cReserve)) {
        chargeAmps = Math.ceil(currentLimits.maxCircuitCurrentP3 - (householdConsumption.p3current - (mainFuse - cReserve)));
      } else if (Math.ceil(householdConsumption.p3current) < (mainFuse - cReserve)) {
        chargeAmps = Math.ceil(currentLimits.maxCircuitCurrentP3 + (mainFuse - cReserve - householdConsumption.p3current));
      }

      if (currentLimits.maxCircuitCurrentP3 != chargeAmps) {
        logging.addLog('easee', 'Current charge limit: ' + currentLimits.maxCircuitCurrentP3 + 'A. Proposed limit: ' + chargeAmps + 'A');
        logging.addLog('easee', 'New charging current limit: ' + chargeAmps + 'A');
        let newCurrentLimits = await easee.setSiteCurrentLimits(conf.easee.siteId, conf.easee.circuitId, chargeAmps);
        if (newCurrentLimits) {
          logging.addLog('easee', 'Successfully changed charging current limit to: ' + chargeAmps + 'A');
        } else {
          logging.addLog('easee', 'Failed to change charging current limit to: ' + chargeAmps + 'A');
        }
      }

    } else {
      logging.addLog('easee', 'Not charging.');
      // Not charging
      if (currentLimits.maxCircuitCurrentP3 != chargeAmps) {
        logging.addLog('easee', 'Setting startup charging current to: 10A');
        let newCurrentLimits = await easee.setSiteCurrentLimits(conf.easee.siteId, conf.easee.circuitId, 10);
      }
    }
  } else {
    logging.addLog('domoticz', 'Failed to update device: ' + conf.nibe.currents + ' with values: ' + householdConsumption.p1current + 'A, ' + householdConsumption.p2current + 'A, ' + householdConsumption.p3current + 'A');
  }

  let hp = await dz.updateUdevice(conf.nibe.power, 0, householdConsumption.totalPower);
  if (hp) {
    logging.addLog('domoticz', 'Sucessfully updated device: ' + conf.nibe.power + ' with value: ' + householdConsumption.totalPower + 'W');
  } else {
    logging.addLog('domoticz', 'Failed to update device: ' + conf.nibe.power + ' with value: ' + householdConsumption.totalPower + 'W');
  }
}

main();
setInterval(function() {
   main();
}, 300 * 1000);
