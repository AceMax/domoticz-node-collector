/**
 * Script used to update Domoticz with power usage collected from
 * easee cloud API.
 * Author: Max Lindqvist 2021
 */

const fs    = require('fs');
const conf  = JSON.parse(fs.readFileSync(__dirname + '/conf/config.json'));
const easee = require("./easeejs/modules/easee");
const dz    = require("./domoticzjs/modules/domoticz");
const nibe  = require("./nibejs/modules/nibe");

async function main() {
  console.log("--- " + currentTimeString() + " ---");
  console.log("Fetching all chargers");
  let chargers = await easee.getChargers();

  for(let i = 0; i < chargers.length; i++) {
    let chargerState = await easee.getChargerState(chargers[i].id);

    console.log("Updating Domoticz - easee");
    let idx     = conf.devices.charger1;
    let power   = Math.round((chargerState.totalPower * 1000));
    let update  = await dz.updateUdevice(idx, 0, power);
    if (update) {
      console.log("Sucessfully updated device: " + idx + " with value: " + power);
    } else {
      console.log("Failed to update device: " + idx + " with value: " + power);
    }
  }

  let householdConsumption = await nibe.householdConsumption(conf.nibe.systemId);
  let hc = dz.updateUdevice(2, 0, householdConsumption.p1current + ';' + householdConsumption.p2current + ';' + householdConsumption.p3current)
  if (hc) {
    console.log("Updating Domoticz - Nibe currents");
  }
  let hp = dz.updateUdevice(3, 0, householdConsumption.totalPower);
  if (hp) {
    console.log("Updating Domoticz - Nibe power");
  }
}

/**
 * Returns a Y-M-D H:i:s formatted datetime string.
 */
function currentTimeString() {
  let date    = new Date();
  let year    = date.getFullYear();
  let month   = "0" + (date.getMonth() + 1);
  let day     = "0" + date.getDate();
  let hours   = "0" + date.getHours();
  let minutes = "0" + date.getMinutes();
  let seconds = "0" + date.getSeconds();

  let formattedTime = year + '-' + month.substr(-2) + '-' + day.substr(-2) + ' ' + hours.substr(-2) + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
  return formattedTime;
}

main();
setInterval(function() {
   main();
}, 300 * 1000);
