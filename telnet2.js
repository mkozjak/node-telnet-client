var telnet = require('/home/mkozjak/opt/git/telnetclient/lib/telnetclient');
var connection = new telnet();
var args = process.argv.splice(2);
var cmd = args[0] + '\n';

var boxParams = {
  host: '10.142.0.39',
  port: '23',
  prompt: '/ # ',
  timeout: '1000',
  willEcho: 1
}

connection.on('ready', function() {
  console.log('CALLER: ready!');

  connection.exec(cmd, function(msg) {
    console.log('CALLER got a msg:', msg);
  });
});

connection.on('end', function() {
  console.log('CALLER: sent FIN packet to STB');
});

connection.on('close', function() {
  console.log('CALLER: closed!');
});

/*
connection.on('timeout', function() {
  console.log('CALLER: timeout');
});
*/

connection.connect(boxParams);
connection.setTimeout(boxParams.timeout, function() {
  connection.close();
  console.log('CALLER: timeout!');
});
