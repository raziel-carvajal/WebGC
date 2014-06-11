(function(exports){
  /**
  * @module lib/utils 
  * @const gossipUtil
  * @desc This object contains a set of functions that are used by the different implementations of the 
  * gossip protocols.
  * @author Raziel Carvajal Gomez <raziel.carvajal-gomez@inria.fr>*/
  // TODO to finish with the documentation of this file...
  function Logger(opts){
    if( opts )
      this.url = 'http://' + opts.host + ':' + opts.port + '/log';
    this.localConsole = false;
    this.layoutPattern = "[%-5p] %d{yyyy.MM.dd HH:mm:ss} [%-10f{1}] [%-10f{2}] :: %m";
    if( log4javascript )
      this.logger = log4javascript.getLogger();
    else
      this.localConsole = true;
  }
  
  Logger.prototype.info = function(){
    var msg = this.getLogStr(arguments);
    if( this.localConsole )
      console.log(msg);
    else
      this.logger.info(msg);
  };
  
  Logger.prototype.warn = function(){
    var msg = this.getLogStr(arguments);
    if( this.localConsole )
      console.log(msg);
    else
      this.logger.warn(msg);
  };
  
  Logger.prototype.error = function(){
    var msg = this.getLogStr(arguments);
    if( this.localConsole )
      console.log(msg);
    else
      this.logger.error(msg);
  };
  
  Logger.prototype.fatal = function(){
    var msg = this.getLogStr(arguments);
    if( this.localConsole )
      console.log(msg);
    else
      this.logger.fatal(msg);
  };
  
  Logger.prototype.setOutput = function(id, className){
    var appender, layout;
    if( this.url )
      appender = new log4javascript.AjaxAppender(this.url);
    else
      appender =  new log4javascript.BrowserConsoleAppender();
    layout = new log4javascript.PatternLayout(this.layoutPattern);
    layout.setCustomField('id', id);
    layout.setCustomField('class', className);
    appender.setLayout(layout);
    this.logger.removeAllAppenders();
    this.logger.addAppender(appender);
  };
  
  Logger.prototype.getLogStr = function(args){
    return Array.prototype.slice.call(args).join(' ');
  };
  
  exports.Logger = Logger;
  
  /**
   * 
   */
  function GossipUtil(opts){
    this.log = new Logger(opts.loggingServer); 
  }
  
  /**
   * @method newItem
   * @desc Returns an object its age (timestamp) and its data.
   * @param {Integer} age
   * @param {Object} data*/
  GossipUtil.prototype.newItem = function(age, data){
    return { age: age, data: data };
  };
  
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
  
  GossipUtil.prototype.setData = function(dic, key, d){
    if( key in dic )
      dic[key].data = d;
  };
  
  GossipUtil.prototype.extendProperties = function(dst, src){
    var keys = Object.keys(src);
    for( var i = 0; i < keys.length; i++ ){
      if( !dst.hasOwnProperty(keys[i]) )
        dst[ keys[i] ] = src[ keys[i] ];
    }
  };
  
  exports.GossipUtil = GossipUtil;
  
}) (this);
