/**
* @module lib/utils 
* @const gossipUtil
* @description This object contains a set of functions that are used by the different
* implementations of the 
* gossip protocols.
* @author Raziel Carvajal Gomez <raziel.carvajal-gomez@inria.fr>*/
(function(exports){
  /**
  * @class Logger
  * @description This method sets the type of logging server, the local console of the
  * browser or a server that collects every log
  * @param {Object} opts - options of the logging service*/
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
  /**
  * @class GossipUtil
  * @description This class implements miscelaneous functions needed by a gossip-based
  * algorithm
  * @param {Object} opts - options of the logger */
  function GossipUtil(opts){
    this.log = new Logger(opts.loggingServer, opts.peerId, opts.objName);
  }
  /**
  * @method newItem
  * @description Returns an object its age (timestamp) and its data.
  * @param {Integer} age - timestamp or age of the item
  * @param {Object} data - data of the item
  * @return {Object}*/
  GossipUtil.prototype.newItem = function(age, data){
    return { age: age, data: data };
  };
  /**
  *@method getRandomSubDict
  *@description Get a random set of n items from one object
  *@param {Integer} n - size of the new object
  *@param {Object} src - original object
  *@returns {Object}*/
  GossipUtil.prototype.getRandomSubDict = function(n, src){
    if( n <= 0 || Object.keys(src).length === 0 )
      return {};
    if( n >= Object.keys(src).length )
      return src;
    else {
      var tmpDict = {}, result = {}, key, tmpAr, i;
      for( key in src )
        tmpDict[key] = 1;
      i = 0;
      do{
        tmpAr = Object.keys(tmpDict);
        key = tmpAr[ Math.floor(Math.random() * tmpAr.length) ];
        result[key] = src[key];
        delete tmpDict[key];
        i += 1;
      }while( i != n );
      return result;
    }
  };
  /**
  * @method getOldestKey
  * @description Get the key of the element with the oldes age in dictio
  * @param {Object} dictio - object
  * @returns {String} key of the item with the oldest age in dictio*/
  GossipUtil.prototype.getOldestKey = function(dictio){
    var keys = Object.keys(dictio);
    if( keys.length === 0 ){
      this.log.error('Empty dictionary');
      return null;
    }
    var max = dictio[ keys[0] ].age;
    var maxIndx = keys[0];
    var i = 1;
    while( i < keys.length ){
      if( dictio[ keys[i] ].age > max ){
        max = dictio[ keys[i] ].age;
        maxIndx = keys[i];
      }
      i += 1;
    }
    return maxIndx;
  };
  /**
  * @method getRandomKey
  * @description Get a random key of the object dict
  * @param {Object} dict - source object
  * @returns {String} key - random key of the obj */
  GossipUtil.prototype.getRandomKey = function(dict){
    var key = null; var keys = Object.keys(dict);
    var dicSize = keys.length;
    if( dicSize === 0 )
      this.log.error('No way to return a key from an empty dictionary');
    else{
      var rNum;
      if( dicSize === 1 )
        rNum = 0;
      else
        rNum = Math.floor(Math.random() * dicSize);
      key = keys[rNum];
    }
    return key;
  };
  /**
  * @method removeRandomly
  * @description Remov n elements of the object dic
  * @param {Integer} n - elements to remove
  * @param {Object} dic - source object  */
  GossipUtil.prototype.removeRandomly = function(n, dic){
    if( n === 0 )
      return;
    else{
      var tmpDic = {}, tmpAr, key;
      for( key in dic )
        tmpDic[key] = 1;
      for( var i = 0; i < n; i += 1 ){
        tmpAr = Object.keys(tmpDic);
        key = tmpAr[ Math.floor(Math.random() * tmpAr.length) ];
        delete tmpDic[key]; delete dic[key];
      }
    }
  };
  /**
  * @method mergeViews
  * @description Merge two objects, the result object doesn't contain repetitions
  * @param {Object} v1 - first object to merge
  * @param {Object} v2 - second object to merge
  * @returns {Object} the merge of v1 and v2*/
  GossipUtil.prototype.mergeViews = function(v1, v2){
    var keysV1 = Object.keys(v1);
    var keysV2 = Object.keys(v2);
    var i, result = {};
    for( i = 0; i < keysV1.length; i ++ )
      result[ keysV1[i] ] = v1[ keysV1[i] ];
    for( i = 0; i < keysV2.length; i++ ){
      if( typeof( result[ keysV2[i] ] ) !== 'undefined' ){
        if( v2[ keysV2[i] ].age < result[ keysV2[i] ].age )
          result[ keysV2[i] ] = v2[ keysV2[i] ];
      }else
        result[ keysV2[i] ] = v2[ keysV2[i] ];
    }
    return result;
  };
  /**
  * @method setData
  * @description If key exists in dic, the value of key is set to d
  * @param {Object} dic - object
  * @param {String} key - reference of the value to update
  * @param {Object} d - new value of key*/
  GossipUtil.prototype.setData = function(dic, key, d){
    if( key in dic )
      dic[key].data = d;
  };
  /**
  * @method extendProperties
  * @description Extends the elements in an object without repetitions. If an item in dst
  * is in src too, the value of that item isn't updated
  * @param {Object} dst - object to extend
  * @param {Object} srs - elements to add in dst*/
  GossipUtil.prototype.extendProperties = function(dst, src){
    var keys = Object.keys(src);
    for( var i = 0; i < keys.length; i++ ){
      if( !dst.hasOwnProperty(keys[i]) )
        dst[ keys[i] ] = src[ keys[i] ];
    }
  };
  
  exports.GossipUtil = GossipUtil;
  
}) (this);
