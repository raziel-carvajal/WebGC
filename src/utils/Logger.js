/**
*@module src/utils
*@description 
*@author Raziel Carvajal Gomez <raziel.carvajal-gomez@inria.fr>*/
(function(exports){
  /**
  *@class Logger
  *@description This method sets the type of logging server, the local console of the
  *browser or a server that collects every log
  *@param {Object} opts - options of the logging service*/
  function Logger(opts, peerId, objName){
    if( typeof log4javascript !== 'undefined' ){
      this.localConsole = false;
      this.layoutPattern = "[%-5p] %d{yyyy.MM.dd HH:mm:ss} [%-10f{1}] [%-10f{2}] :: %m";
      this.logger = log4javascript.getLogger();
      if( opts && typeof opts.host === 'string' && typeof opts.port === 'number' ){
        this.url = 'http://' + opts.host + ':' + opts.port + '/log';
      }
    }else{
      this.localConsole = true;
      this.header = '';
    }
    this.setOutput(peerId, objName);
  }
  /**
  * @description Level INFO of one log, if there is no server the header INFO precedes
  * the message of the log.
  * @method info*/
  Logger.prototype.info = function(msg){
    if( this.localConsole )
      console.log(this.header + msg);
    else
      this.logger.info(msg);
  };
  /**
  * @description Level WARN of one log, if there is no server the header WARN precedes
  * the message of the log.
  * @method warn*/
  Logger.prototype.warn = function(msg){
    if( this.localConsole )
      console.log(this.header + msg);
    else
      this.logger.warn(msg);
  };
  /**
  * @description Level ERROR of one log, if there is no server the header ERROR precedes
  * the message of the log.
  * @method error*/
  Logger.prototype.error = function(msg){
    if( this.localConsole )
      console.log(this.header + msg);
    else
      this.logger.error(msg);
  };
  /**
  * @description Level FATAL of one log, if there is no server the header FATAL precedes
  * the message of the log.
  * @method fatal*/
  Logger.prototype.fatal = function(msg){
    if( this.localConsole )
      console.log(this.header + msg);
    else
      this.logger.fatal(msg);
  };
  /**
  * @description Sets the properties of the log4javascript framework
  * @method setOutput
  * @param {String} id - identifier of the layout
  * @param {String} className - class name of the layout*/
  Logger.prototype.setOutput = function(id, class_name){
    if( !this.localConsole ){
      var appender;
      if( this.url )
        appender = new log4javascript.AjaxAppender(this.url);
      else
        appender =  new log4javascript.BrowserConsoleAppender();
      var layout = new log4javascript.PatternLayout(this.layoutPattern);
      layout.setCustomField('id', id);
      layout.setCustomField('class', class_name);
      appender.setLayout(layout);
      this.logger.removeAllAppenders();
      this.logger.addAppender(appender);
    }else{
      this.header = '[' + id + '] [' + class_name + '] :: ';
    }
  };
  /**
  * @description Turn a set of arguments in to a string separated by spaces
  * @method getLogStr
  * @param {Array} args - array of arguments
  * @returns {String} - String with each argument separated by spaces*/
  Logger.prototype.getLogStr = function(args){
    return Array.prototype.slice.call(args).join(' ');
  };
  exports.Logger = Logger;
})(this);
