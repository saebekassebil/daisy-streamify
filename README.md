# daisy-streamify

**Very WIP**

```js
var resource = require('daisy-resources');
var streamer = require('daisy-streamify');

var book = resource('path/to/book/folder');
var bookstream = streamer(book, 'path/to/destination');

bookstream.on('error', function(err) {
  console.error('Error reported', err);
});
```

## Dependencies

 - mp3cat (`http://tomclegg.net/mp3cat`) in your `PATH`
