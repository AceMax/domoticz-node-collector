
const os   = require("os");
const fs   = require('fs');
const conf = JSON.parse(fs.readFileSync(__dirname + '/../conf/config.json'));

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

function addLog(module, text) {
  const currentTime = currentTimeString();
  const logText = (currentTime + ' - ' + module).padEnd(30, ' ') + ' - ' + text;

  fs.appendFile(conf.logFile, logText + os.EOL, function (err) {
    if (err) throw err;
  });
  console.log(logText);
}

exports.addLog = addLog;
