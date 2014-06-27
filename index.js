var fs = require('fs'),
  util = require('util'),
  path = require('path'),
  events = require('events'),
  spawn = require('child_process').spawn,
  async = require('async'),
  mp3concat = require('mp3-concat')
  trumpet = require('trumpet'),
  smiltime = require('smil-clockvalue');

var start;

function DaisyStreamer(resource, dest, cb) {
  start = Date.now();
  if (!(this instanceof DaisyStreamer)) {
    return new DaisyStreamer(resource, dest, cb);
  }

  events.EventEmitter.call(this);

  var concatenater = mp3concat();
  var conName = 'concatenated.mp3';
  var audioFiles;

  async.waterfall([
    function(cb) {
      resource.getAudioFiles(cb);
    },
    function(audios, cb) {
      audioFiles = audios; 
      var offsets = [];
      concatenater.on('end', function() { cb(null, offsets) });
      concatenater.on('offset', function(off) { offsets.push(off) });

      concatenater.pipe(fs.createWriteStream(path.join(dest, conName)));

      async.eachSeries(audios, function(file, cb) {
        fs
          .createReadStream(path.join(resource.root, file))
          .on('end', cb)
          .pipe(concatenater, { end: false });
      }, function() {
        concatenater.end()
      });
    },
    function(offsets, cb) {
      resource.getSmils(function(err, smils) {
        cb(err, { offsets: offsets, smils: smils });
      });
    },
    function(data, cb) {
      var smils = data.smils;
      var offsets = data.offsets;

      async.each(smils, function(smil, smilcb) {
        var audiotr = trumpet()
        var audiows = audiotr.selectAll('audio', function(audio) {
          audio.getAttribute('src', function(src) {
            var offset = offsets[audioFiles.indexOf(src)].offset;
            audio.setAttribute('src', conName);

            audio.getAttribute('clip-begin', function(beg) {
              beg = smiltime(beg.split('=').pop());
              beg = Math.round((offset + beg / 1000) * 1000) / 1000;
              audio.setAttribute('clip-begin', 'npt=' + beg + 's');
            });
            audio.getAttribute('clip-end', function(end) {
              end = smiltime(end.split('=').pop());
              end = Math.round((offset + end / 1000) * 1000) / 1000;
              audio.setAttribute('clip-end', 'npt=' + end + 's');
            });
          });
        });

        fs
          .createReadStream(path.join(resource.root, smil))
          .pipe(audiotr)
          .pipe(fs.createWriteStream(path.join(dest, smil)).on('end', smilcb));
      }, function(err) {
        console.log('All done in ' + (Date.now() - start) + 'ms');
      });
    },
  ]);
}

util.inherits(DaisyStreamer, events.EventEmitter);

module.exports = DaisyStreamer;
