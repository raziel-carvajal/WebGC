(function(exports){
  function Logger(host, port){
    if(typeof host === 'string' && typeof port === 'number'){
      this.url = 'http://' + host + ':' + port + '/log';
    }
  }
  Logger.prototype.warn = function(msg){
    var d = new Date();
    var dStr = d.toTimeString().split(' ')[0];
    var log = 'msg=[' + dStr + ' - WARN ] ' + msg;
    this.sendToServer(log);
  };
  Logger.prototype.info = function(msg){
    var d = new Date();
    var dStr = d.toTimeString().split(' ')[0];
    var log = 'msg=[' + dStr + ' - INFO ] ' + msg;
    this.sendToServer(log);
  };
  Logger.prototype.error = function(msg){
    var d = new Date();
    var dStr = d.toTimeString().split(' ')[0];
    var log = 'msg=[' + dStr + ' - ERROR ] ' + msg;
    this.sendToServer(log);
  };
  Logger.prototype.sendToServer = function(msg){
    this.xhr = new XMLHttpRequest();
    this.xhr.open('POST', this.url, true);
    this.xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    //this.xhr.setRequestHeader("Content-type", "application/*");
    //this.xhr.setRequestHeader("Content-length", msg.length);
    //this.xhr.setRequestHeader("Connection", "close");
    this.xhr.onerror = function(e){
      console.log('Logger failed to post');
    };
    var self = this;
    this.xhr.onreadystatechange = function(){
      if(self.xhr.readyState !== 4)
        return;
      if(self.xhr.status !== 200){
        self.xhr.onerror();
        return;
      }
    };
    //this.xhr.send(msg);
    this.xhr.send('msg=nola');

  };
  exports.Logger = Logger;
})(this);

//var log = new Logger('131.254.213.42', 9990);
//log.info('hola');
