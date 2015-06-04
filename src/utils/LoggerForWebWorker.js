/**
*@module src/utils*/
(function(exports){
  /**
  * @class Logger
  * @description Logs warnings, errors or information messages from the objects in WebGC
  * @param opts Object with the next properties:
  *
  * i) header, constructor of the object which owns the logger
  * ii) activated, boolean value which says weather or not the logs will be post in an external server
  * iii) host, address of the external server
  * iv) port, port number of the external server
  * @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com>*/
  function Logger(opts){
    this.header = opts.header;
    this.local = true;
    this.isActivated = opts.activated;
    this.feedbackPeriod = opts.feedbackPeriod;
    if(typeof opts.host === 'string' && typeof opts.port === 'number'){
      this.host = opts.host;
      this.port = opts.port;
      this.url = 'http://' + opts.host + ':' + opts.port + '/log';
      this.local = false;
    }
  }
  
  /**
  * @memberof Logger@method send
  * @description Sends one log message to an external server
  * @param msg String of the log*/
  Logger.prototype.send = function(msg){
    if(this.isActivated){
      var xhr = new XMLHttpRequest();
      xhr.open('POST', this.url, true);
      xhr.setRequestHeader("Content-type", "text/plain");
      var self = this;
      xhr.onreadystatechange = function(){
        if(xhr.readyState !== 4){ return; }
        if(xhr.status !== 200){
          xhr.onerror();
          return;
        }
      };
      xhr.onerror = function(e){
        console.error('Logger failed to post, subsequent logs will be shown in local');
        self.local = true;
        //TODO schedule a timeout for checking if server is up could be nice
      };
      xhr.send(msg);
    }
  };
  
  /**
  * @memberof Logger@method warn
  * @description Logs one message of warning
  * @param msg Message to log*/
  Logger.prototype.warn = function(msg){
    var d = new Date();
    var log = d.toISOString().split('T')[1].split('Z')[0] + ' - WARN ] ' + this.header + ': ' + msg;
    if(this.local){ console.warn(log); }
    else{ this.send(log); }
  };
  
  /**
  * @memberof Logger@method info
  * @description Logs one message of information
  * @param msg Message to log*/
  Logger.prototype.info = function(msg){
    var d = new Date();
    var log = d.toISOString().split('T')[1].split('Z')[0] + ' - INFO ] ' + this.header + ': ' + msg;
    if(this.local){ console.info(log); }
    else{ this.send(log); }
  };
  
  /**
  * @memberof Logger@method error
  * @description Logs one message of error
  * @param msg Message to log*/
  Logger.prototype.error = function(msg){
    var d = new Date();
    var log = d.toISOString().split('T')[1].split('Z')[0] + ' - ERROR] ' + this.header + ': ' + msg;
    if(this.local){ console.error(log); }
    else{ this.send(log); }
  };
  
  /**
  * @memberof Logger@method deactivate
  * @description Cancel the post of logs at the external server*/
  Logger.prototype.deactivate = function(){ this.isActivated = false; };
  
  /**
  * @memberof Logger@method activate
  * @description Allows the post of logs at the external server*/
  Logger.prototype.activate = function(){ this.isActivated = true; };
  
  /**
  * @memberof Logger@method setLocal
  * @description Posts logs in the console of the web browser
  * @param local Boolean to indicate weather or not logs are shown in the console of web browsers*/
  Logger.prototype.setLocal = function(local){ this.local = local; };
  
  exports.Logger = Logger;
})(this);
