(function(exports){
  function Logger(opts){
    if(typeof opts.host === 'string' && typeof opts.port === 'number'){
      this.host = opts.host;
      this.port = opts.port;
      this.url = 'http://' + opts.host + ':' + opts.port + '/log';
      this.header = opts.header;
    }
  }
  
  Logger.prototype.send = function(msg){
    var xhr = new XMLHttpRequest();
    xhr.open('POST', this.url, true);
    xhr.setRequestHeader("Content-type", "text/plain");
    xhr.onreadystatechange = function(){
      if(xhr.readyState !== 4)
        return;
      if(xhr.status !== 200){
        xhr.onerror();
        return;
      }
    };
    xhr.onerror = function(e){
      console.log('Logger failed to post');
    };
    xhr.send(msg);
  };
  
  Logger.prototype.warn = function(msg){
    var d = new Date();
    var dStr = d.toTimeString().split(' ')[0];
    var log = '[' + dStr + ' - WARN ] ' + this.header + ': ' + msg;
    this.send(log);
  };
  Logger.prototype.info = function(msg){
    var d = new Date();
    var dStr = d.toTimeString().split(' ')[0];
    var log = '[' + dStr + ' - INFO ] ' + this.header + ': ' + msg;
    this.send(log);
  };
  Logger.prototype.error = function(msg){
    var d = new Date();
    var dStr = d.toTimeString().split(' ')[0];
    var log = '[' + dStr + ' - ERROR] ' + this.header + ': ' + msg;
    this.send(log);
  };
  
  exports.Logger = Logger;
})(this);
